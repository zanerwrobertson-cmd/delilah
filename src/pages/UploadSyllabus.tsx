import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, CheckCircle2, BookOpen, AlertTriangle } from "lucide-react";

/**
 * Upload Syllabus (/dashboard/upload-syllabus).
 *
 * The flow, all in handleExtract():
 *   1. Read the PDF's text in the browser with pdf.js (the file itself isn't uploaded)
 *   2. Send that text to Claude (via the claude-proxy edge function) and ask for JSON:
 *      a list of assignments/deadlines and a list of weekly topics
 *   3. Parse Claude's JSON
 *   4. Save each assignment and topic to the database under the current user
 *   5. Show the results in two tables
 *
 * The user can then flag topics as "weak areas". Study Plan and Quiz Me
 * give flagged topics extra attention.
 */

// Badge colour for each assignment type in the results table.
const typeBadgeColors: Record<string, string> = {
  exam: "bg-destructive text-destructive-foreground",
  quiz: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  assignment: "bg-primary/15 text-primary border-primary/30",
  project: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  paper: "bg-violet-500/15 text-violet-600 border-violet-500/30",
};

// Shapes of the items Claude returns (they match the assignments/topics table columns).
interface Assignment {
  assignment_name: string;
  deadline: string | null;
  type: string;
}

interface Topic {
  week_number: number | null;
  topic_name: string;
}

