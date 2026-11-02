import {
  publicBrandAssetUrl,
  emailImageReferences,
  renderBillingEmail,
  validateBillingEmail,
} from "@peanut/utils";
import type { BillingEmailContent } from "@peanut/utils";
import type { BillingEmailAppearance } from "@peanut/utils";

export const emailLogoAssetId = (config: any) =>
  config.email?.logoAssetId || config.assets?.logoLight;
export const emailLogoVariant = (config: any) =>
  `email-${String(config.light?.surface || "#FFFFFF").toLowerCase()}`;

export async function publishedEmailAppearance(
  db: any,
  workspaceId: string,
): Promise<BillingEmailAppearance | null> {
  if (!db.workspaceVisualSettings?.findUnique) return null;
  const row = await db.workspaceVisualSettings.findUnique({
    where: { workspaceId },
  });
  const config = row?.published;
  if (!config?.email?.enabled) return null;
  const sourceAssetId = emailLogoAssetId(config);
  const logo = sourceAssetId
    ? await db.publicBrandAsset.findFirst({
        where: {
          workspaceId,
          sourceAssetId,
          variant: emailLogoVariant(config),
          publishedAt: { not: null },
        },
      })
    : null;
  if (sourceAssetId && !logo)
    throw new Error(
      "A logo pública do email está indisponível. Aplique novamente a identidade da empresa.",
    );
  return emailAppearance(
    config,
    logo
      ? {
          url: publicBrandAssetUrl(logo),
          width: logo.width,
          height: logo.height,
        }
      : null,
  );
}

export function emailAppearance(
  config: any,
  logo: { url: string; width: number; height: number } | null,
): BillingEmailAppearance {
  return {
    name: config.name,
    subtitle: config.email.showSubtitle ? config.subtitle : "",
    logoUrl: logo?.url || null,
    logoWidth: config.email.logoWidth,
    logoHeight: logo
      ? Math.round((config.email.logoWidth * logo.height) / logo.width)
      : 0,
    alignment: config.email.alignment,
    padding: config.email.padding,
    canvas: config.light.canvas,
    surface: config.light.surface,
    text: config.light.text,
    muted: config.light.muted,
    accent: config.light.action,
    onAccent: config.light.onAction,
  };
}

/** Existing image URLs remain valid for frozen messages, even after a rebrand. */
export async function resolveEmailImages(
  db: any,
  workspaceId: string,
  body: string,
) {
  const refs = emailImageReferences(body);
  if (!refs.length) return {} as Record<string, string>;
  const rows = await db.publicBrandAsset.findMany({
    where: { workspaceId, publishedAt: { not: null } },
  });
  const allowed = new Set(rows.map((r: any) => publicBrandAssetUrl(r)));
  const images: Record<string, string> = {};
  for (const ref of refs) {
    if (!allowed.has(ref.url))
      throw new Error(
        "Selecione uma imagem pública da biblioteca desta empresa para o email.",
      );
    images[ref.url] = ref.url;
  }
  return images;
}

export async function publishedEmailImages(db: any, workspaceId: string) {
  const settings = await db.workspaceVisualSettings.findUnique({
    where: { workspaceId },
  });
  const config = settings?.published as any;
  if (!config?.email?.enabled) return [];
  const ids = [
    ...new Set(
      [emailLogoAssetId(config), ...(config.email.imageAssetIds || [])].filter(
        Boolean,
      ),
    ),
  ];
  const [rows, originals] = await Promise.all([
    db.publicBrandAsset.findMany({
      where: {
        workspaceId,
        sourceAssetId: { in: ids },
        publishedAt: { not: null },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.brandAsset.findMany({
      where: { workspaceId, id: { in: ids } },
      select: { id: true, title: true },
    }),
  ]);
  return ids
    .map((id) => {
      const row = rows.find(
        (r: any) =>
          r.sourceAssetId === id &&
          r.variant ===
            (id === emailLogoAssetId(config)
              ? emailLogoVariant(config)
              : "image"),
      );
      return row
        ? {
            id: row.id,
            sourceAssetId: id,
            title:
              originals.find((a: any) => a.id === id)?.title ||
              "Imagem da empresa",
            url: publicBrandAssetUrl(row),
            width: row.width,
            height: row.height,
          }
        : null;
    })
    .filter(Boolean);
}

export async function renderWorkspaceBillingEmail(
  db: any,
  workspaceId: string,
  template: BillingEmailContent & Record<string, any>,
  values: Record<string, string>,
) {
  if (template.rendered) return template.rendered;
  const content = validateBillingEmail(template);
  const appearance = Object.prototype.hasOwnProperty.call(
    template,
    "appearance",
  )
    ? template.appearance
    : await publishedEmailAppearance(db, workspaceId);
  const images =
    template.emailImages ||
    (await resolveEmailImages(db, workspaceId, content.body));
  return renderBillingEmail(content, values, appearance, images);
}
