import { useState } from 'react';
import ThemeEditor from '@/components/admin/ThemeEditor';
import ThemePreviewFrame from '@/components/admin/ThemePreviewFrame';
import type { ThemeSettings } from '@/theme/defaultTheme';

const AdminThemeEditor = () => {
  const [draft, setDraft] = useState<ThemeSettings | null>(null);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Editor Panel */}
      <div className="w-[45%] min-w-[380px] overflow-y-auto border-r border-border p-6">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Editor de Tema</h1>
        <ThemeEditor onDraftChange={setDraft} />
      </div>

      {/* Preview Panel */}
      <div className="flex-1">
        <ThemePreviewFrame draft={draft} />
      </div>
    </div>
  );
};

export default AdminThemeEditor;
