/** Public media URLs never depend on an untrusted Host header or on private file routes. */
export function publicBrandOrigin(
  value = process.env.NEXT_PUBLIC_WEB_URL || "",
) {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        local &&
        url.protocol === "http:"
      )) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Configure a URL HTTPS pública da instalação antes de publicar imagens.",
    );
  return url.origin;
}
export const publicBrandAssetPath = (row: { id: string; sha256: string }) =>
  `/api/v1/public/brand-assets/${row.id}/${row.sha256}.png`;
export const publicBrandAssetUrl = (row: { id: string; sha256: string }) =>
  publicBrandOrigin() + publicBrandAssetPath(row);
export function emailImageReferences(body: string) {
  return Array.from(
    body.matchAll(/!\[([^\]\n]{0,200})\]\((https:\/\/[^\s)]{1,1000})\)/g),
    (match) => ({ alt: match[1]!, url: match[2]! }),
  );
}
