/**
 * MaterialInput — multi-file drag-and-drop extractor for the Learn feature.
 *
 * Supports:
 *   PDF   — pdfjs-dist with [Page N] markers
 *   PPTX  — jszip: slide text + speaker notes, [Slide N] markers
 *   DOCX  — jszip: word/document.xml text extraction
 *   EPUB  — jszip: chapters in spine order, [Chapter N] markers
 *   XLSX  — jszip: each sheet as tab-separated rows
 *   ODT / ODS / ODP — jszip: content.xml paragraphs
 *   HTML  — DOMParser text
 *   Anything else that is text (TXT, MD, CSV, JSON, code…) — read as plain text
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
  epub: "EPUB", html: "HTML", xlsx: "XLSX", odf: "ODF",
};

const kindColor: Record<string, string> = {
  pdf:   "bg-red-500/15 text-red-400 border-red-500/30",
  docx:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  pptx:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  text:  "bg-muted text-muted-foreground",
  paste: "bg-primary/15 text-primary border-primary/30",
  epub:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  html:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  xlsx:  "bg-green-500/15 text-green-400 border-green-500/30",
  odf:   "bg-sky-500/15 text-sky-400 border-sky-500/30",
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

// Text of a parsed XML/HTML doc, with a newline after each block element.
function blockText(doc: Document, blocks: string[]): string {
  const root = doc.body ?? doc.documentElement;
  for (const el of Array.from(root.getElementsByTagName("*"))) {
    if (blocks.includes(el.localName.toLowerCase())) el.append("\n");
  }
  return (root.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}

const HTML_BLOCKS = ["p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre"];

export function htmlText(markup: string): string {
  return blockText(new DOMParser().parseFromString(markup, "text/html"), HTML_BLOCKS);
}

export async function extractEpub(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const parse = (xml: string) => new DOMParser().parseFromString(xml, "application/xml");

  const container = parse(await zip.file("META-INF/container.xml")!.async("text"));
  const opfPath = container.getElementsByTagName("rootfile")[0].getAttribute("full-path")!;
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const opf = parse(await zip.file(opfPath)!.async("text"));

  const hrefs: Record<string, string> = {};
  for (const item of Array.from(opf.getElementsByTagName("item"))) {
    hrefs[item.getAttribute("id")!] = item.getAttribute("href")!;
  }

  const chapters: string[] = [];
  for (const ref of Array.from(opf.getElementsByTagName("itemref"))) {
    const href = hrefs[ref.getAttribute("idref")!];
    const entry = href && zip.file(opfDir + decodeURIComponent(href.split("#")[0]));
    if (!entry) continue;
    const text = htmlText(await entry.async("text"));
    if (text) chapters.push(`[Chapter ${chapters.length + 1}]\n${text}`);
  }
  return chapters.join("\n\n");
}

export async function extractXlsx(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const parse = (xml: string) => new DOMParser().parseFromString(xml, "application/xml");

  const sharedXml = zip.file("xl/sharedStrings.xml");
  const shared = sharedXml
    ? Array.from(parse(await sharedXml.async("text")).getElementsByTagName("si")).map((si) => si.textContent ?? "")
    : [];

  const sheetFiles = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => parseInt(a.match(/(\d+)\.xml/)![1]) - parseInt(b.match(/(\d+)\.xml/)![1]));

  const sheets: string[] = [];
  for (let i = 0; i < sheetFiles.length; i++) {
    const doc = parse(await zip.file(sheetFiles[i])!.async("text"));
    const rows = Array.from(doc.getElementsByTagName("row")).map((row) =>
      Array.from(row.getElementsByTagName("c")).map((c) => {
        const v = c.getElementsByTagName("v")[0]?.textContent ?? c.textContent ?? "";
        return c.getAttribute("t") === "s" ? shared[Number(v)] ?? "" : v;
      }).join("\t"),
    ).filter((row) => row.trim());
    if (rows.length) sheets.push(`[Sheet ${i + 1}]\n${rows.join("\n")}`);
  }
  return sheets.join("\n\n");
}

// OpenDocument (odt / ods / odp): all text lives in content.xml.
export async function extractOdf(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const doc = new DOMParser().parseFromString(await zip.file("content.xml")!.async("text"), "application/xml");
  return blockText(doc, ["p", "h", "table-row", "page"]);
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
      } else if (ext === "epub") {
        kind = "epub";
        content = await extractEpub(file);
      } else if (ext === "xlsx") {
        kind = "xlsx";
        content = await extractXlsx(file);
      } else if (["odt", "ods", "odp"].includes(ext)) {
        kind = "odf";
        content = await extractOdf(file);
      } else if (["html", "htm", "xhtml"].includes(ext)) {
        kind = "html";
        content = htmlText(await file.text());
      } else {
        // Anything else: accept it if it is text, reject binary (NUL bytes).
        content = await file.text();
        if (content.slice(0, 8000).includes("\u0000")) {
          const hint = ["doc", "ppt", "xls"].includes(ext) ? ` Save it as .${ext}x and try again.` : "";
          setErrors((e) => ({ ...e, [name]: `Can't read text from .${ext} files.${hint}` }));
          return;
        }
      }

      if (!content.trim()) {
        setErrors((e) => ({ ...e, [name]: "No text found in this file." }));
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
            <p className="text-xs text-muted-foreground">PDF, EPUB, DOCX, PPTX, XLSX, ODT, HTML, TXT, CSV… — multiple files OK</p>
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
