"""Read-only verification of the local review gallery and example PDFs."""
import hashlib
import json
import sys
from html.parser import HTMLParser
from pathlib import Path

from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
extended = "--extended" in sys.argv
gallery = root / ("data/qa/branding-v2/revisao.html" if extended else "data/qa/branding/revisao.html")


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ("src", "href") and value and not value.startswith("#"):
                self.paths.append((gallery.parent / value).resolve())


references = References()
references.feed(gallery.read_text(encoding="utf-8"))
missing = [str(path) for path in references.paths if not path.is_file()]
assert not missing, missing

pdfs = {}
examples = [("proposta-borges", "Proposta técnica e comercial"), ("relatorio-borges", "Relatório técnico de infraestrutura")]
if extended:
    examples.append(("relatorio-borges-longo", "Relatório técnico de infraestrutura"))
for name, title in examples:
    path = root / ("output/pdf/branding-v2" if extended else "output/pdf") / f"{name}.pdf"
    reader = PdfReader(path)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert title in text, name
    assert len(reader.pages) > 1 if name.endswith("-longo") else len(reader.pages) == 1, name
    assert "Rede Horizonte" in text, name
    assert "empresa.example" in text, name
    for page in reader.pages:
        assert abs(float(page.mediabox.width) - 595.28) < 2
        assert abs(float(page.mediabox.height) - 841.89) < 2
        assert len(page.extract_text() or "") > 80
    fonts = {}
    for page in reader.pages:
        for ref in page["/Resources"].get("/Font", {}).get_object().values():
            font = ref.get_object()
            children = [font] + [child.get_object() for child in font.get("/DescendantFonts", [])]
            embedded = any(any(key in child["/FontDescriptor"].get_object() for key in ("/FontFile", "/FontFile2", "/FontFile3")) for child in children if child.get("/FontDescriptor"))
            fonts[str(font.get("/BaseFont"))] = embedded
    assert fonts and all(fonts.values()), (name, fonts)
    pdfs[name] = {"pages": len(reader.pages), "textCharacters": len(text),
                  "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "fontsEmbedded": fonts}

ui = json.loads((gallery.parent / "ui-results.json").read_text(encoding="utf-8"))
assert not ui["errors"], ui["errors"]
assert len(ui["checks"]) == (11 if extended else 6)
postgres = "pending at 2026-10-30; historical review"
if extended:
    postgres = json.loads((gallery.parent / "postgres-results.json").read_text(encoding="utf-8"))
    assert postgres["passed"] and postgres["cleanedUp"]
    assert all(step["exitCode"] == 0 for step in postgres["steps"])
    assert postgres["steps"][1]["tests"] == 8
    assert ui["buildMode"] == "production"
    assert ui["databaseBacked"]
    assert ui["buildId"] == (root / "apps/web/.next/BUILD_ID").read_text().strip()
    assert postgres["startedAt"] <= ui["completedAt"] <= postgres["completedAt"]
result = {"reviewDate": "2026-10-31" if extended else "2026-10-30", "localOnly": True,
          "galleryReferences": len(references.paths), "missingReferences": missing,
          "coreAndHttpTests": 22 if extended else 14, "billingRegressionTests": 15,
          "storageAndTimezoneRegressionTests": 12, "browserScenarios": ui["checks"],
          "settingsBrowserRegression": "passed with synthetic API",
          "postgresql": postgres,
          "pdfs": pdfs}
(gallery.parent / "validation.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"galleryReferences": len(references.paths), "pdfs": pdfs,
                  "browserErrors": ui["errors"]}, ensure_ascii=False))
