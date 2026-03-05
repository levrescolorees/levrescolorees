import React from 'react';
import { APP_VERSION } from '@/lib/version';

const DOM_ERROR_PATTERNS = ['insertBefore', 'removeChild', 'appendChild', 'not a child of this node'];

function isDomExtensionError(error: Error): boolean {
  const msg = error?.message?.toLowerCase() ?? '';
  return DOM_ERROR_PATTERNS.some(p => msg.includes(p.toLowerCase()));
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    if (isDomExtensionError(error)) {
      console.warn('[ErrorBoundary] DOM error from browser extension ignored:', error.message);
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isDomExtensionError(error)) {
      console.warn('[ErrorBoundary] Suppressed DOM extension error');
      return;
    }
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'sans-serif', padding: '24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Algo deu errado</h1>
          <p style={{ color: '#666', maxWidth: '400px' }}>Ocorreu um erro inesperado. Tente recarregar a página.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Recarregar página
          </button>
          <details style={{ marginTop: '16px', maxWidth: '500px', textAlign: 'left', fontSize: '0.75rem', color: '#888' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Detalhes técnicos</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f5f5f5', padding: '12px', borderRadius: '6px', maxHeight: '200px', overflow: 'auto' }}>
              {error?.message}{'\n\n'}{error?.stack}
            </pre>
          </details>
          <span style={{ fontSize: '0.625rem', color: '#bbb' }}>v{APP_VERSION}</span>
        </div>
      );
    }
    return this.props.children;
  }
}
