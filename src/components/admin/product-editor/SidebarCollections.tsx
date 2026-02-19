import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCollections } from '@/hooks/useProducts';

interface SidebarCollectionsProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const SidebarCollections = ({ selectedIds, onChange }: SidebarCollectionsProps) => {
  const { data: collections } = useCollections();
  const [search, setSearch] = useState('');

  const filtered = (collections ?? []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-body font-semibold">Coleções</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar coleções..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs font-body"
          />
        </div>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {filtered.length === 0 && (
            <p className="text-xs font-body text-muted-foreground">Nenhuma coleção encontrada.</p>
          )}
          {filtered.map(c => (
            <div key={c.id} className="flex items-center gap-2">
              <Checkbox
                id={`col-${c.id}`}
                checked={selectedIds.includes(c.id)}
                onCheckedChange={() => toggle(c.id)}
              />
              <Label htmlFor={`col-${c.id}`} className="font-body text-xs cursor-pointer">{c.name}</Label>
            </div>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <p className="text-[10px] font-body text-muted-foreground">{selectedIds.length} coleção(ões) selecionada(s)</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SidebarCollections;
