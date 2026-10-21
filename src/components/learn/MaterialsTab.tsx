/**
 * MaterialsTab — view, add, and delete source files for a study set.
 *
 * After adding or deleting, shows a banner noting that the breakdown /
 * flashcards / practice may be outdated and offering to regenerate.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MaterialInput } from "./MaterialInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Trash2, Plus, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import type { StudyMaterialRow, ExtractedMaterial } from "@/types/learn";

interface MaterialsTabProps {
  setId: string;
  userId: string;
  materials: StudyMaterialRow[];
  onMaterialsChange: () => void;
  onRegenerateAll: () => void;
}

const kindColor: Record<string, string> = {
  pdf:   "bg-red-500/15 text-red-400 border-red-500/30",
  docx:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  pptx:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  text:  "bg-muted text-muted-foreground",
  paste: "bg-primary/15 text-primary border-primary/30",
};

function fmtChars(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M chars`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k chars`;
  return `${n} chars`;
}

export function MaterialsTab({ setId, userId, materials, onMaterialsChange, onRegenerateAll }: MaterialsTabProps) {
  const [adding, setAdding]     = useState(false);
  const [newFiles, setNewFiles] = useState<ExtractedMaterial[]>([]);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [changed, setChanged]   = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("study_materials").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      setChanged(true);
      onMaterialsChange();
    }
    setDeleting(null);
  };

  const handleSaveNew = async () => {
    if (!newFiles.length) return;
    setSaving(true);
    try {
      const rows = newFiles.map((m) => ({
        set_id: setId,
        user_id: userId,
        file_name: m.file_name,
        kind: m.kind,
        content: m.content,
        char_count: m.char_count,
      }));
      const { error } = await supabase.from("study_materials").insert(rows);
      if (error) { toast.error(error.message); return; }
      setNewFiles([]);
      setAdding(false);
      setChanged(true);
      onMaterialsChange();
      toast.success(`Added ${rows.length} source${rows.length !== 1 ? "s" : ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Stale warning */}
      {changed && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-orange-300">
              Sources have changed. Your breakdown, flashcards, and practice questions may be outdated.
            </p>
            <Button size="sm" variant="outline" className="gap-2 border-orange-500/40 text-orange-400 hover:bg-orange-500/10" onClick={() => { setChanged(false); onRegenerateAll(); }}>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate all
            </Button>
          </div>
        </div>
      )}

      {/* Existing materials */}
      <div className="space-y-2">
        {materials.map((mat) => (
          <Card key={mat.id} className="flex items-center gap-3 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm font-medium text-foreground">{mat.file_name}</span>
            <Badge variant="outline" className={`text-xs shrink-0 ${kindColor[mat.kind] ?? ""}`}>
              {mat.kind.toUpperCase()}
            </Badge>
            <span className="shrink-0 text-xs text-muted-foreground">{fmtChars(mat.char_count)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(mat.id)}
              disabled={!!deleting}
            >
              {deleting === mat.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </Card>
        ))}
        {materials.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No sources yet.</p>
        )}
      </div>

      {/* Add more */}
      {!adding ? (
        <Button variant="outline" onClick={() => setAdding(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add more sources
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground">Add sources</p>
          <MaterialInput value={newFiles} onChange={setNewFiles} disabled={saving} />
          <div className="flex gap-2">
            <Button onClick={handleSaveNew} disabled={!newFiles.length || saving} className="gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save sources
            </Button>
            <Button variant="ghost" onClick={() => { setAdding(false); setNewFiles([]); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
