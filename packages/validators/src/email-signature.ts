import { z } from "zod";
const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "Use uma linha de texto.");
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
    email: z.string().trim().email().max(254).or(z.literal("")),
    phone: line(40),
    whatsapp: line(40),
    website: z
      .string()
      .trim()
      .max(255)
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
    address: line(400),
    registration: line(80),
  })
  .strict();
export type EmailSignatureConfig = z.infer<typeof emailSignatureSchema>;
