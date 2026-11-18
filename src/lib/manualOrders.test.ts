import { describe, it, expect } from 'vitest';
import { NEXT_STATUS, validateAttachment } from './manualOrders';

const f = (name: string, size = 100) => ({ name, size }) as File;

describe('pedidos manuais', () => {
  it('status segue Recebido → Em Separação → Despachado', () => {
    expect(NEXT_STATUS.recebido).toBe('em_separacao');
    expect(NEXT_STATUS.em_separacao).toBe('despachado');
    expect(NEXT_STATUS.despachado).toBeNull();
  });
  it('aceita PDF, DOC e DOCX', () => {
    expect(validateAttachment(f('a.pdf'))).toBeNull();
    expect(validateAttachment(f('a.DOC'))).toBeNull();
    expect(validateAttachment(f('a.docx'))).toBeNull();
  });
  it('rejeita outros formatos e acima de 10MB', () => {
    expect(validateAttachment(f('a.png'))).not.toBeNull();
    expect(validateAttachment(f('a.pdf', 11 * 1024 * 1024))).not.toBeNull();
  });
});
