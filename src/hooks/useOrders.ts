import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

export interface DBCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cnpj: string | null;
  company_name: string | null;
  is_reseller: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface DBOrder {
  id: string;
  order_number: number;
  customer_id: string | null;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  payment_method: string;
  tracking_code: string | null;
  notes: string | null;
  shipping_address: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  customer?: DBCustomer | null;
  items?: DBOrderItem[];
}

export interface DBStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

// ---- Admin Queries ----

export function useAdminOrders(statusFilter?: OrderStatus) {
  return useQuery({
    queryKey: ['admin', 'orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*, customers(*)')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data as any[]).map(o => ({
        ...o,
        customer: o.customers || null,
        customers: undefined,
      })) as DBOrder[];
    },
  });
}

export function useOrderDetail(orderId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [{ data: order, error: oErr }, { data: items, error: iErr }, { data: history, error: hErr }] = await Promise.all([
        supabase.from('orders').select('*, customers(*)').eq('id', orderId!).single(),
        supabase.from('order_items').select('*').eq('order_id', orderId!),
        supabase.from('order_status_history').select('*').eq('order_id', orderId!).order('created_at', { ascending: true }),
      ]);
      if (oErr) throw oErr;
      if (iErr) throw iErr;

      const o = order as any;
      return {
        ...o,
        customer: o.customers || null,
        customers: undefined,
        items: (items as DBOrderItem[]) || [],
        statusHistory: (history as DBStatusHistory[]) || [],
      } as DBOrder & { statusHistory: DBStatusHistory[] };
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, fromStatus, toStatus, note }: {
      orderId: string; fromStatus: OrderStatus; toStatus: OrderStatus; note?: string;
    }) => {
      const { error: uErr } = await supabase
        .from('orders')
        .update({ status: toStatus })
        .eq('id', orderId);
      if (uErr) throw uErr;

      const { error: hErr } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          from_status: fromStatus,
          to_status: toStatus,
          changed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          note: note || null,
        });
      if (hErr) throw hErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'order'] });
    },
  });
}

export function useUpdateTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, trackingCode }: { orderId: string; trackingCode: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_code: trackingCode })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'order'] });
    },
  });
}

// ---- Customers ----

export function useAdminCustomers() {
  return useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DBCustomer[];
    },
  });
}

// ---- Checkout: create order ----

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (payload: {
      customer: Omit<DBCustomer, 'id' | 'created_at' | 'updated_at'>;
      items: Array<{
        product_id: string | null;
        variant_id: string | null;
        product_name: string;
        variant_name: string | null;
        quantity: number;
        unit_price: number;
      }>;
      subtotal: number;
      shipping: number;
      discount: number;
      total: number;
      payment_method: string;
      shipping_address: Record<string, string>;
    }) => {
      // Find or create customer by email
      let customerId: string;
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('email', payload.customer.email)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
        // Update customer info
        await supabase.from('customers').update({
          name: payload.customer.name,
          phone: payload.customer.phone,
          cpf: payload.customer.cpf,
          cnpj: payload.customer.cnpj,
          company_name: payload.customer.company_name,
          is_reseller: payload.customer.is_reseller,
        }).eq('id', customerId);
      } else {
        const { data: newCustomer, error: cErr } = await supabase
          .from('customers')
          .insert(payload.customer)
          .select()
          .single();
        if (cErr) throw cErr;
        customerId = newCustomer.id;
      }

      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          subtotal: payload.subtotal,
          shipping: payload.shipping,
          discount: payload.discount,
          total: payload.total,
          payment_method: payload.payment_method,
          shipping_address: payload.shipping_address as any,
          status: 'pendente',
        })
        .select()
        .single();
      if (oErr) throw oErr;

      // Create order items
      const orderItems = payload.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
      }));

      const { error: iErr } = await supabase
        .from('order_items')
        .insert(orderItems);
      if (iErr) throw iErr;

      // Initial status history
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        to_status: 'pendente' as OrderStatus,
        note: 'Pedido criado',
      });

      return order;
    },
  });
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  preparando: 'bg-orange-100 text-orange-800',
  enviado: 'bg-purple-100 text-purple-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};
