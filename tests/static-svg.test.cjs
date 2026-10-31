const test = require("node:test"),
  assert = require("node:assert/strict");
const { assertStaticSvg } = require("../apps/api/dist/storage/static-svg");
const wrap = (content) =>
  `<s:svg xmlns:s="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/1999/xlink">${content}</s:svg>`;
test("static SVG accepts namespaced paths, gradients and internal references", () => {
  assert.doesNotThrow(() =>
    assertStaticSvg(
      '<?xml version="1.0" encoding="utf-8"?><ns0:svg xmlns:ns0="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><ns0:title>Marca de exemplo</ns0:title><ns0:g><ns0:path fill="#0968c4" d="M0 0H20V20Z"/></ns0:g></ns0:svg>',
    ),
  );
  assert.doesNotThrow(() =>
    assertStaticSvg(
      wrap(
        '<s:defs><s:linearGradient id="a"><s:stop offset="0" stop-color="#0968c4"/></s:linearGradient></s:defs><s:style>.a {fill:url(\'#a\');stroke:rgb(1,2,3)}</s:style><s:path class="a" transform="translate(1,2)" d="M0 0H20V20Z"/><s:use x:href="#a"/>',
      ),
    ),
  );
});
test("static SVG rejects active content, external resources, encoded URLs and namespace tricks", () => {
  const cases = [
    wrap("<s:script>alert(1)</s:script>"),
    wrap('<s:path onload="alert(1)"/>'),
    wrap(
      '<s:foreignObject><div xmlns="http://www.w3.org/1999/xhtml"/></s:foreignObject>',
    ),
    wrap('<s:use x:href="&#104;ttps://example.invalid/a.svg#b"/>'),
    wrap('<s:path style="fill:url(&#104;ttps://example.invalid/a)"/>'),
    wrap(
      "<s:style>.a{fill:u<![CDATA[rl(https://example.invalid/a)]]>}</s:style>",
    ),
    wrap('<s:path style="fill:u\\72l(https://example.invalid/a)"/>'),
    wrap('<s:style>@import "https://example.invalid/style.css";</s:style>'),
    wrap('<s:style>.a{background-image:image-set("a.png" 1x)}</s:style>'),
    wrap('<s:g xml:base="https://example.invalid/"><s:use x:href="#a"/></s:g>'),
    wrap('<s:set attributeName="href" to="https://example.invalid/a"/>'),
    '<!DOCTYPE svg SYSTEM "https://example.invalid/a.dtd">' + wrap(""),
    '<?xml-stylesheet href="https://example.invalid/style.css"?>' + wrap(""),
    '<s:svg xmlns:s="http://www.w3.org/1999/xhtml"/>',
    wrap("<bad:path/>"),
    wrap("<s:path>"),
  ];
  for (const svg of cases) assert.throws(() => assertStaticSvg(svg));
});
test("static SVG bounds deeply nested and oversized element trees", () => {
  assert.throws(() =>
    assertStaticSvg(wrap("<s:g>".repeat(70) + "</s:g>".repeat(70))),
  );
  assert.throws(() => assertStaticSvg(wrap("<s:path/>".repeat(10001))));
});
