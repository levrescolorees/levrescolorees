import { formatCurrency } from '@/data/products';

export interface WhatsAppOrderItem {
  name: string;
  variant?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface WhatsAppOrderData {
  storeName?: string;
  greeting?: string;
  orderNumber?: number | string | null;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    cpf?: string;
    cnpj?: string | null;
    companyName?: string | null;
    isWholesale?: boolean;
  };
  address?: {
    zip?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  shippingMethod?: string | null;
  shippingDeliveryDays?: number | null;
  items: WhatsAppOrderItem[];
  subtotal: number;
  couponCode?: string | null;
  couponDiscount?: number;
  shipping: number;
  total: number;
  notes?: string | null;
}

function maskPhoneBR(v: string) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v || '';
}

function maskCpf(v: string) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length !== 11) return v || '';
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function maskCnpj(v: string) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length !== 14) return v || '';
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function maskZip(v: string) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length !== 8) return v || '';
  return d.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/** Builds a well-organized plain-text order message for WhatsApp. */
export function buildWhatsAppOrderMessage(data: WhatsAppOrderData): string {
  const lines: string[] = [];
  const store = data.storeName || 'Lèvres Colorées';

  if (data.greeting?.trim()) {
    lines.push(data.greeting.trim(), '');
  }

  lines.push(`*NOVO PEDIDO - ${store}*`);
  if (data.orderNumber) lines.push(`Pedido: *#${data.orderNumber}*`);
  lines.push('');

  // Customer
  lines.push('*CLIENTE*');
  lines.push(`Nome: ${data.customer.name}`);
  if (data.customer.phone) lines.push(`Telefone: ${maskPhoneBR(data.customer.phone)}`);
  if (data.customer.email) lines.push(`E-mail: ${data.customer.email}`);
  if (data.customer.cpf) lines.push(`CPF: ${maskCpf(data.customer.cpf)}`);
  if (data.customer.isWholesale) {
    if (data.customer.companyName) lines.push(`Empresa: ${data.customer.companyName}`);
    if (data.customer.cnpj) lines.push(`CNPJ: ${maskCnpj(data.customer.cnpj)}`);
    lines.push('Tipo: Revendedora (atacado)');
  }
  lines.push('');

  // Address
  const a = data.address;
  if (a && (a.street || a.zip)) {
    lines.push('*ENTREGA*');
    const line1 = [a.street, a.number].filter(Boolean).join(', ');
    if (line1) lines.push(a.complement ? `${line1} - ${a.complement}` : line1);
    const line2 = [a.neighborhood, [a.city, a.state].filter(Boolean).join('/')].filter(Boolean).join(' - ');
    if (line2) lines.push(line2);
    if (a.zip) lines.push(`CEP: ${maskZip(a.zip)}`);
    if (data.shippingMethod) {
      const prazo = data.shippingDeliveryDays ? ` (${data.shippingDeliveryDays} dias úteis)` : '';
      lines.push(`Frete: ${data.shippingMethod} - ${formatCurrency(data.shipping)}${prazo}`);
    }
    lines.push('');
  }

  // Items
  lines.push('*ITENS*');
  data.items.forEach((item, index) => {
    lines.push(`${index + 1}) ${item.name}`);
    if (item.variant) lines.push(`   Cor/Variação: ${item.variant}`);
    lines.push(
      `   Qtd: ${item.quantity} x ${formatCurrency(item.unitPrice)} = *${formatCurrency(item.unitPrice * item.quantity)}*`
    );
  });
  lines.push('');

  // Summary
  const totalUnits = data.items.reduce((sum, i) => sum + i.quantity, 0);
  lines.push('*RESUMO*');
  lines.push(`Total de itens: ${totalUnits}`);
  lines.push(`Subtotal: ${formatCurrency(data.subtotal)}`);
  if (data.couponDiscount && data.couponDiscount > 0) {
    lines.push(`Desconto${data.couponCode ? ` (${data.couponCode})` : ''}: -${formatCurrency(data.couponDiscount)}`);
  }
  lines.push(`Frete: ${data.shipping === 0 ? 'Grátis' : formatCurrency(data.shipping)}`);
  lines.push(`*TOTAL: ${formatCurrency(data.total)}*`);

  if (data.notes?.trim()) {
    lines.push('', `Observações: ${data.notes.trim()}`);
  }

  const now = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  lines.push('', `Pedido gerado pelo site em ${now}`);

  return lines.join('\n');
}

/** Normalizes a Brazilian WhatsApp number to the wa.me format (digits only). */
export function normalizeWhatsAppNumber(raw: string | undefined | null): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(number)}?text=${encodeURIComponent(message)}`;
}