export default function UploadSyllabus() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Points at the hidden <input type="file">, so clicking the drop zone can open the file picker.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    assignments_count: number;
    topics_count: number;
    assignments: Assignment[];
    topics: Topic[];
  } | null>(null);
  // Topics the user flagged as weak, keyed by "week-topicName".
  const [flaggedTopics, setFlaggedTopics] = useState<Set<string>>(new Set());

  // Accept only PDFs up to 10 MB; picking a new file clears old results.
  const validateAndSetFile = (selected: File) => {
    if (selected.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }
    setFile(selected);
    setResults(null);
    setFlaggedTopics(new Set());
  };

  // A file can arrive two ways: the file picker, or drag-and-drop onto the drop zone.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  // preventDefault stops the browser from opening the dropped PDF in a new tab.
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const selected = e.dataTransfer.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  // Pull plain text out of every page of the PDF, pages separated by blank lines.
  // Scanned PDFs (images only, no text layer) come back empty.
  const extractTextFromPdf = async (pdfFile: File): Promise<string> => {
    // pdf.js parses in a background worker; its version must match the pdfjs-dist package (4.4.168).
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    // pdf.js page numbers start at 1. Each page is a list of text fragments; join them with spaces.
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(" "));
    }
    return pages.join("\n\n");
  };

  // Main action behind the "Extract Deadlines" button. Steps 1-5 are numbered below.
  const handleExtract = async () => {
    if (!file || !courseName.trim() || !user) return;

    setLoading(true);
    setResults(null);
    setFlaggedTopics(new Set());

    try {
      // 1. Extract text from PDF in browser
      const pdfText = await extractTextFromPdf(file);
      if (!pdfText.trim()) {
        toast({ title: "Empty PDF", description: "Could not extract text from the PDF.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // 2. Call Claude via the claude-proxy edge function.
      // The prompt describes the exact JSON shape we want back so it can be parsed by code.
      const prompt = `You are a syllabus parser. Extract all assignments, exams, quizzes, projects, and papers with their deadlines, plus weekly topics from this syllabus text for the course "${courseName.trim()}".

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "assignments": [
    { "assignment_name": "string", "deadline": "YYYY-MM-DDTHH:mm:ss" or null, "type": "assignment" | "exam" | "quiz" | "project" | "paper" }
  ],
  "topics": [
    { "week_number": 1, "topic_name": "string" }
  ]
}

Extract as much as possible. Use null for unknown deadlines. Return ONLY the JSON.

SYLLABUS TEXT:
${pdfText}`;

      // functions.invoke sends the user's login token along automatically.
      const { data: claudeData, error: fnError } = await supabase.functions.invoke("claude-proxy", {
        body: { prompt },
      });

      if (fnError || claudeData?.error) {
        console.error("Claude proxy error:", fnError || claudeData?.error);
        toast({
          title: "AI processing failed",
          description: claudeData?.error || "Could not process syllabus.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const content = claudeData?.text || "";

      // 3. Parse the JSON response. Strip ```json code fences first, in case
      // Claude wrapped its answer in markdown despite being told not to.
      let parsed: { assignments: Assignment[]; topics: Topic[] };
      try {
        const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse Claude response:", content);
        toast({ title: "Parse error", description: "Could not parse the AI response.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // 4. Save to Supabase. Re-check the login with the server first: the AI step can
      // take a while, and the session may have expired in the meantime.
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error("Auth error - cannot save:", authError);
        toast({ title: "Auth error", description: "Please log in again to save data.", variant: "destructive" });
        setLoading(false);
        return;
      }
      console.log("✅ Authenticated user:", authUser.id);

      // Insert rows one at a time, so one bad row doesn't block the rest. Failures are
      // only logged to the console. user_id must equal the logged-in user, or RLS rejects the insert.
      if (parsed.assignments?.length) {
        for (const a of parsed.assignments) {
          const { error: aErr } = await supabase.from("assignments").insert({
            user_id: authUser.id,
            course_name: courseName.trim(),
            assignment_name: a.assignment_name,
            deadline: a.deadline || null,
            type: a.type || "assignment",
          });
          if (aErr) console.error("Insert assignment failed:", aErr, a);
          else console.log("✅ Saved assignment:", a.assignment_name);
        }
      }

      if (parsed.topics?.length) {
        for (const t of parsed.topics) {
          const { error: tErr } = await supabase.from("topics").insert({
            user_id: authUser.id,
            course_name: courseName.trim(),
            week_number: t.week_number || null,
            topic_name: t.topic_name,
          });
          if (tErr) console.error("Insert topic failed:", tErr, t);
          else console.log("✅ Saved topic:", t.topic_name);
        }
      }

      // 5. Display results (what Claude found, even if some rows failed to save)
      setResults({
        assignments_count: parsed.assignments?.length || 0,
        topics_count: parsed.topics?.length || 0,
        assignments: parsed.assignments || [],
        topics: parsed.topics || [],
      });
      toast({ title: "Syllabus processed!", description: `Found ${parsed.assignments?.length || 0} deadlines and ${parsed.topics?.length || 0} topics.` });
    } catch (err) {
      console.error("Extraction error:", err);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Toggle a topic's "weak area" flag. This is an "optimistic update": the button changes
  // instantly, the database is updated after, and the change is undone if the save fails.
  const handleFlagWeakArea = async (topic: Topic) => {
    if (!user) return;
    const key = `${topic.week_number}-${topic.topic_name}`;

    // Toggle locally
    setFlaggedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

    const isFlagging = !flaggedTopics.has(key);

    // Update in DB. Topics are matched by user + course + name, since the inserted
    // rows' ids weren't kept. Flags every copy if the same syllabus was uploaded twice.
    const { error } = await supabase
      .from("topics")
      .update({ is_weak_area: isFlagging })
      .eq("user_id", user.id)
      .eq("course_name", courseName.trim())
      .eq("topic_name", topic.topic_name);

    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      // Revert
      setFlaggedTopics((prev) => {
        const next = new Set(prev);
        if (isFlagging) next.delete(key);
        else next.add(key);
        return next;
      });
    } else {
      console.log(`✅ Updated topic "${topic.topic_name}" is_weak_area=${isFlagging} for user ${user.id}`);
      toast({
        title: isFlagging ? "Flagged as weak area" : "Removed weak area flag",
        description: topic.topic_name,
      });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Upload Syllabus</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a PDF syllabus and Delilah will extract your deadlines and topics.
        </p>
      </div>

      {/* Input form: course name + PDF drop zone + extract button */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="courseName">Course Name</Label>
          <Input
            id="courseName"
            placeholder="e.g. Biology 101"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label>Syllabus PDF</Label>
          {/* Drop zone: click to open the hidden file input, or drag a PDF onto it */}
          <div
            onClick={() => !loading && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:border-primary/30 hover:bg-muted/50"
            } ${loading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-primary" />
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium text-foreground">Click to upload PDF</p>
                <p className="text-sm text-muted-foreground">Max 10MB</p>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleExtract}
          disabled={!file || !courseName.trim() || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Delilah is reading your syllabus...
            </>
          ) : (
            <>
              <BookOpen className="h-4 w-4" />
              Extract Deadlines
            </>
          )}
        </Button>
      </Card>

      {/* Results: only shown after a successful extraction */}
      {results && (
        <div className="space-y-6">
          {/* Assignments Table */}
          {results.assignments.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Deadlines ({results.assignments_count})
                </h2>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Assignment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Deadline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.assignments.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-foreground">
                          {a.assignment_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={typeBadgeColors[a.type] || "bg-muted text-muted-foreground"}
                          >
                            {a.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.deadline
                            ? new Date(a.deadline).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "No date"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Topics Table, with a weak-area toggle on each row */}
          {results.topics.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Weekly Topics ({results.topics_count})
                </h2>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-20">Week</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead className="w-40 text-right">Weak Area</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.topics.map((t, i) => {
                      const key = `${t.week_number}-${t.topic_name}`;
                      const isFlagged = flaggedTopics.has(key);
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">
                            {t.week_number ?? "—"}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {t.topic_name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={isFlagged ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => handleFlagWeakArea(t)}
                              className="gap-1"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {isFlagged ? "Flagged" : "Flag Weak Area"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
