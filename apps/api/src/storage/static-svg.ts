import { SaxesParser } from "saxes";

const SVG = "http://www.w3.org/2000/svg";
const XMLNS = "http://www.w3.org/2000/xmlns/";
const XLINK = "http://www.w3.org/1999/xlink";
/** Normalize element prefixes for rasterizers without rewriting the preserved original. */
export function canonicalStaticSvg(source: string) {
  assertStaticSvg(source);
  const parser = new SaxesParser({ xmlns: true });
  const output: string[] = [], names: string[] = [];
  const text = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const attr = (value: string) => text(value).replace(/"/g, "&quot;");
  parser.on("opentag", node => {
    const root = names.length === 0;
    names.push(node.local);
    let tag = `<${node.local}`;
    if (root) tag += ` xmlns="${SVG}" xmlns:xlink="${XLINK}" xmlns:svg="${SVG}"`;
    for (const value of Object.values(node.attributes)) {
      if (value.uri === XMLNS) continue;
      const name = value.uri === XLINK ? `xlink:${value.local}` : value.uri === SVG ? `svg:${value.local}` : value.uri === "http://www.w3.org/XML/1998/namespace" ? `xml:${value.local}` : value.local;
      tag += ` ${name}="${attr(value.value)}"`;
    }
    output.push(tag + ">");
  });
  parser.on("closetag", () => output.push(`</${names.pop()}>`));
  parser.on("text", value => output.push(text(value)));
  parser.on("cdata", value => output.push(text(value)));
  parser.write(source).close();
  return output.join("");
}
const elements = new Set([
  "svg",
  "g",
  "defs",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "title",
  "desc",
  "metadata",
  "text",
  "tspan",
  "textPath",
  "style",
  "symbol",
  "use",
  "clipPath",
  "linearGradient",
  "radialGradient",
  "stop",
  "mask",
  "pattern",
  "marker",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
]);
const cssAttributes = new Set([
  "style",
  "fill",
  "stroke",
  "filter",
  "mask",
  "clip-path",
  "cursor",
  "marker",
  "marker-start",
  "marker-mid",
  "marker-end",
  "color",
  "font-family",
  "transform",
]);
const functions = new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
  "color-mix",
  "calc",
  "min",
  "max",
  "clamp",
  "matrix",
  "translate",
  "translatex",
  "translatey",
  "scale",
  "scalex",
  "scaley",
  "rotate",
  "skewx",
  "skewy",
]);
const fail = (): never => {
  throw new Error("SVG must be a static, self-contained vector.");
};

function staticCss(value: string) {
  const text = value.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/[\\@\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) fail();
  const withoutLocalReferences = text.replace(
    /url\s*\(\s*(["']?)#[\w.:-]+\1\s*\)/gi,
    "",
  );
  for (const match of withoutLocalReferences.matchAll(/([a-z][\w-]*)\s*\(/gi)) {
    if (!functions.has(match[1]!.toLowerCase())) fail();
  }
}

/** Validate original bytes without rasterizing or rewriting the artwork.
 * XML namespaces are resolved before checking elements and decoded attributes.
 * This deliberately supports static SVG only: no scripts, animation, embedded
 * HTML/images, stylesheets, external resources, DTDs or XML base overrides.
 */
export function assertStaticSvg(svg: string): void {
  const parser = new SaxesParser({ xmlns: true });
  const stack: string[] = [];
  let count = 0,
    style = "";
  parser.on("error", (error) => {
    throw error;
  });
  parser.on("doctype", fail);
  parser.on("processinginstruction", fail);
  parser.on("opentag", (tag) => {
    if (
      ++count > 10000 ||
      stack.length >= 64 ||
      stack[stack.length - 1] === "style"
    )
      fail();
    if (!stack.length && tag.local !== "svg") fail();
    if (tag.uri !== SVG || !elements.has(tag.local)) fail();
    for (const attr of Object.values(tag.attributes)) {
      if (attr.uri === XMLNS) continue;
      const key = attr.local.toLowerCase();
      if (key.startsWith("on") || key === "base") fail();
      if (
        key === "href" &&
        (!/^#[\w.:-]+$/.test(attr.value) || (attr.uri && attr.uri !== XLINK))
      )
        fail();
      if (cssAttributes.has(key)) staticCss(attr.value);
    }
    stack.push(tag.local);
    if (tag.local === "style") style = "";
  });
  const text = (value: string) => {
    if (stack[stack.length - 1] === "style") style += value;
  };
  parser.on("text", text);
  parser.on("cdata", text);
  parser.on("closetag", (tag) => {
    if (tag.local === "style") staticCss(style);
    stack.pop();
  });
  parser.write(svg).close();
  if (!count) fail();
}
