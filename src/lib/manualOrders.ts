import { supabase } from '@/integrations/supabase/client';

export type ManualOrderStatus = 'recebido' | 'em_separacao' | 'despachado';

export const STATUS_LABEL: Record<ManualOrderStatus, string> = {
  recebido: 'Recebido',
  em_separacao: 'Em Separação',
  despachado: 'Despachado',
};

export const NEXT_STATUS: Record<ManualOrderStatus, ManualOrderStatus | null> = {
  recebido: 'em_separacao',
  em_separacao: 'despachado',
  despachado: null,
};

export const ALLOWED_EXT = ['pdf', 'doc', 'docx'];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function validateAttachment(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXT.includes(ext)) return 'Formato inválido. Use PDF, DOC ou DOCX.';
  if (file.size > MAX_FILE_BYTES) return 'Arquivo maior que 10MB.';
  return null;
}

export async function openAttachment(path: string) {
  const win = window.open('', '_blank');
  const { data, error } = await supabase.storage.from('purchase-orders').createSignedUrl(path, 300);
  if (error || !data) { win?.close(); throw error ?? new Error('Falha ao abrir anexo'); }
  if (win) win.location.href = data.signedUrl; else window.location.href = data.signedUrl;
}

export const brl = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function attachmentPath(tenantId: string, ext: string, now = new Date(), id: string = crypto.randomUUID()) {
  return `${tenantId}/${now.toISOString().slice(0, 7)}/${id}.${ext.toLowerCase()}`;
}

export async function fetchMyTenantId(): Promise<string | null> {
  const { data } = await (supabase as any).rpc('get_current_tenant_id');
  return (data as string) ?? null;
}
