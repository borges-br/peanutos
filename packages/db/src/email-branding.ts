import {
  publicBrandAssetUrl,
  emailImageReferences,
  renderBillingEmail,
  validateBillingEmail,
  publicBrandOrigin, PRODUCT_BRAND_ROOT,
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
  if (!config) {
    const ws = await db.workspace?.findUnique({where:{id:workspaceId},select:{brandName:true,logoFileObjectId:true}});
    if (!ws || ws.logoFileObjectId || (ws.brandName && !["Peanut OS","PeanutOS"].includes(ws.brandName))) return null;
    return emailAppearance({ name:"Peanut OS",subtitle:"Seu trabalho, conectado.",media:{productIdentity:true},
      email:{showSubtitle:true,logoWidth:220,alignment:"left",padding:28},
      light:{canvas:"#F1F4FA",surface:"#FFFFFF",text:"#14233D",muted:"#52617A",action:"#304FD0",onAction:"#FFFFFF"},
    },null);
  }
  if (!config.email?.enabled) return null;
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
    logoUrl: logo?.url || (config.media?.productIdentity ? `${publicBrandOrigin()}${PRODUCT_BRAND_ROOT}/logo-light.png` : null),
    logoWidth: config.email.logoWidth,
    logoHeight: logo
      ? Math.round((config.email.logoWidth * logo.height) / logo.width)
      : config.media?.productIdentity ? Math.round(config.email.logoWidth * 95 / 492) : 0,
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
  actorUserId?: string,
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
  const signature = Object.prototype.hasOwnProperty.call(template, "signature") ? template.signature : await resolveUserEmailSignature(db, workspaceId, actorUserId);
  return renderBillingEmail(content, values, appearance, images, signature);
}


/** Only an explicitly identified sender in this workspace can supply a signature. */
export async function resolveUserEmailSignature(db: any, workspaceId: string, userId?: string, override?: any) {
  if (!userId || !db.user?.findFirst) return null;
  const user = await db.user.findFirst({ where: { id: userId, workspaceId, status: 'ACTIVE', deletedAt: null }, select: { name: true, email: true, jobTitle: true, phone: true, role: true, emailSignature: true } });
  if (!user || !['OWNER','ADMIN','FINANCIAL'].includes(user.role)) return null;
  const config = override ?? user.emailSignature;
  if (!config?.enabled) return null;
  let logoUrl: string | null = null;
  if (config.showLogo) {
    const settings = await db.workspaceVisualSettings.findUnique({where:{workspaceId}});
    const brand = settings?.published;
    const iconId = brand?.assets?.iconLight;
    if (iconId) {
      const image = await db.publicBrandAsset.findFirst({where:{workspaceId,sourceAssetId:iconId,variant:'image',publishedAt:{not:null}}});
      if (image) logoUrl = publicBrandAssetUrl(image);
    }
  }
  return {displayName:config.displayName,jobTitle:config.jobTitle,company:config.company,email:config.email,phone:config.phone,whatsapp:config.whatsapp,website:config.website,address:config.address,registration:config.registration,logoUrl};
}
