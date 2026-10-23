/**
 * Learn (/dashboard/learn)
 *
 * Lists the user's study sets as cards and provides a "New study set" dialog.
 * Material is extracted in the browser before saving, then the user is sent
 * to /dashboard/learn/:id where the breakdown is auto-generated.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MaterialInput } from "@/components/learn/MaterialInput";
import { toast } from "sonner";
import { Plus, Brain, BookOpen, Loader2, Clock } from "lucide-react";
import type { ExtractedMaterial } from "@/types/learn";

interface SetCard {
  id: string;
  title: string;
  course_name: string | null;
  has_guide: boolean;
  has_flashcards: boolean;
  has_practice: boolean;
  created_at: string;
  updated_at: string;
}

export default function Learn() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [sets, setSets]       = useState<SetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [title, setTitle]             = useState("");
  const [courseName, setCourseName]   = useState("");
  const [materials, setMaterials]     = useState<ExtractedMaterial[]>([]);
  const [saving, setSaving]           = useState(false);
  const [courseOptions, setCourseOptions] = useState<string[]>([]);

  const loadSets = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("study_sets")
      .select("id, title, course_name, guide, flashcards, practice, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setSets((data ?? []).map((r) => ({
      id:            r.id,
      title:         r.title,
      course_name:   r.course_name,
      has_guide:     !!r.guide,
      has_flashcards: !!r.flashcards,
      has_practice:  !!r.practice,
      created_at:    r.created_at,
      updated_at:    r.updated_at,
    })));
    setLoading(false);
  };

  const loadCourseOptions = async () => {
    // Gather unique course names from study_sets for the datalist
    const { data } = await supabase
      .from("study_sets")
      .select("course_name")
      .not("course_name", "is", null);
    const unique = [...new Set((data ?? []).map((r) => (r as { course_name: string | null }).course_name).filter(Boolean))];
    setCourseOptions(unique as string[]);
  };

  useEffect(() => {
    loadSets();
    loadCourseOptions();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!title.trim() || !materials.length || !user) return;
    setSaving(true);
    try {
      // 1. Insert the study set
      const { data: set, error: setErr } = await supabase
        .from("study_sets")
        .insert({
          user_id:     user.id,
          title:       title.trim(),
          course_name: courseName.trim() || null,
        })
        .select("id")
        .single();
      if (setErr || !set) { toast.error(setErr?.message ?? "Failed to create set"); return; }

      // 2. Insert each extracted material
      const rows = materials.map((m) => ({
        set_id:     set.id,
        user_id:    user.id,
        file_name:  m.file_name,
        kind:       m.kind,
        content:    m.content,
        char_count: m.char_count,
      }));
      const { error: matErr } = await supabase.from("study_materials").insert(rows);
      if (matErr) { toast.error(matErr.message); return; }

      // 3. Go to the study set page — it will auto-generate the guide
      navigate(`/dashboard/learn/${set.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDialog = () => {
    setTitle("");
    setCourseName("");
    setMaterials([]);
    setDialogOpen(true);
  };

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60_000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Learn</h1>
          <p className="mt-1 text-muted-foreground">
            Upload your course material and Delilah breaks it down, quizzes you, and tutors you.
          </p>
        </div>
        <Button onClick={handleOpenDialog} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New study set
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : sets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <Brain className="h-12 w-12 opacity-30" />
          <div>
            <p className="font-medium text-foreground">No study sets yet</p>
            <p className="mt-1 text-sm">Create one by uploading a textbook chapter, lecture slides, or notes.</p>
          </div>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Create your first study set
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sets.map((s) => (
            <Card
              key={s.id}
              className="p-5 cursor-pointer hover:border-primary/40 transition-colors space-y-3"
              onClick={() => navigate(`/dashboard/learn/${s.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-foreground truncate">{s.title}</p>
                  {s.course_name && (
                    <p className="text-xs text-muted-foreground">{s.course_name}</p>
                  )}
                </div>
                <BookOpen className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              </div>

              {/* What's been generated */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Breakdown", active: s.has_guide },
                  { label: "Flashcards", active: s.has_flashcards },
                  { label: "Practice", active: s.has_practice },
                ].map(({ label, active }) => (
                  <span
                    key={label}
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {timeAgo(s.updated_at)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New study set dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New study set</DialogTitle>
            <DialogDescription>
              Give it a title, optionally a course name, and upload your material.
              Delilah will read everything and generate a breakdown.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="set-title">Title</Label>
              <Input
                id="set-title"
                placeholder="e.g. Chapter 4 — Cell Division"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
              />
            </div>

            {/* Course name */}
            <div className="space-y-2">
              <Label htmlFor="set-course">Course (optional)</Label>
              <Input
                id="set-course"
                placeholder="e.g. Biology 201"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                disabled={saving}
                list="course-options"
              />
              <datalist id="course-options">
                {courseOptions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            {/* Material */}
            <div className="space-y-2">
              <Label>Material</Label>
              <MaterialInput value={materials} onChange={setMaterials} disabled={saving} />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!title.trim() || !materials.length || saving}
                className="gap-2"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                ) : (
                  <><Brain className="h-4 w-4" />Create &amp; Start Learning</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
