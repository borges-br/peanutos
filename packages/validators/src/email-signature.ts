import { z } from "zod";
import { normalizeText, normalizeAddress, normalizeWebsite, emailValueSchema, phoneValueSchema } from './normalization';
const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "Use uma linha de texto.")
    .transform(normalizeText);
export const emailSignatureSchema = z
  .object({
    enabled: z.boolean(),
    showLogo: z.boolean(),
    displayName: line(150).refine(
      (v) => v.length > 0,
      "Informe o nome na assinatura.",
    ),
    jobTitle: line(150),
    company: line(150),
    email: emailValueSchema.max(254).or(z.literal("")),
    phone: phoneValueSchema,
    whatsapp: phoneValueSchema,
    website: z
      .string()
      .trim()
      .max(255)
      .transform(normalizeWebsite)
      .refine(
        (v) =>
          !v ||
          (() => {
            try {
              const u = new URL(v);
              return u.protocol === "https:" && !u.username && !u.password;
            } catch {
              return false;
            }
          })(),
        "Use uma URL HTTPS válida.",
      ),
    address: line(400).transform(normalizeAddress),
    registration: line(80),
  })
  .strict();
export type EmailSignatureConfig = z.infer<typeof emailSignatureSchema>;
