import { Globe, GlobeLock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SidebarStatusProps {
  status: string;
  publishedAt: string | null;
  onPublish: () => void;
  onUnpublish: () => void;
}

const SidebarStatus = ({ status, publishedAt, onPublish, onUnpublish }: SidebarStatusProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-body font-semibold">Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={status === 'published' ? 'default' : 'secondary'}
            className={status === 'published'
              ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'
              : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100'
            }
          >
            {status === 'published' ? 'Publicado' : 'Rascunho'}
          </Badge>
        </div>

        {status === 'published' && publishedAt && (
          <div className="flex items-center gap-1.5 text-xs font-body text-muted-foreground">
            <Calendar className="w-3 h-3" />
            Publicado em {new Date(publishedAt).toLocaleDateString('pt-BR')}
          </div>
        )}

        {status === 'draft' ? (
          <Button size="sm" onClick={onPublish} className="w-full font-body text-xs">
            <Globe className="w-3.5 h-3.5 mr-1.5" /> Publicar
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full font-body text-xs">
                <GlobeLock className="w-3.5 h-3.5 mr-1.5" /> Despublicar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Despublicar produto?</AlertDialogTitle>
                <AlertDialogDescription>O produto será removido da loja.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onUnpublish}>Despublicar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
};

export default SidebarStatus;
