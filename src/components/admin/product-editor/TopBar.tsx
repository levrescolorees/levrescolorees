import { ArrowLeft, Save, Loader2, Eye, Copy, Globe, GlobeLock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AutosaveStatus } from '@/hooks/useAutosave';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TopBarProps {
  productName: string;
  isNew: boolean;
  status: string;
  autosaveStatus: AutosaveStatus;
  saving: boolean;
  onSave: () => void;
  onSaveAndContinue: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
}

const statusIndicator = (s: AutosaveStatus) => {
  switch (s) {
    case 'saving': return <span className="flex items-center gap-1.5 text-xs font-body text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Salvando...</span>;
    case 'saved': return <span className="text-xs font-body text-green-600">✓ Salvo</span>;
    case 'unsaved': return <span className="text-xs font-body text-amber-600">● Alterações não salvas</span>;
    default: return null;
  }
};

const TopBar = ({
  productName, isNew, status, autosaveStatus, saving,
  onSave, onSaveAndContinue, onPublish, onUnpublish, onPreview, onDuplicate,
}: TopBarProps) => {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-6 px-6 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: breadcrumb + status */}
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/admin/produtos"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <nav className="flex items-center gap-1.5 text-sm font-body text-muted-foreground min-w-0">
            <Link to="/admin/produtos" className="hover:text-foreground transition-colors shrink-0">Produtos</Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate">{productName || 'Novo Produto'}</span>
          </nav>
          <Badge
            variant={status === 'published' ? 'default' : 'secondary'}
            className={status === 'published'
              ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'
              : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100'
            }
          >
            {status === 'published' ? 'Publicado' : 'Rascunho'}
          </Badge>
          {statusIndicator(autosaveStatus)}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isNew && (
            <Button variant="ghost" size="sm" onClick={onPreview} className="font-body text-xs">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
            </Button>
          )}
          {!isNew && (
            <Button variant="ghost" size="sm" onClick={onDuplicate} className="font-body text-xs">
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Duplicar
            </Button>
          )}

          {status === 'draft' && (
            <Button variant="outline" size="sm" onClick={onPublish} className="font-body text-xs">
              <Globe className="w-3.5 h-3.5 mr-1.5" /> Publicar
            </Button>
          )}
          {status === 'published' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="font-body text-xs">
                  <GlobeLock className="w-3.5 h-3.5 mr-1.5" /> Despublicar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Despublicar produto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O produto será removido da loja e ficará como rascunho.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onUnpublish}>Despublicar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button variant="outline" size="sm" onClick={onSaveAndContinue} disabled={saving} className="font-body text-xs">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Salvar e continuar
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving} className="font-body text-xs">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
