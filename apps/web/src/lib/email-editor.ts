import type { JSONContent } from "@tiptap/react";
export function emailDocument(body: string): JSONContent {
  const inline = (line: string): JSONContent[] => {
    const out: JSONContent[] = [];
    let offset = 0;
    const pattern = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g;
    for (const m of Array.from(line.matchAll(pattern))) {
      if (m.index! > offset)
        out.push({ type: "text", text: line.slice(offset, m.index) });
      out.push({
        type: "text",
        text: m[1] || m[2],
        marks: [
          m[1] ? { type: "bold" } : { type: "link", attrs: { href: m[3] } },
        ],
      });
      offset = m.index! + m[0].length;
    }
    if (offset < line.length)
      out.push({ type: "text", text: line.slice(offset) });
    return out;
  };
  const paragraphs = (value: string): JSONContent[] =>
    value.split(/\n{2,}/).map((part) => ({
      type: "paragraph",
      content: part
        .split("\n")
        .flatMap((line, i) => [
          ...(i ? [{ type: "hardBreak" }] : []),
          ...inline(line),
        ]),
    }));
  const content: JSONContent[] = [];
  let cursor = 0;
  for (const match of Array.from(
    body.matchAll(/!\[([^\]\n]{0,200})\]\((https:\/\/[^\s)]{1,1000})\)/g),
  )) {
    const before = body.slice(cursor, match.index).replace(/\n+$/, "");
    if (before) content.push(...paragraphs(before));
    content.push({ type: "image", attrs: { src: match[2], alt: match[1] } });
    cursor = match.index! + match[0].length;
  }
  const tail = body.slice(cursor).replace(cursor ? /^\n+/ : /$^/, "");
  if (tail || !content.length) content.push(...paragraphs(tail));
  return { type: "doc", content };
}
export function emailText(doc: JSONContent): string {
  const node = (n: JSONContent): string => {
    if (n.type === "hardBreak") return "\n";
    if (n.type === "image") {
      const src = n.attrs?.src || "";
      if (!/^https:\/\//.test(src)) return "";
      const alt = String(n.attrs?.alt || "Imagem da empresa")
        .replace(/[\]\n{}]/g, " ")
        .slice(0, 200);
      return `![${alt}](${src})`;
    }
    if (n.type === "text") {
      let s = n.text || "";
      const link = n.marks?.find((m) => m.type === "link");
      if (link && /^https:\/\//.test(link.attrs?.href || ""))
        return "[" + s + "](" + link.attrs!.href + ")";
      if (n.marks?.some((m) => m.type === "bold")) s = "**" + s + "**";
      return s;
    }
    return (n.content || []).map(node).join("");
  };
  return (doc.content || []).map(node).join("\n\n");
}
