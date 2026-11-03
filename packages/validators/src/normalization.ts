import {
  AsYouType,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { z } from "zod";

export type InputMask =
  | "text"
  | "email"
  | "phone"
  | "cpf"
  | "cnpj"
  | "document"
  | "taxId"
  | "cep"
  | "address"
  | "website"
  | "mac"
  | "hostname"
  | "ip";

export const normalizeText = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ");
export const normalizeEmail = (value: string) => value.trim().toLowerCase();

// A leading + or 00 explicitly selects an international country code. National
// numbers (including DDD 55) use Brazil; 12/13 digits starting with 55 include DDI.
export function phoneInput(
  value: string,
  defaultCountry: string = "BR",
): string {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("00")) return "+" + raw.slice(2).replace(/\D/g, "");
  if (raw.startsWith("+")) return "+" + raw.slice(1).replace(/\D/g, "");
  const digits = raw.replace(/\D/g, "");
  if (defaultCountry !== "BR") return digits;
  if (digits.startsWith("55") && digits.length >= 12) return "+" + digits;
  return "+55" + digits;
}

export function normalizePhone(
  value: string | null | undefined,
  defaultCountry: string = "BR",
): string | null {
  if (!value?.trim()) return null;
  // Do not turn an invalid value (letters, extensions, etc.) into a different phone.
  if (!/^(?:\+|00)?[\d\s().-]+$/.test(value.trim())) return value.trim();
  const candidate = phoneInput(value, defaultCountry);
  const parsed = parsePhoneNumberFromString(
    candidate,
    defaultCountry as CountryCode,
  );
  return parsed?.isValid() ? parsed.number : candidate;
}

export function maskPhone(value: string): string {
  // Let a user type the international 00 prefix before inserting the BR DDI.
  if (value.trim() === "0") return "0";
  const candidate = phoneInput(value);
  if (!candidate) return "";
  if (!candidate.startsWith("+55")) return new AsYouType().input(candidate);
  const national = candidate.slice(3);
  if (!national) return "+55";
  const area = national.slice(0, 2);
  if (national.length <= 2) return `+55 (${area}`;
  const subscriber = national.slice(2);
  const group = subscriber.length > 8 ? 5 : 4;
  return `+55 (${area}) ${subscriber.slice(0, group)}${subscriber.length > group ? "-" + subscriber.slice(group) : ""}`;
}

function pattern(value: string, template: string): string {
  const digits = value.replace(/\D/g, "");
  let output = "",
    cursor = 0;
  for (const char of template) {
    if (cursor >= digits.length) break;
    output += char === "#" ? digits[cursor++] : char;
  }
  return output + digits.slice(cursor);
}

export function normalizeWebsite(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    // Keep path/query casing; only the URL parser canonicalizes the host.
    return url.toString();
  } catch {
    return candidate;
  }
}

export function normalizeAddress(value: string): string {
  return normalizeText(value).replace(/\b(\d{5})[ -]?(\d{3})\b/g, "$1-$2");
}

export function maskInput(
  value: string,
  mask: InputMask,
  finalize = false,
): string {
  switch (mask) {
    case "phone":
      return maskPhone(value);
    case "email":
      return value.replace(/\s/g, "").toLowerCase();
    case "cpf":
      return pattern(value, "###.###.###-##");
    case "cnpj":
      return pattern(value, "##.###.###/####-##");
    case "taxId":
      return /[a-z]/i.test(value)
        ? value.toUpperCase()
        : pattern(
            value,
            value.replace(/\D/g, "").length <= 11
              ? "###.###.###-##"
              : "##.###.###/####-##",
          );
    case "document":
      return pattern(
        value,
        value.replace(/\D/g, "").length <= 11
          ? "###.###.###-##"
          : "##.###.###/####-##",
      );
    case "cep":
      return pattern(value, "#####-###");
    case "mac":
      return (
        value
          .replace(/[^a-f\d]/gi, "")
          .toUpperCase()
          .match(/.{1,2}/g)
          ?.join(":") || ""
      );
    case "hostname":
      return value.replace(/\s/g, "").toLowerCase();
    case "ip":
      return value.replace(/\s/g, "").toLowerCase();
    case "address":
      return finalize
        ? normalizeAddress(value)
        : value.replace(/\b(\d{5})[ -]?(\d{3})\b/g, "$1-$2");
    case "website":
      return finalize ? normalizeWebsite(value) : value.replace(/\s/g, "");
    default:
      return finalize ? normalizeText(value) : value;
  }
}

export const emailValueSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "E-mail inválido" });
export const phoneValueSchema = z
  .string()
  .transform((v) => normalizePhone(v) || "")
  .pipe(
    z
      .string()
      .refine(
        (v) =>
          !v ||
          (/^\+\d{7,15}$/.test(v) &&
            !!parsePhoneNumberFromString(v)?.isValid()),
        "Telefone inválido. Informe DDD e número; para outro país use +DDI.",
      ),
  );
export const textValueSchema = z.string().transform(normalizeText);
export const addressValueSchema = z.string().transform(normalizeAddress);
export const websiteValueSchema = z
  .string()
  .transform(normalizeWebsite)
  .pipe(
    z.string().url({ message: "URL do website inválida" }).or(z.literal("")),
  )
  .refine(
    (value) => !value || /^https?:\/\//i.test(value),
    "Use uma URL HTTP ou HTTPS.",
  );
export const documentValueSchema = z
  .string()
  .trim()
  .transform((v) => (/^[\d\s./-]*$/.test(v) ? v.replace(/\D/g, "") : v));
export const macValueSchema = z
  .string()
  .trim()
  .transform(
    (v) =>
      v
        .replace(/[.:-]/g, "")
        .toUpperCase()
        .match(/.{1,2}/g)
        ?.join(":") || "",
  )
  .pipe(
    z
      .string()
      .regex(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/, "Endereço MAC inválido")
      .or(z.literal("")),
  );
export const ipValueSchema = z
  .string()
  .trim()
  .toLowerCase()
  .ip({ message: "Endereço IP inválido" })
  .or(z.literal(""));
export const hostnameValueSchema = z.string().trim().toLowerCase();
