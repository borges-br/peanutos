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
  return {
    type: "doc",
    content: body
      .split(/\n{2,}/)
      .map((part) => ({
        type: "paragraph",
        content: part
          .split("\n")
          .flatMap((line, i) => [
            ...(i ? [{ type: "hardBreak" }] : []),
            ...inline(line),
          ]),
      })),
  };
}
export function emailText(doc: JSONContent): string {
  const node = (n: JSONContent): string => {
    if (n.type === "hardBreak") return "\n";
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
