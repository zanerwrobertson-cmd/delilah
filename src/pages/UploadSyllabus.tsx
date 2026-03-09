import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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

const typeBadgeColors: Record<string, string> = {
  exam: "bg-destructive text-destructive-foreground",
  quiz: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  assignment: "bg-primary/15 text-primary border-primary/30",
  project: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  paper: "bg-violet-500/15 text-violet-600 border-violet-500/30",
};

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
  const [flaggedTopics, setFlaggedTopics] = useState<Set<string>>(new Set());

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

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

  const handleExtract = async () => {
    if (!file || !courseName.trim() || !user) return;

    setLoading(true);
    setResults(null);
    setFlaggedTopics(new Set());

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("syllabi")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("parse-syllabus", {
        body: { filePath, courseName: courseName.trim() },
      });

      if (error) {
        toast({ title: "Extraction failed", description: "Could not extract data from the syllabus.", variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Extraction failed", description: data.error, variant: "destructive" });
      } else {
        setResults(data);
        toast({ title: "Syllabus processed!", description: `Found ${data.assignments_count} deadlines and ${data.topics_count} topics.` });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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

    // Update in DB
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
          <div
            onClick={() => !loading && fileInputRef.current?.click()}
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

      {/* Results */}
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

          {/* Topics Table */}
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
