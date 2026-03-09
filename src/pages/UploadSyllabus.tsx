import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, CheckCircle2, BookOpen } from "lucide-react";

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
    assignments: any[];
    topics: any[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
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
  };

  const handleExtract = async () => {
    if (!file || !courseName.trim() || !user) return;

    setLoading(true);
    setResults(null);

    try {
      // Upload PDF to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("syllabi")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Call edge function to parse
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
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Upload Syllabus</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a PDF syllabus and Delilah will extract your deadlines and topics.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Course Name */}
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

        {/* File Upload */}
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

        {/* Extract Button */}
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
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold">Extraction Complete</h2>
          </div>

          {results.assignments.length > 0 && (
            <div>
              <h3 className="font-medium text-foreground mb-2">
                Deadlines ({results.assignments_count})
              </h3>
              <div className="space-y-2">
                {results.assignments.map((a: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                  >
                    <div>
                      <span className="font-medium text-foreground">{a.assignment_name}</span>
                      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {a.type}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {a.deadline
                        ? new Date(a.deadline).toLocaleDateString()
                        : "No date"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.topics.length > 0 && (
            <div>
              <h3 className="font-medium text-foreground mb-2">
                Topics ({results.topics_count})
              </h3>
              <div className="space-y-2">
                {results.topics.map((t: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    {t.week_number && (
                      <span className="text-muted-foreground mr-2">
                        Week {t.week_number}:
                      </span>
                    )}
                    <span className="font-medium text-foreground">{t.topic_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
