/**
 * MaterialInput — multi-file drag-and-drop extractor for the Learn feature.
 *
 * Supports:
 *   PDF   — pdfjs-dist with [Page N] markers
 *   PPTX  — jszip: slide text + speaker notes, [Slide N] markers
 *   DOCX  — jszip: word/document.xml text extraction
 *   TXT / MD — read as plain text
 *   Paste — freeform textarea
 *
 * Emits the current list of ExtractedMaterial objects via onChange whenever
 * the list changes. Parent components are responsible for storing the list.
 */
import { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, AlertTriangle, ClipboardPaste, Loader2, AlertCircle } from "lucide-react";
import type { ExtractedMaterial } from "@/types/learn";

const CHAR_WARN_THRESHOLD = 550_000;

interface MaterialInputProps {
  value: ExtractedMaterial[];
  onChange: (materials: ExtractedMaterial[]) => void;
  disabled?: boolean;
}

const kindLabel: Record<string, string> = {
  pdf: "PDF", docx: "DOCX", pptx: "PPTX", text: "TXT", paste: "Paste",
};

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

// ---------------------------------------------------------------------------
// Text extractors
// ---------------------------------------------------------------------------

async function extractPdf(file: File): Promise<string> {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => (item as { str: string }).str).join(" ").trim();
    if (text) pages.push(`[Page ${i}]\n${text}`);
  }
  return pages.join("\n\n");
}

async function extractPptx(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)/)![1]);
      const numB = parseInt(b.match(/(\d+)/)![1]);
      return numA - numB;
    });

  const slides: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const slideNum = i + 1;
    const xml = await zip.files[slideFiles[i]].async("text");
    const slideText = (xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [])
      .map((m) => m.replace(/<[^>]+>/g, ""))
      .filter(Boolean)
      .join(" ");

    let notesText = "";
    const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    if (zip.files[notesPath]) {
      const notesXml = await zip.files[notesPath].async("text");
      notesText = (notesXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [])
        .map((m) => m.replace(/<[^>]+>/g, ""))
        .filter(Boolean)
        .join(" ");
    }

    let part = `[Slide ${slideNum}]\n${slideText}`;
    if (notesText.trim()) part += `\nNotes: ${notesText}`;
    slides.push(part);
  }
  return slides.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.files["word/document.xml"].async("text");
  // Insert newlines at paragraph boundaries, then pull text from <w:t> elements.
  const withBreaks = xml.replace(/<\/w:p>/g, "\n");
  return (withBreaks.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [])
    .map((m) => m.replace(/<[^>]+>/g, ""))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MaterialInput({ value, onChange, disabled = false }: MaterialInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const totalChars = value.reduce((sum, m) => sum + m.char_count, 0);

  const addMaterial = (mat: ExtractedMaterial) => {
    onChange([...value, mat]);
  };

  const removeMaterial = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  const processFile = async (file: File) => {
    const name = file.name;
    const ext = name.split(".").pop()?.toLowerCase() ?? "";

    setExtracting(name);
    setErrors((e) => { const n = { ...e }; delete n[name]; return n; });

    try {
      let content = "";
      let kind: ExtractedMaterial["kind"] = "text";

      if (ext === "pdf") {
        kind = "pdf";
        content = await extractPdf(file);
        if (!content.trim()) {
          setErrors((e) => ({ ...e, [name]: "No text found — this PDF may be scanned (image-only). Try a text-based PDF." }));
          return;
        }
      } else if (ext === "pptx") {
        kind = "pptx";
        content = await extractPptx(file);
      } else if (ext === "docx") {
        kind = "docx";
        content = await extractDocx(file);
      } else if (["txt", "md"].includes(ext)) {
        kind = "text";
        content = await file.text();
      } else {
        setErrors((e) => ({ ...e, [name]: `Unsupported file type: .${ext}` }));
        return;
      }

      addMaterial({ file_name: name, kind, content, char_count: content.length });
    } catch (err: unknown) {
      setErrors((e) => ({ ...e, [name]: (err as Error).message ?? "Failed to extract text." }));
    } finally {
      setExtracting(null);
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(processFile);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  const handleAddPaste = () => {
    if (!pasteText.trim()) return;
    addMaterial({
      file_name: "Pasted text",
      kind: "paste",
      content: pasteText.trim(),
      char_count: pasteText.trim().length,
    });
    setPasteText("");
    setPasteOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => !disabled && !extracting && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          disabled || extracting
            ? "opacity-50 pointer-events-none border-border"
            : "cursor-pointer border-border hover:border-primary/40 hover:bg-muted/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {extracting ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Extracting {extracting}…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-foreground">Drop files here or click to browse</p>
            <p className="text-xs text-muted-foreground">PDF, PPTX, DOCX, TXT, MD — multiple files OK</p>
          </div>
        )}
      </div>

      {/* Paste text toggle */}
      {!pasteOpen ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPasteOpen(true)}
          disabled={disabled}
          className="gap-2"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Paste text instead
        </Button>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder="Paste notes, a chapter excerpt, or any text here…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="min-h-32 resize-y font-mono text-sm"
            disabled={disabled}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAddPaste} disabled={!pasteText.trim() || disabled}>
              Add text
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setPasteOpen(false); setPasteText(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Extraction errors */}
      {Object.entries(errors).map(([name, msg]) => (
        <div key={name} className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><span className="font-medium">{name}:</span> {msg}</span>
        </div>
      ))}

      {/* Material list */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((mat, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm font-medium text-foreground">{mat.file_name}</span>
              <Badge variant="outline" className={`text-xs shrink-0 ${kindColor[mat.kind] ?? ""}`}>
                {kindLabel[mat.kind] ?? mat.kind}
              </Badge>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtChars(mat.char_count)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeMaterial(i)}
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Total size + warning */}
          <div className={`flex items-center gap-2 text-xs ${totalChars > CHAR_WARN_THRESHOLD ? "text-orange-400" : "text-muted-foreground"}`}>
            {totalChars > CHAR_WARN_THRESHOLD && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
            <span>
              Total: {fmtChars(totalChars)}
              {totalChars > CHAR_WARN_THRESHOLD && " — over the ~550k limit. Consider splitting by chapter."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
