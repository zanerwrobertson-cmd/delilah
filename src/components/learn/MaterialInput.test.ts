import JSZip from "jszip";
import { extractEpub, extractXlsx, extractOdf, htmlText } from "./MaterialInput";

async function zipFile(name: string, files: Record<string, string>) {
  const zip = new JSZip();
  for (const [path, body] of Object.entries(files)) zip.file(path, body);
  const blob = await zip.generateAsync({ type: "uint8array" });
  // jsdom's File lacks arrayBuffer(); browsers have it.
  return Object.assign(new File([blob], name), { arrayBuffer: async () => blob.buffer });
}

describe("material extractors", () => {
  it("reads EPUB chapters in spine order", async () => {
    const file = await zipFile("book.epub", {
      "META-INF/container.xml": `<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
      "OEBPS/content.opf": `<package><manifest>
        <item id="c2" href="text/ch%202.xhtml"/><item id="c1" href="text/ch1.xhtml"/>
      </manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`,
      "OEBPS/text/ch1.xhtml": `<html><body><h1>Mitosis</h1><p>Cells divide &amp; grow.</p></body></html>`,
      "OEBPS/text/ch 2.xhtml": `<html><body><p>Meiosis</p></body></html>`,
    });
    expect(await extractEpub(file)).toBe("[Chapter 1]\nMitosis\nCells divide & grow.\n\n[Chapter 2]\nMeiosis");
  });

  it("reads XLSX shared strings and numbers", async () => {
    const file = await zipFile("grades.xlsx", {
      "xl/sharedStrings.xml": `<sst><si><t>Name</t></si><si><t>Ada</t></si></sst>`,
      "xl/worksheets/sheet1.xml": `<worksheet><sheetData>
        <row><c t="s"><v>0</v></c></row><row><c t="s"><v>1</v></c><c><v>97</v></c></row>
      </sheetData></worksheet>`,
    });
    expect(await extractXlsx(file)).toBe("[Sheet 1]\nName\nAda\t97");
  });

  it("reads ODT paragraphs", async () => {
    const file = await zipFile("notes.odt", {
      "content.xml": `<office:document-content xmlns:office="o" xmlns:text="t"><office:body><office:text>
        <text:h>Title</text:h><text:p>Body text</text:p></office:text></office:body></office:document-content>`,
    });
    expect(await extractOdf(file)).toBe("Title\nBody text");
  });

  it("strips HTML to text", () => {
    expect(htmlText("<p>One</p><script></script><p>Two</p>")).toBe("One\nTwo");
  });
});
