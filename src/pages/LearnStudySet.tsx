/**
 * LearnStudySet (/dashboard/learn/:id)
 *
 * The main study page for a single set. Five tabs:
 *   Breakdown  — AI study guide
 *   Flashcards — flip-card drill
 *   Practice   — 10-question practice set
 *   Tutor      — conversational AI grounded in the material
 *   Materials  — manage source files
 *
 * The guide is auto-generated on first visit (when study_sets.guide is null).
 * "Explain simpler" / "Quiz me on this" in Breakdown switches to Tutor with a prefilled message.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BreakdownTab }  from "@/components/learn/BreakdownTab";
import { FlashcardsTab } from "@/components/learn/FlashcardsTab";
import { PracticeTab }   from "@/components/learn/PracticeTab";
import { TutorTab }      from "@/components/learn/TutorTab";
import { MaterialsTab }  from "@/components/learn/MaterialsTab";
import { toast } from "sonner";
import { ArrowLeft, MoreHorizontal, Pencil, Trash2, Loader2, Target } from "lucide-react";
import type { StudySetRow, StudyMaterialRow, StudyMessage } from "@/types/learn";

export default function LearnStudySet() {
  const { id }    = useParams<{ id: string }>();
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [set, setSet]                   = useState<StudySetRow | null>(null);
  const [materials, setMaterials]       = useState<StudyMaterialRow[]>([]);
  const [messages, setMessages]         = useState<StudyMessage[]>([]);
  const [loadingSet, setLoadingSet]     = useState(true);
  const [activeTab, setActiveTab]       = useState("breakdown");
  // Which AI actions are in flight, per action, so a long guide run does not block or fake-load other tabs.
  const [pending, setPending]           = useState<Record<string, boolean>>({});

  // Tutor pre-fill from Breakdown buttons
  const [tutorMsg, setTutorMsg] = useState<string | undefined>(undefined);

  // Rename state
  const [renaming, setRenaming]   = useState(false);
  const [newTitle, setNewTitle]   = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  // Focus edit state
  const [editingFocus, setEditingFocus] = useState(false);
  const [newFocus, setNewFocus]         = useState("");
  const [savingFocus, setSavingFocus]   = useState(false);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const loadSet = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("study_sets")
      .select("id, title, course_name, focus, guide, flashcards, practice, created_at, updated_at")
      .eq("id", id)
      .single();
    if (error) { toast.error(error.message); navigate("/dashboard/learn"); return; }
    setSet(data as unknown as StudySetRow);
    setLoadingSet(false);
  };

  const loadMaterials = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("study_materials")
      .select("id, file_name, kind, char_count, created_at")
      .eq("set_id", id)
      .order("created_at");
    setMaterials((data ?? []) as StudyMaterialRow[]);
  };

  const loadMessages = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("study_messages")
      .select("id, role, content, created_at")
      .eq("set_id", id)
      .order("created_at");
    setMessages((data ?? []) as StudyMessage[]);
  };

  useEffect(() => {
    Promise.all([loadSet(), loadMaterials(), loadMessages()]);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate guide on first visit
  useEffect(() => {
    if (set && !set.guide && !pending.guide) {
      callLearn("guide");
    }
  }, [set?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate flashcards / practice when switching to those tabs for the first time
  useEffect(() => {
    if (!set) return;
    if (activeTab === "flashcards" && !set.flashcards && !pending.flashcards) callLearn("flashcards");
    if (activeTab === "practice"   && !set.practice   && !pending.practice)   callLearn("practice");
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const callLearn = async (action: string, focus?: string) => {
    if (!id) return;
    setPending((p) => ({ ...p, [action]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("learn", {
        body: { action, setId: id, ...(focus ? { focus } : {}) },
      });
      if (error) {
        const body = await (error as { context?: Response }).context?.json().catch(() => null);
        toast.error((body as { error?: string })?.error ?? (error as Error).message);
        return;
      }
      // Merge returned field into local set state
      setSet((prev) => prev ? { ...prev, ...data } : prev);
    } finally {
      setPending((p) => ({ ...p, [action]: false }));
    }
  };

  const handleTutorPrompt = (msg: string) => {
    setTutorMsg(msg);
    setActiveTab("tutor");
  };

  const handleRegenerate = (action: string, focus?: string) => {
    callLearn(action, focus);
  };

  const handleRegenerateAll = () => {
    callLearn("guide");
    // flashcards/practice will re-generate when tabs are visited
    setSet((prev) => prev ? { ...prev, flashcards: null, practice: null } : prev);
  };

  // Rename
  const handleRename = async () => {
    if (!newTitle.trim() || !id) return;
    setSavingTitle(true);
    const { error } = await supabase
      .from("study_sets")
      .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); }
    else { setSet((prev) => prev ? { ...prev, title: newTitle.trim() } : prev); setRenaming(false); }
    setSavingTitle(false);
  };

  // Focus — saving regenerates everything so it takes effect
  const handleSaveFocus = async () => {
    if (!id) return;
    const focus = newFocus.trim() || null;
    setSavingFocus(true);
    const { error } = await supabase
      .from("study_sets")
      .update({ focus, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingFocus(false);
    if (error) { toast.error(error.message); return; }
    setSet((prev) => prev ? { ...prev, focus } : prev);
    setEditingFocus(false);
    handleRegenerateAll();
  };

  // Delete
  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const { error } = await supabase.from("study_sets").delete().eq("id", id);
    if (error) { toast.error(error.message); setDeleting(false); return; }
    navigate("/dashboard/learn");
  };

  if (loadingSet) {
    return (
      <div className="flex items-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading study set…</span>
      </div>
    );
  }

  if (!set) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0 text-muted-foreground"
          onClick={() => navigate("/dashboard/learn")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-8 text-lg font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
              />
              <Button size="sm" onClick={handleRename} disabled={savingTitle || !newTitle.trim()}>
                {savingTitle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>Cancel</Button>
            </div>
          ) : (
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground leading-tight truncate">
                {set.title}
              </h1>
              {set.course_name && (
                <p className="mt-0.5 text-sm text-muted-foreground">{set.course_name}</p>
              )}
            </div>
          )}

          {editingFocus ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={newFocus}
                onChange={(e) => setNewFocus(e.target.value)}
                placeholder="e.g. only chapters 3-4, the formulas, what's likely on the midterm…"
                rows={2}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Escape") setEditingFocus(false); }}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveFocus} disabled={savingFocus || !!pending.guide}>
                  {savingFocus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save & regenerate"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingFocus(false)}>Cancel</Button>
              </div>
            </div>
          ) : set.focus && (
            <button
              className="mt-2 flex items-start gap-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
              onClick={() => { setNewFocus(set.focus ?? ""); setEditingFocus(true); }}
            >
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>Focus: {set.focus}</span>
            </button>
          )}
        </div>

        {!renaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setNewTitle(set.title); setRenaming(true); }}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setNewFocus(set.focus ?? ""); setEditingFocus(true); }}>
                <Target className="mr-2 h-3.5 w-3.5" />
                {set.focus ? "Edit focus" : "Set focus"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-1 h-auto p-1">
          {["breakdown", "flashcards", "practice", "tutor", "materials"].map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize flex-1 min-w-[80px]">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="breakdown">
          <BreakdownTab
            guide={set.guide}
            loading={!!pending.guide && !set.guide}
            onRegenerate={(focus) => handleRegenerate("guide", focus)}
            onTutorPrompt={handleTutorPrompt}
          />
        </TabsContent>

        <TabsContent value="flashcards">
          <FlashcardsTab
            flashcards={set.flashcards}
            loading={!!pending.flashcards && !set.flashcards}
            onGenerate={() => callLearn("flashcards")}
          />
        </TabsContent>

        <TabsContent value="practice">
          <PracticeTab
            practice={set.practice}
            setId={set.id}
            loading={!!pending.practice && !set.practice}
            onGenerate={() => callLearn("practice")}
          />
        </TabsContent>

        <TabsContent value="tutor">
          <TutorTab
            setId={set.id}
            messages={messages}
            onMessagesUpdate={setMessages}
            initialMessage={tutorMsg}
            onInitialMessageConsumed={() => setTutorMsg(undefined)}
          />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab
            setId={set.id}
            userId={user?.id ?? ""}
            materials={materials}
            onMaterialsChange={loadMaterials}
            onRegenerateAll={handleRegenerateAll}
          />
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete study set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{set.title}" and all its materials, flashcards, and chat history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
