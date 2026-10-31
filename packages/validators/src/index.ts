import { cpf, cnpj } from 'cpf-cnpj-validator';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { z } from 'zod';
export * from './branding';

export type ClientTypeInput = 'LEGAL_PERSON' | 'NATURAL_PERSON';

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

export function onlyDigits(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '');
}

export function normalizeCpfCnpj(value: string | null | undefined): string | null {
  const digits = onlyDigits(value);
  return digits || null;
}

export function formatCpfCnpj(value: string | null | undefined): string {
  const digits = onlyDigits(value);
  if (digits.length === 11) return cpf.format(digits);
  if (digits.length === 14) return cnpj.format(digits);
  return value || '';
}

export function isValidCpfCnpj(
  value: string | null | undefined,
  clientType?: ClientTypeInput,
): boolean {
  const digits = onlyDigits(value);
  if (!digits) return true;
  if (clientType === 'NATURAL_PERSON') return digits.length === 11 && cpf.isValid(digits);
  if (clientType === 'LEGAL_PERSON') return digits.length === 14 && cnpj.isValid(digits);
  if (digits.length === 11) return cpf.isValid(digits);
  if (digits.length === 14) return cnpj.isValid(digits);
  return false;
}

export function normalizePhone(
  value: string | null | undefined,
  defaultCountry: string = 'BR',
): string | null {
  if (!value || !value.trim()) return null;
  const parsed = parsePhoneNumberFromString(value.trim(), defaultCountry as CountryCode);
  if (parsed?.isValid()) return parsed.number;
  const digits = onlyDigits(value);
  return digits || null;
}

export function formatPhoneNumber(
  value: string | null | undefined,
  defaultCountry: string = 'BR',
): string {
  if (!value) return '';
  const parsed = parsePhoneNumberFromString(value, defaultCountry as CountryCode);
  if (parsed?.isValid()) return parsed.formatNational();

  const digits = onlyDigits(value);
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return digits.replace(/^55(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return value;
}

const nullableTrimmedString = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max).optional().nullable(),
  );

const nullableEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().email({ message: 'E-mail invalido' }).max(150).optional().nullable(),
);

const nullableDocument = z.preprocess(
  (value) => {
    const digits = normalizeCpfCnpj(typeof value === 'string' ? value : undefined);
    return digits || undefined;
  },
  z.string().max(20).optional().nullable(),
);

const nullablePhone = z.preprocess(
  (value) => {
    const normalized = normalizePhone(typeof value === 'string' ? value : undefined);
    return normalized || undefined;
  },
  z.string().max(30).optional().nullable(),
);

const nullableClientId = z.preprocess(
  emptyToUndefined,
  z.string().uuid({ message: 'ID do cliente invalido' }).optional().nullable(),
);

const adHocClientName = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(2, { message: 'Informe o nome do cliente' }).max(200).optional().nullable(),
);

const commercialClientFields = {
  clientId: nullableClientId,
  clientName: adHocClientName,
  clientDocument: nullableDocument,
  clientEmail: nullableEmail,
  clientPhone: nullablePhone,
};

const requireCommercialClient = (data: { clientId?: string | null; clientName?: string | null }, ctx: z.RefinementCtx) => {
  if (!data.clientId && !data.clientName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clientName'],
      message: 'Selecione um cliente cadastrado ou informe o nome do cliente.',
    });
  }
};

// Login Validation Schema
export const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Client Validation Schema
export const clientTypeSchema = z.enum(['LEGAL_PERSON', 'NATURAL_PERSON']);

const clientBaseSchema = z.object({
    type: clientTypeSchema.default('LEGAL_PERSON'),
    legalName: z.string().trim().min(2, { message: 'Nome do cliente e obrigatorio' }).max(200),
    tradeName: nullableTrimmedString(200),
    document: nullableDocument,
    email: nullableEmail,
    phone: nullablePhone,
    website: z.preprocess(emptyToUndefined, z.string().url().max(255).optional().nullable()),
    notes: z.string().optional().nullable(),
    slaPolicyId: z.string().uuid({ message: 'ID de SLA inválido' }).optional().nullable(),
  });

const refineClientDocument = (data: { document?: string | null; type?: ClientTypeInput }, ctx: z.RefinementCtx) => {
  if (!isValidCpfCnpj(data.document, data.type || 'LEGAL_PERSON')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['document'],
      message: data.type === 'NATURAL_PERSON' ? 'CPF invalido' : 'CNPJ invalido',
    });
  }
};

const normalizeClientPayload = <T extends {
  type?: ClientTypeInput;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  slaPolicyId?: string | null;
}>(data: T) => ({
  ...data,
  tradeName: data.type === 'NATURAL_PERSON' ? null : data.tradeName || null,
  document: data.document || null,
  email: data.email || null,
  phone: data.phone || null,
  website: data.website || null,
  notes: data.notes || null,
  slaPolicyId: data.slaPolicyId || null,
});

const normalizeClientUpdatePayload = <T extends {
  type?: ClientTypeInput;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  slaPolicyId?: string | null;
}>(data: T) => {
  const next: any = { ...data };
  if (data.type === 'NATURAL_PERSON') next.tradeName = null;
  for (const field of ['tradeName', 'document', 'email', 'phone', 'website', 'notes', 'slaPolicyId']) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      next[field] = (data as any)[field] || null;
    }
  }
  return next;
};

export const clientSchema = clientBaseSchema
  .superRefine((data, ctx) => {
    refineClientDocument(data, ctx);
  })
  .transform(normalizeClientPayload);

export type ClientInput = z.infer<typeof clientSchema>;

export const clientUpdateSchema = clientBaseSchema.partial()
  .superRefine((data, ctx) => {
    refineClientDocument(data, ctx);
  })
  .transform(normalizeClientUpdatePayload);

export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;

// Asset Validation Schema
export const assetSchema = z.object({
  name: z.string().min(2, { message: 'Nome do ativo é obrigatório' }),
  hostname: z.string().optional().or(z.literal('')),
  type: z.enum([
    'WORKSTATION',
    'NOTEBOOK',
    'SERVER',
    'PRINTER',
    'ROUTER',
    'SWITCH',
    'ACCESS_POINT',
    'CAMERA',
    'NVR',
    'UPS',
    'RACK',
    'LICENSE',
    'CLOUD_SERVICE',
    'VPN',
    'STORAGE',
    'OTHER',
  ]),
  status: z.enum([
    'OPERATIONAL',
    'MAINTENANCE',
    'IN_MAINTENANCE',
    'OUT_OF_STANDARD',
    'STOCK',
    'RETIRED',
    'SCRAPPED',
    'LOST',
    'PENDING_VALIDATION',
  ]),
  serialNumber: z.string().optional().or(z.literal('')),
  assetTag: z.string().optional().or(z.literal('')),
  operatingSystem: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type AssetInput = z.infer<typeof assetSchema>;

// Ticket Validation Schema
const ticketPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'] as const;
const ticketStatuses = ['OPEN', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CLOSED', 'CANCELLED'] as const;
const ticketChannels = ['WHATSAPP', 'EMAIL', 'PHONE', 'PORTAL', 'MANUAL', 'OTHER'] as const;

export const ticketSchema = z.object({
  title: z.string().min(5, { message: 'O título do chamado deve ter pelo menos 5 caracteres' }),
  description: z.string().min(10, { message: 'A descrição detalhada do chamado deve ter pelo menos 10 caracteres' }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']),
  clientId: z.string().uuid({ message: 'Cliente inválido' }),
  assetId: z.string().uuid().optional().nullable(),
  clientUserId: z.string().uuid().optional().nullable(),
});

export type TicketInput = z.infer<typeof ticketSchema>;

export const ticketCreateSchema = z.object({
  title: z.string().min(5, { message: 'O título do chamado deve ter pelo menos 5 caracteres' }),
  description: z.string().min(10, { message: 'A descrição detalhada do chamado deve ter pelo menos 10 caracteres' }),
  priority: z.enum(ticketPriorities),
  channel: z.enum(ticketChannels).default('EMAIL'),
  clientId: z.string().uuid({ message: 'Cliente inválido' }),
  contactId: z.string().uuid({ message: 'Contato inválido' }).optional().nullable(),
  clientUserId: z.string().uuid({ message: 'Usuário final inválido' }).optional().nullable(),
  assetId: z.string().uuid({ message: 'Ativo inválido' }).optional().nullable(),
  assignedToId: z.string().uuid({ message: 'Técnico designado inválido' }).optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;

export const ticketUpdateSchema = ticketCreateSchema.partial();

export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;

export const ticketStatusUpdateSchema = z.object({
  status: z.enum(ticketStatuses),
});

export type TicketStatusUpdateInput = z.infer<typeof ticketStatusUpdateSchema>;

export const ticketAssignSchema = z.object({
  assignedToId: z.string().uuid({ message: 'ID de técnico designado inválido' }).nullable(),
});

export type TicketAssignInput = z.infer<typeof ticketAssignSchema>;

export const ticketCommentCreateSchema = z.object({
  content: z.string().min(1, { message: 'O comentário não pode ser vazio' }),
  visibility: z.enum(['INTERNAL', 'CLIENT_VISIBLE_FUTURE']).default('INTERNAL'),
});

export type TicketCommentCreateInput = z.infer<typeof ticketCommentCreateSchema>;

export const ticketTimeEntryCreateSchema = z.object({
  startedAt: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de início inválida' }),
  endedAt: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de término inválida' }).optional().nullable().or(z.literal('')),
  description: z.string().min(3, { message: 'A descrição deve ter pelo menos 3 caracteres' }),
  billable: z.boolean().default(true),
});

export type TicketTimeEntryCreateInput = z.infer<typeof ticketTimeEntryCreateSchema>;

export const ticketCategoryCreateSchema = z.object({
  name: z.string().trim().min(2, { message: 'A categoria deve ter pelo menos 2 caracteres' }).max(100),
});

export type TicketCategoryCreateInput = z.infer<typeof ticketCategoryCreateSchema>;

export const slaPolicyCreateSchema = z.object({
  name: z.string().min(3, { message: 'O nome da política de SLA deve ter pelo menos 3 caracteres' }),
  description: z.string().optional().nullable(),
  priority: z.enum(ticketPriorities),
  firstResponseMinutes: z.coerce.number().int().min(1, { message: 'Tempo de primeira resposta deve ser de pelo menos 1 minuto' }),
  startMinutes: z.coerce.number().int().min(1, { message: 'Tempo de início deve ser de pelo menos 1 minuto' }),
  resolutionMinutes: z.coerce.number().int().min(1, { message: 'Tempo de resolução deve ser de pelo menos 1 minuto' }),
  businessHoursOnly: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type SlaPolicyCreateInput = z.infer<typeof slaPolicyCreateSchema>;

export const slaPolicyUpdateSchema = slaPolicyCreateSchema.partial();

export type SlaPolicyUpdateInput = z.infer<typeof slaPolicyUpdateSchema>;

// User Validation Schema
export const userSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres' }).optional().or(z.literal('')),
  role: z.enum(['OWNER', 'ADMIN', 'TECHNICIAN', 'FINANCIAL', 'READ_ONLY']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export type UserInput = z.infer<typeof userSchema>;

// Client Contact Validation Schema
export const clientContactSchema = z.object({
  name: z.string().min(2, { message: 'Nome é obrigatório' }),
  email: z.string().email({ message: 'E-mail inválido' }),
  phone: z.string().optional().nullable().or(z.literal('')),
  mobile: z.string().optional().nullable().or(z.literal('')),
  role: z.string().optional().nullable().or(z.literal('')),
  department: z.string().optional().nullable().or(z.literal('')),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional().nullable().or(z.literal('')),
});

export type ClientContactInput = z.infer<typeof clientContactSchema>;

// Client User Creation Schema
export const clientUserCreateSchema = z.object({
  fullName: z.string().min(2, { message: 'Nome completo é obrigatório' }),
  email: z.string().email({ message: 'E-mail inválido' }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  jobTitle: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'PENDING_REVIEW']).default('ACTIVE'),
  notes: z.string().optional().or(z.literal('')),
});

export type ClientUserCreateInput = z.infer<typeof clientUserCreateSchema>;

// Client User Update Schema
export const clientUserUpdateSchema = clientUserCreateSchema.partial();

export type ClientUserUpdateInput = z.infer<typeof clientUserUpdateSchema>;

// Client User Status Update Schema
export const clientUserStatusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'PENDING_REVIEW']),
});

export type ClientUserStatusUpdateInput = z.infer<typeof clientUserStatusUpdateSchema>;

// Asset Type & Status validation constants
const assetTypes = [
  'WORKSTATION',
  'NOTEBOOK',
  'SERVER',
  'PRINTER',
  'ROUTER',
  'SWITCH',
  'ACCESS_POINT',
  'FIREWALL',
  'CAMERA',
  'NVR',
  'UPS',
  'RACK',
  'NAS',
  'MOBILE_DEVICE',
  'VIRTUAL_MACHINE',
  'CLOUD_SERVICE',
  'LICENSE',
  'SOFTWARE_LICENSE',
  'VPN',
  'STORAGE',
  'OTHER',
] as const;

const assetStatuses = [
  'OPERATIONAL',
  'MAINTENANCE',
  'IN_MAINTENANCE',
  'OUT_OF_STANDARD',
  'STOCK',
  'IN_STOCK',
  'RETIRED',
  'SCRAPPED',
  'LOST',
  'PENDING_VALIDATION',
  'PENDING_REVIEW',
] as const;

// Asset Create Schema
export const assetCreateSchema = z.object({
  name: z.string().min(2, { message: 'Nome do ativo é obrigatório' }),
  hostname: z.string().optional().or(z.literal('')),
  type: z.enum(assetTypes),
  status: z.enum(assetStatuses),
  manufacturer: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  serialNumber: z.string().optional().or(z.literal('')),
  assetTag: z.string().optional().or(z.literal('')),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, { message: 'Endereço MAC inválido' }).optional().or(z.literal('')),
  ipAddress: z.string().ip({ message: 'Endereço IP inválido' }).optional().or(z.literal('')),
  operatingSystem: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  remoteAccessId: z.string().optional().or(z.literal('')),
  sensitiveDataEncrypted: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  assignedClientUserId: z.string().uuid().optional().nullable(),
});

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;

// Asset Update Schema
export const assetUpdateSchema = assetCreateSchema.partial();

export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;

// Asset Status Update Schema
export const assetStatusUpdateSchema = z.object({
  status: z.enum(assetStatuses),
});

export type AssetStatusUpdateInput = z.infer<typeof assetStatusUpdateSchema>;

// Asset Assignment Schema
export const assetAssignmentSchema = z.object({
  clientUserId: z.string().uuid({ message: 'ID do usuário inválido' }).optional().nullable(),
});

export type AssetAssignmentInput = z.infer<typeof assetAssignmentSchema>;

// Asset Note Create Schema
export const assetNoteCreateSchema = z.object({
  content: z.string().min(1, { message: 'O conteúdo da nota é obrigatório' }),
  visibility: z.enum(['INTERNAL', 'CLIENT_VISIBLE_FUTURE']).default('INTERNAL'),
});

export type AssetNoteCreateInput = z.infer<typeof assetNoteCreateSchema>;

// Sensitive Data Schema (e.g. decrypted keys)
export const sensitiveDataSchema = z.object({
  remoteAccessNotes: z.string().optional().or(z.literal('')),
  vpnNotes: z.string().optional().or(z.literal('')),
  managementUrl: z.string().optional().or(z.literal('')),
});

export type SensitiveDataInput = z.infer<typeof sensitiveDataSchema>;

// --- CONTRACTS VALIDATORS ---

const contractStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED', 'TERMINATED']);
const contractTypeEnum = z.enum(['RECURRING_SUPPORT', 'PROJECT', 'ON_DEMAND', 'HYBRID']);
const renewalModeEnum = z.enum(['NONE', 'MONTHLY', 'ANNUAL', 'MANUAL']);
const contractLineItemTypeEnum = z.enum(['SERVICE', 'LICENSE', 'STORAGE', 'SUPPORT', 'MONITORING', 'BACKUP', 'OTHER']);
const billingScheduleStatusEnum = z.enum(['PENDING', 'DRAFT_READY', 'SKIPPED', 'CANCELLED', 'GENERATED_FUTURE_INVOICE']);

const contractBaseSchema = z.object({
  title: z.string().min(3, { message: 'O título do contrato deve ter pelo menos 3 caracteres' }),
  clientId: z.string().uuid({ message: 'ID do cliente inválido' }),
  number: z.string().optional().or(z.literal('')),
  status: contractStatusEnum.default('DRAFT'),
  type: contractTypeEnum,
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de início inválida' }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de término inválida' }).optional().nullable().or(z.literal('')),
  renewalMode: renewalModeEnum.default('MONTHLY'),
  billingDay: z.number().int().min(1).max(31, { message: 'Dia de vencimento deve estar entre 1 e 31' }).default(5),
  monthlyAmountCents: z.number().int().min(0, { message: 'Valor mensal deve ser maior ou igual a zero' }).default(0),
  billingIssueDay: z.number().int().min(1).max(31).optional().nullable(),
  billingIssueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário de emissão inválido').default('09:00'),
  billingAutoIssue: z.boolean().default(false),
  billingAutoEmail: z.boolean().default(false),
  billingEmailRecipients: z.array(z.string().trim().email().max(254)).max(50).default([]),
  billingWhatsappNumbers: z.array(z.string().regex(/^\d{10,15}$/, 'Use telefone com código do país e somente números')).max(30).default([]),
  billingPaymentMethod: z.enum(['PIX', 'TRANSFER', 'CASH', 'OTHER']).default('PIX'),
  gatewayBillingType: z.enum(['PIX', 'BOLETO']).optional(),
  billingEmailTemplateId: z.string().uuid().optional().nullable(),
  billingPixKey: z.string().max(100).optional().nullable(),
  currency: z.string().length(3, { message: 'A moeda deve ter exatamente 3 caracteres (ex: BRL)' }).default('BRL'),
  slaPolicyId: z.string().uuid({ message: 'ID de SLA inválido' }).optional().nullable(),
  maxUsers: z.number().int().min(0).optional().nullable(),
  maxAssets: z.number().int().min(0).optional().nullable(),
  includedRemoteTickets: z.number().int().min(0).optional().nullable(),
  includedOnsiteVisits: z.number().int().min(0).optional().nullable(),
  includedRemoteHours: z.number().int().min(0).optional().nullable(),
  includedOnsiteHours: z.number().int().min(0).optional().nullable(),
  description: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
});

export const contractCreateSchema = contractBaseSchema.refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'A data de término não pode ser anterior à data de início',
  path: ['endDate'],
});

export type ContractCreateInput = z.infer<typeof contractCreateSchema>;

export const contractUpdateSchema = contractBaseSchema.partial().refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'A data de término não pode ser anterior à data de início',
  path: ['endDate'],
});

export type ContractUpdateInput = z.infer<typeof contractUpdateSchema>;

export const contractStatusUpdateSchema = z.object({
  status: contractStatusEnum,
});

export type ContractStatusUpdateInput = z.infer<typeof contractStatusUpdateSchema>;

export const contractLineItemCreateSchema = z.object({
  description: z.string().min(2, { message: 'A descrição do item deve ter pelo menos 2 caracteres' }),
  itemType: contractLineItemTypeEnum,
  quantity: z.number().positive({ message: 'A quantidade deve ser um número positivo' }),
  unitPriceCents: z.number().int().min(0, { message: 'O valor unitário deve ser maior ou igual a zero' }),
  recurring: z.boolean().default(true),
  billingRole: z.enum(['BASE', 'ADDON', 'ONE_OFF']).default('BASE'),
  servicePeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês do serviço inválido').optional().nullable(),
  chargePeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês da cobrança inválido').optional().nullable(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início inválida').optional().nullable(),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de término inválida').optional().nullable(),
  endMode: z.enum(['OPEN', 'CONTRACT', 'DATE']).default('CONTRACT'),
  proration: z.enum(['NONE', 'DAILY']).default('NONE'),
});

export type ContractLineItemCreateInput = z.infer<typeof contractLineItemCreateSchema>;

export const contractLineItemUpdateSchema = contractLineItemCreateSchema.partial();

export type ContractLineItemUpdateInput = z.infer<typeof contractLineItemUpdateSchema>;

export const billingScheduleQuerySchema = z.object({
  status: billingScheduleStatusEnum.optional(),
  contractId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
});

export type BillingScheduleQueryInput = z.infer<typeof billingScheduleQuerySchema>;

// --- AUDIT VALIDATORS ---

export const auditSeverityEnum = z.enum(['INFO', 'WARN', 'SECURITY_ALERT']);

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().nullable(),
  entityType: z.string().optional().nullable(),
  action: z.string().optional().nullable(),
  severity: auditSeverityEnum.optional().nullable(),
  actorUserId: z.string().uuid().optional().nullable(),
  dateFrom: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data inválida' }).optional().nullable().or(z.literal('')),
  dateTo: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data inválida' }).optional().nullable().or(z.literal('')),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;

// --- INVOICES VALIDATORS ---

export const invoiceStatusEnum = z.enum(["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;

export const invoiceItemTypeEnum = z.enum(["SERVICE", "MATERIAL"]);
export type InvoiceItemType = z.infer<typeof invoiceItemTypeEnum>;

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().nullable(),
  status: invoiceStatusEnum.optional().nullable(),
  clientId: z.string().uuid({ message: 'ID do cliente inválido' }).optional().nullable(),
});
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;

export const invoiceItemCreateSchema = z.object({
  type: invoiceItemTypeEnum.default("SERVICE"),
  description: z.string().min(2, { message: 'A descrição deve ter pelo menos 2 caracteres' }),
  quantity: z.coerce.number().positive({ message: 'A quantidade deve ser positiva' }),
  unit: z.string().min(1).max(20).default("UN"),
  unitPrice: z.coerce.number().min(0, { message: 'O valor unitário deve ser maior ou igual a zero' }),
  unitCost: z.coerce.number().min(0, { message: 'O custo unitário deve ser maior ou igual a zero' }).optional().default(0),
  totalPrice: z.coerce.number().min(0).optional().nullable(),
  totalCost: z.coerce.number().min(0).optional().nullable(),
  billingKind: z.enum(['BASE', 'RECURRING', 'EXTRA']).optional().nullable(),
  sourceContractLineItemId: z.string().uuid().optional().nullable(),
  sourceTicketId: z.string().uuid().optional().nullable(),
  sourceServiceOrderId: z.string().uuid().optional().nullable(),
});
export type InvoiceItemCreateInput = z.infer<typeof invoiceItemCreateSchema>;

export const invoiceCreateSchema = z.object({
  ...commercialClientFields,
  quoteId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  ticketId: z.string().uuid().optional().nullable(),
  number: z.string().optional().nullable(),
  status: invoiceStatusEnum.default("DRAFT"),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de emissão inválida' }).optional().nullable(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de vencimento inválida' }),
  paymentMethod: z.enum(["PIX", "TRANSFER", "CASH", "OTHER"]).default("PIX"),
  pixKey: z.string().optional().nullable(),
  discountAmount: z.coerce.number().min(0, { message: 'O desconto deve ser maior ou igual a zero' }).default(0),
  discountReason: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  items: z.array(invoiceItemCreateSchema).min(1, { message: 'A fatura deve ter pelo menos 1 item' }),
}).superRefine(requireCommercialClient);
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;

export const invoiceUpdateSchema = z.object({
  refreshBase: z.boolean().optional(),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
  emailRecipients: z.array(z.string().trim().email().max(254)).max(50).optional(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de vencimento inválida' }).optional(),
  paymentMethod: z.enum(["PIX", "TRANSFER", "CASH", "OTHER"]).optional(),
  pixKey: z.string().optional().nullable(),
  discountAmount: z.coerce.number().min(0, { message: 'O desconto deve ser maior ou igual a zero' }).optional(),
  discountReason: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  items: z.array(invoiceItemCreateSchema).min(1, { message: 'A fatura deve ter pelo menos 1 item' }).optional(),
});
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

export const invoiceStatusUpdateSchema = z.object({
  status: invoiceStatusEnum,
});
export type InvoiceStatusUpdateInput = z.infer<typeof invoiceStatusUpdateSchema>;

// --- QUOTES VALIDATORS ---

export const quoteStatusEnum = z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "CANCELLED"]);
export type QuoteStatus = z.infer<typeof quoteStatusEnum>;

export const quoteQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().nullable(),
  status: quoteStatusEnum.optional().nullable(),
  clientId: z.string().uuid({ message: 'ID do cliente inválido' }).optional().nullable(),
});
export type QuoteQueryInput = z.infer<typeof quoteQuerySchema>;

export const quoteCreateSchema = z.object({
  ...commercialClientFields,
  number: z.string().optional().nullable(),
  status: quoteStatusEnum.default("DRAFT"),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de emissão inválida' }).optional().nullable(),
  validUntil: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de validade inválida' }),
  discountAmount: z.coerce.number().min(0, { message: 'O desconto deve ser maior ou igual a zero' }).default(0),
  terms: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  items: z.array(invoiceItemCreateSchema).min(1, { message: 'O orçamento deve ter pelo menos 1 item' }),
}).superRefine(requireCommercialClient);
export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

export const quoteUpdateSchema = z.object({
  validUntil: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de validade inválida' }).optional(),
  discountAmount: z.coerce.number().min(0, { message: 'O desconto deve ser maior ou igual a zero' }).optional(),
  terms: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  items: z.array(invoiceItemCreateSchema).min(1, { message: 'O orçamento deve ter pelo menos 1 item' }).optional(),
});
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;

export const quoteStatusUpdateSchema = z.object({
  status: quoteStatusEnum,
});
export type QuoteStatusUpdateInput = z.infer<typeof quoteStatusUpdateSchema>;

// --- SERVICE ORDERS VALIDATORS ---

export const serviceOrderStatusEnum = z.enum(["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export type ServiceOrderStatus = z.infer<typeof serviceOrderStatusEnum>;

export const serviceOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().nullable(),
  status: serviceOrderStatusEnum.optional().nullable(),
  clientId: z.string().uuid({ message: 'ID do cliente inválido' }).optional().nullable(),
  ticketId: z.string().uuid({ message: 'ID do chamado inválido' }).optional().nullable(),
});
export type ServiceOrderQueryInput = z.infer<typeof serviceOrderQuerySchema>;

export const serviceOrderItemCreateSchema = invoiceItemCreateSchema;
export type ServiceOrderItemCreateInput = z.infer<typeof serviceOrderItemCreateSchema>;

const serviceOrderCreateBaseSchema = z.object({
  ...commercialClientFields,
  ticketId: z.string().uuid({ message: 'ID do chamado inválido' }).optional().nullable(),
  contractId: z.string().uuid({ message: 'ID do contrato inválido' }).optional().nullable(),
  responsibleUserId: z.string().uuid({ message: 'ID do responsável inválido' }).optional().nullable(),
  number: z.string().optional().nullable(),
  status: serviceOrderStatusEnum.default("DRAFT"),
  title: z.string().min(3, { message: 'O título da O.S. deve ter pelo menos 3 caracteres' }),
  description: z.string().min(5, { message: 'A descrição da O.S. deve ter pelo menos 5 caracteres' }),
  scheduledFor: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Data de agendamento inválida' }).optional().nullable().or(z.literal('')),
  laborMinutes: z.coerce.number().int().min(0).default(0),
  internalNotes: z.string().optional().nullable(),
  clientNotes: z.string().optional().nullable(),
  items: z.array(serviceOrderItemCreateSchema).default([]),
});

export const serviceOrderCreateSchema = serviceOrderCreateBaseSchema.superRefine(requireCommercialClient);
export type ServiceOrderCreateInput = z.infer<typeof serviceOrderCreateSchema>;

export const serviceOrderUpdateSchema = serviceOrderCreateBaseSchema
  .omit({ clientId: true, clientName: true, clientDocument: true, clientEmail: true, clientPhone: true, number: true, status: true })
  .partial();
export type ServiceOrderUpdateInput = z.infer<typeof serviceOrderUpdateSchema>;

export const serviceOrderStatusUpdateSchema = z.object({
  status: serviceOrderStatusEnum,
});
export type ServiceOrderStatusUpdateInput = z.infer<typeof serviceOrderStatusUpdateSchema>;

// --- WORKSPACE BRAND SETTINGS VALIDATORS ---

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Cor deve ser hexadecimal válido (ex: #1a56db)' }).optional().nullable().or(z.literal(''));

export const workspaceBrandSettingsSchema = z.object({
  brandName: z.string().max(150, { message: 'O nome público deve ter no máximo 150 caracteres' }).optional().nullable().or(z.literal('')),
  brandSubtitle: z.string().max(150, { message: 'O subtítulo da marca deve ter no máximo 150 caracteres' }).optional().nullable().or(z.literal('')),
  legalName: z.string().max(200, { message: 'A razão social deve ter no máximo 200 caracteres' }).optional().nullable().or(z.literal('')),
  companyDocument: z.string().max(30, { message: 'O documento da empresa deve ter no máximo 30 caracteres' }).optional().nullable().or(z.literal('')),
  companyEmail: z.string().email({ message: 'E-mail principal inválido' }).max(150).optional().nullable().or(z.literal('')),
  financialEmail: z.string().email({ message: 'E-mail financeiro inválido' }).max(150).optional().nullable().or(z.literal('')),
  companyPhone: z.string().max(30, { message: 'O telefone deve ter no máximo 30 caracteres' }).optional().nullable().or(z.literal('')),
  companyWebsite: z.string().url({ message: 'URL do website inválida' }).max(255).optional().nullable().or(z.literal('')),
  companyAddress: z.string().max(1000, { message: 'O endereço deve ter no máximo 1000 caracteres' }).optional().nullable().or(z.literal('')),
  primaryColorHex: hexColorSchema,
  documentSecondaryColor: hexColorSchema,
  documentAccentColor: hexColorSchema,
  documentFooterText: z.string().max(2000, { message: 'O rodapé deve ter no máximo 2000 caracteres' }).optional().nullable().or(z.literal('')),
  defaultInvoiceNotes: z.string().max(2000).optional().nullable().or(z.literal('')),
  defaultQuoteTerms: z.string().max(2000).optional().nullable().or(z.literal('')),
  defaultServiceOrderTerms: z.string().max(2000).optional().nullable().or(z.literal('')),
  defaultContractTerms: z.string().max(2000).optional().nullable().or(z.literal('')),
  signatureName: z.string().max(150, { message: 'O nome para assinatura deve ter no máximo 150 caracteres' }).optional().nullable().or(z.literal('')),
});

export type WorkspaceBrandSettingsInput = z.infer<typeof workspaceBrandSettingsSchema>;

// --- FILE UPLOAD VALIDATOR ---

const ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export const uploadImageSchema = z.object({
  data: z.string().min(1, { message: 'Dados do arquivo são obrigatórios' }),
  mimeType: z.enum(ALLOWED_IMAGE_MIMES, { errorMap: () => ({ message: 'Tipo de arquivo não permitido. Use SVG, PNG, JPEG ou WebP' }) }),
  filename: z.string().min(1).max(255),
});

export type UploadImageInput = z.infer<typeof uploadImageSchema>;

// --- USER PROFILE VALIDATORS ---

export const updateUserProfileSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }).max(150).optional(),
  jobTitle: z.string().max(150).optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable().or(z.literal('')),
  documentDisplayName: z.string().max(150).optional().nullable().or(z.literal('')),
  documentSignatureEnabled: z.boolean().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

// --- DOCUMENT TEMPLATE VALIDATORS ---

export const TEMPLATE_DOCUMENT_TYPES = ['INVOICE', 'QUOTE', 'SERVICE_ORDER', 'REPORT'] as const;
export type TemplateDocumentType = typeof TEMPLATE_DOCUMENT_TYPES[number];

export const TEMPLATE_BLOCKS = [
  'header', 'logo', 'companyInfo', 'clientInfo', 'documentTitle',
  'itemsTable', 'financialSummary', 'paymentInfo', 'terms',
  'observations', 'responsibleSignature', 'clientSignature', 'qrCode', 'footer',
] as const;
export type TemplateBlock = typeof TEMPLATE_BLOCKS[number];

export const updateDocumentTemplateSettingSchema = z.object({
  templateKey: z.string().max(50).optional(),
  layoutVariant: z.string().max(50).optional(),
  enabledBlocks: z.record(z.enum(TEMPLATE_BLOCKS), z.boolean()).optional(),
  blockOrder: z.array(z.enum(TEMPLATE_BLOCKS)).max(TEMPLATE_BLOCKS.length).refine(order=>new Set(order).size===order.length,'A ordem não pode repetir blocos.').optional(),
  customTexts: z.record(z.string(), z.string()).optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
}).refine((data) => {
  if (data.blockOrder && data.enabledBlocks) {
    return data.blockOrder.every(b => b in data.enabledBlocks!);
  }
  return true;
}, { message: 'blockOrder contém blocos não presentes em enabledBlocks' });

export type UpdateDocumentTemplateSettingInput = z.infer<typeof updateDocumentTemplateSettingSchema>;

// --- SETUP VALIDATORS (extended) ---

// --- WEBHOOK VALIDATORS ---

export const WEBHOOK_EVENTS = [
  // AUDIT
  'audit.log_created',
  'audit.security_alert',
  'user.created',
  'user.role_changed',
  'user.deactivated',
  'user.reactivated',
  'brand.updated',
  'document_template.updated',

  // OPERATION
  'ticket.created',
  'ticket.status_changed',
  'ticket.assigned',
  'ticket.comment_added',
  'ticket.sla_first_response_due_soon',
  'ticket.sla_resolution_due_soon',
  'ticket.sla_breached',
  'ticket.feedback_due',
  'document.generated',
  'client.created',
  'client.updated',
  'service_order.created',
  'service_order.status_changed',

  // COMMERCIAL
  'invoice.created',
  'invoice.status_changed',
  'invoice.due_soon',
  'invoice.due_today',
  'invoice.overdue',
  'invoice.paid',
  'contract.created',
  'contract.status_changed',
  'contract.cycle_ending_soon',
  'contract.cycle_ended',
  'contract.renewal_due',
  'billing.event_created',
  'billing.event_skipped',
  'quote.created',
  'quote.status_changed',
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number];

export interface WebhookCatalogEntry {
  type: string;
  category: 'AUDIT' | 'OPERATION' | 'COMMERCIAL';
  label: string;
  description: string;
  entityType: string;
  lifecycle: 'realtime' | 'scheduled' | 'inbound' | 'future';
  status: 'active' | 'planned';
  payloadExample: Record<string, any>;
  requiredFeature?: string;
}

export const WEBHOOK_EVENT_CATALOG: WebhookCatalogEntry[] = [
  // --- AUDITORIA ---
  {
    type: 'audit.log_created',
    category: 'AUDIT',
    label: 'Log de Auditoria Criado',
    description: 'Disparado quando qualquer ação auditável ocorre no sistema.',
    entityType: 'AUDIT_LOG',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      action: 'user.login',
      entityType: 'USER',
      entityId: 'usr_123456',
      severity: 'INFO',
      details: { ip: '127.0.0.1' }
    }
  },
  {
    type: 'audit.security_alert',
    category: 'AUDIT',
    label: 'Alerta de Segurança',
    description: 'Disparado quando ocorre um evento crítico de segurança (ex: bootstrap de admin, tentativas falhas).',
    entityType: 'AUDIT_LOG',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      action: 'security.brute_force',
      entityType: 'AUTH',
      entityId: 'auth_session',
      severity: 'SECURITY_ALERT',
      details: { reason: 'Tentativas repetidas de login' }
    }
  },
  {
    type: 'user.created',
    category: 'AUDIT',
    label: 'Usuário Criado',
    description: 'Disparado quando um novo usuário/técnico/financeiro é criado no workspace.',
    entityType: 'USER',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      userId: 'usr_abc123',
      name: 'João Técnico',
      email: 'joao@empresa.com',
      role: 'TECHNICIAN'
    }
  },
  {
    type: 'user.role_changed',
    category: 'AUDIT',
    label: 'Papel de Usuário Alterado',
    description: 'Disparado quando a função/nível de acesso de um usuário é modificada.',
    entityType: 'USER',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      userId: 'usr_abc123',
      oldRole: 'READ_ONLY',
      newRole: 'ADMIN'
    }
  },
  {
    type: 'user.deactivated',
    category: 'AUDIT',
    label: 'Usuário Desativado',
    description: 'Disparado quando a conta de um usuário é temporariamente ou permanentemente desativada.',
    entityType: 'USER',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      userId: 'usr_abc123',
      status: 'INACTIVE'
    }
  },
  {
    type: 'user.reactivated',
    category: 'AUDIT',
    label: 'Usuário Reativado',
    description: 'Disparado quando a conta de um usuário é reativada.',
    entityType: 'USER',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      userId: 'usr_abc123',
      status: 'ACTIVE'
    }
  },
  {
    type: 'brand.updated',
    category: 'AUDIT',
    label: 'Marca/Identidade Atualizada',
    description: 'Disparado quando as configurações globais de marca do workspace (white-label) são atualizadas.',
    entityType: 'WORKSPACE',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      brandName: 'Peanut Central',
      primaryColorHex: '#1d4ed8'
    }
  },
  {
    type: 'document_template.updated',
    category: 'AUDIT',
    label: 'Template de Documento Atualizado',
    description: 'Disparado quando a disposição ou blocos de um template A4 são configurados.',
    entityType: 'DOCUMENT_TEMPLATE_SETTING',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      documentType: 'INVOICE',
      templateKey: 'modern',
      layoutVariant: 'compact'
    }
  },

  // --- OPERAÇÃO ---
  {
    type: 'ticket.created',
    category: 'OPERATION',
    label: 'Chamado Criado',
    description: 'Disparado quando um novo chamado técnico é aberto na plataforma.',
    entityType: 'TICKET',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      ticketId: 'tkt_881729',
      number: 'TKT-2026-0045',
      title: 'Queda de conexão no switch principal',
      status: 'OPEN',
      priority: 'HIGH',
      clientId: 'cli_981273'
    }
  },
  {
    type: 'ticket.status_changed',
    category: 'OPERATION',
    label: 'Status do Chamado Alterado',
    description: 'Disparado quando um chamado muda de estado (ex: Aberto para Em Progresso).',
    entityType: 'TICKET',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      ticketId: 'tkt_881729',
      number: 'TKT-2026-0045',
      oldStatus: 'OPEN',
      newStatus: 'IN_PROGRESS'
    }
  },
  {
    type: 'ticket.assigned',
    category: 'OPERATION',
    label: 'Chamado Designado',
    description: 'Disparado quando um técnico ou administrador é designado para atuar no chamado.',
    entityType: 'TICKET',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      ticketId: 'tkt_881729',
      number: 'TKT-2026-0045',
      assignedToId: 'usr_abc123'
    }
  },
  {
    type: 'ticket.comment_added',
    category: 'OPERATION',
    label: 'Comentário Adicionado',
    description: 'Disparado quando um novo comentário (técnico ou visível) é registrado no chamado.',
    entityType: 'TICKET_COMMENT',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      commentId: 'cmt_998127',
      ticketId: 'tkt_881729',
      isInternal: true,
      content: 'Identificamos que o firmware do switch estava desatualizado.'
    }
  },
  {
    type: 'ticket.sla_first_response_due_soon',
    category: 'OPERATION',
    label: 'SLA de Resposta Próximo do Vencimento',
    description: 'Disparado pelo scheduler quando o chamado está próximo de violar o SLA de primeira resposta calculado por contrato, cliente ou prioridade.',
    entityType: 'TICKET',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      ticketId: 'tkt_881729',
      number: 'TKT-2026-0045',
      slaDueFirstResponseAt: '2026-05-25T19:30:00Z',
      slaPolicyId: 'sla_123',
      contractId: 'ctr_123',
      remainingMinutes: 28
    }
  },
  {
    type: 'ticket.sla_resolution_due_soon',
    category: 'OPERATION',
    label: 'SLA de Resolução Próximo do Vencimento',
    description: 'Disparado pelo scheduler quando o chamado está próximo de violar o SLA de resolução calculado por contrato, cliente ou prioridade.',
    entityType: 'TICKET',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      ticketId: 'tkt_881729',
      number: 'TKT-2026-0045',
      slaDueResolutionAt: '2026-05-25T20:00:00Z',
      slaPolicyId: 'sla_123',
      contractId: 'ctr_123',
      remainingMinutes: 52
    }
  },
  {
    type: 'ticket.sla_breached',
    category: 'OPERATION',
    label: 'SLA de Chamado Estourado / Violado',
    description: 'Disparado imediatamente quando o prazo de primeira resposta ou resolução do chamado expira sem ação cabível.',
    entityType: 'TICKET',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      ticketId: 'tkt_881729',
      number: 'TKT-2026-0045',
      slaType: 'RESOLUTION',
      slaDueAt: '2026-05-25T14:00:00Z',
      slaPolicyId: 'sla_123',
      contractId: 'ctr_123',
      breachedAt: '2026-05-25T14:01:00Z'
    }
  },
  {
    type: 'ticket.feedback_due',
    category: 'OPERATION',
    label: 'Pesquisa de Satisfação Pendente',
    description: 'Disparado X horas após a resolução/fechamento do chamado para coleta de feedback.',
    entityType: 'TICKET',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      ticketId: 'tkt_881729',
      number: 'TKT-2026-0045',
      resolvedAt: '2026-05-24T15:00:00Z',
      feedbackUrl: 'https://peanut.os/feedback/tkt_881729'
    }
  },
  {
    type: 'document.generated',
    category: 'OPERATION',
    label: 'Documento PDF Gerado',
    description: 'Disparado quando um documento oficial (Fatura, Orçamento, Contrato, OS) é compilado em PDF.',
    entityType: 'GENERATED_DOCUMENT',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      documentId: 'doc_289123',
      entityType: 'INVOICE',
      entityId: 'inv_82718',
      version: 1,
      originalFilename: 'fatura-FAT-2026-1029-v1.pdf'
    }
  },
  {
    type: 'client.created',
    category: 'OPERATION',
    label: 'Cliente Criado',
    description: 'Disparado quando um novo cliente corporativo ou pessoa física é cadastrado.',
    entityType: 'CLIENT',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      clientId: 'cli_981273',
      legalName: 'Acme Corporation Ltda',
      tradeName: 'Acme Corp',
      document: '12.345.678/0001-90'
    }
  },
  {
    type: 'client.updated',
    category: 'OPERATION',
    label: 'Cliente Atualizado',
    description: 'Disparado quando os dados cadastrais do cliente são editados.',
    entityType: 'CLIENT',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      clientId: 'cli_981273',
      tradeName: 'Acme Enterprise',
      email: 'contato@acme.com'
    }
  },
  {
    type: 'ticket.scheduled_due_soon',
    category: 'OPERATION',
    label: 'Chamado Agendado Próximo (Planejado)',
    description: 'Disparado antes da data/hora de agendamento de um chamado planejado.',
    entityType: 'TICKET',
    lifecycle: 'future',
    status: 'planned',
    payloadExample: {}
  },
  {
    type: 'ticket.scheduled_due_today',
    category: 'OPERATION',
    label: 'Chamado Agendado para Hoje (Planejado)',
    description: 'Disparado no dia inicial do agendamento de rotina técnica.',
    entityType: 'TICKET',
    lifecycle: 'future',
    status: 'planned',
    payloadExample: {}
  },
  {
    type: 'service_order.created',
    category: 'OPERATION',
    label: 'Ordem de Serviço Criada',
    description: 'Disparado quando uma ordem de serviço técnica é criada.',
    entityType: 'SERVICE_ORDER',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      serviceOrderId: 'os_981273',
      number: 'OS-2026-0045',
      status: 'DRAFT',
      clientId: 'cli_981273'
    }
  },
  {
    type: 'service_order.status_changed',
    category: 'OPERATION',
    label: 'Status da OS Alterado',
    description: 'Disparado na mudança de status técnico da ordem de serviço.',
    entityType: 'SERVICE_ORDER',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      serviceOrderId: 'os_981273',
      number: 'OS-2026-0045',
      oldStatus: 'SCHEDULED',
      newStatus: 'IN_PROGRESS'
    }
  },
  {
    type: 'service_order.due_today',
    category: 'OPERATION',
    label: 'OS Vencendo Hoje (Planejado)',
    description: 'Disparado no dia do vencimento da Ordem de Serviço.',
    entityType: 'SERVICE_ORDER',
    lifecycle: 'future',
    status: 'planned',
    payloadExample: {}
  },
  {
    type: 'service_order.feedback_due',
    category: 'OPERATION',
    label: 'Satisfação de OS Pendente (Planejado)',
    description: 'Solicita avaliação do cliente após a conclusão da Ordem de Serviço.',
    entityType: 'SERVICE_ORDER',
    lifecycle: 'future',
    status: 'planned',
    payloadExample: {}
  },

  // --- COMERCIAL ---
  {
    type: 'invoice.created',
    category: 'COMMERCIAL',
    label: 'Fatura Criada',
    description: 'Disparado quando uma nova fatura financeira/mensalidade é criada.',
    entityType: 'INVOICE',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      invoiceId: 'inv_82718',
      number: 'FAT-2026-9817',
      status: 'DRAFT',
      totalAmount: 6500.00,
      dueDate: '2026-05-30T03:00:00.000Z'
    }
  },
  {
    type: 'invoice.status_changed',
    category: 'COMMERCIAL',
    label: 'Status de Fatura Alterado',
    description: 'Disparado quando a fatura é emitida, cancelada ou atualizada.',
    entityType: 'INVOICE',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      invoiceId: 'inv_82718',
      number: 'FAT-2026-9817',
      oldStatus: 'DRAFT',
      newStatus: 'ISSUED'
    }
  },
  {
    type: 'invoice.due_soon',
    category: 'COMMERCIAL',
    label: 'Fatura Vence em Breve',
    description: 'Disparado conforme a antecedência configurada antes do vencimento da fatura ativa.',
    entityType: 'INVOICE',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      invoiceId: 'inv_82718',
      number: 'FAT-2026-9817',
      dueDate: '2026-05-30T03:00:00.000Z',
      dueSoonOffsetHours: 72,
      remainingHours: 72
    }
  },
  {
    type: 'invoice.due_today',
    category: 'COMMERCIAL',
    label: 'Fatura Vence Hoje',
    description: 'Disparado na manhã do dia de vencimento da fatura.',
    entityType: 'INVOICE',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      invoiceId: 'inv_82718',
      number: 'FAT-2026-9817',
      dueDate: '2026-05-25T03:00:00.000Z'
    }
  },
  {
    type: 'invoice.overdue',
    category: 'COMMERCIAL',
    label: 'Fatura Vencida / Atrasada',
    description: 'Disparado diariamente enquanto a fatura continuar inadimplente após o vencimento.',
    entityType: 'INVOICE',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      invoiceId: 'inv_82718',
      number: 'FAT-2026-9817',
      dueDate: '2026-05-24T03:00:00.000Z',
      daysOverdue: 1
    }
  },
  {
    type: 'invoice.paid',
    category: 'COMMERCIAL',
    label: 'Fatura Paga',
    description: 'Disparado no momento exato em que a baixa de pagamento da fatura é concluída.',
    entityType: 'INVOICE',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      invoiceId: 'inv_82718',
      number: 'FAT-2026-9817',
      paidAt: '2026-05-25T15:30:00Z',
      paymentMethod: 'PIX'
    }
  },
  {
    type: 'contract.created',
    category: 'COMMERCIAL',
    label: 'Contrato Criado',
    description: 'Disparado na criação de um novo contrato de suporte ou licenças.',
    entityType: 'CONTRACT',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      contractId: 'ctr_009812',
      number: 'CTR-2026-0045',
      title: 'Contrato Mensal de Suporte TI',
      startDate: '2026-06-01T03:00:00.000Z',
      billingDay: 5
    }
  },
  {
    type: 'contract.status_changed',
    category: 'COMMERCIAL',
    label: 'Status do Contrato Alterado',
    description: 'Disparado na ativação, suspensão ou encerramento de um contrato.',
    entityType: 'CONTRACT',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      contractId: 'ctr_009812',
      number: 'CTR-2026-0045',
      oldStatus: 'DRAFT',
      newStatus: 'ACTIVE'
    }
  },
  {
    type: 'contract.cycle_ending_soon',
    category: 'COMMERCIAL',
    label: 'Ciclo do Contrato Terminando',
    description: 'Disparado X dias antes do término de vigência do contrato comercial.',
    entityType: 'CONTRACT',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      contractId: 'ctr_009812',
      number: 'CTR-2026-0045',
      endDate: '2026-06-09T03:00:00.000Z',
      daysRemaining: 15
    }
  },
  {
    type: 'contract.cycle_ended',
    category: 'COMMERCIAL',
    label: 'Vigência de Contrato Encerrada',
    description: 'Disparado no dia após o encerramento do contrato (endDate ultrapassada).',
    entityType: 'CONTRACT',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      contractId: 'ctr_009812',
      number: 'CTR-2026-0045',
      endDate: '2026-05-24T03:00:00.000Z'
    }
  },
  {
    type: 'contract.renewal_due',
    category: 'COMMERCIAL',
    label: 'Renovação de Contrato Pendente',
    description: 'Alerta que o contrato atingiu a data ideal de renovação.',
    entityType: 'CONTRACT',
    lifecycle: 'scheduled',
    status: 'active',
    payloadExample: {
      contractId: 'ctr_009812',
      number: 'CTR-2026-0045',
      renewalMode: 'MONTHLY'
    }
  },
  {
    type: 'billing.event_created',
    category: 'COMMERCIAL',
    label: 'Evento de Faturamento Gerado',
    description: 'Disparado quando o scheduler cria um evento mensal de faturamento para um contrato ativo.',
    entityType: 'BILLING_SCHEDULE_EVENT',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      eventId: 'evt_bill_991823',
      contractId: 'ctr_009812',
      amountCents: 450000,
      periodKey: '2026-06'
    }
  },
  {
    type: 'billing.event_skipped',
    category: 'COMMERCIAL',
    label: 'Evento de Faturamento Ignorado',
    description: 'Disparado se o faturamento periódico for pulado por duplicidade ou regras internas.',
    entityType: 'BILLING_SCHEDULE_EVENT',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      contractId: 'ctr_009812',
      periodKey: '2026-06',
      reason: 'duplicate_period'
    }
  },
  {
    type: 'contract.auto_renewed',
    category: 'COMMERCIAL',
    label: 'Contrato Auto Renovado (Planejado)',
    description: 'Disparado após renovação de ciclo automática.',
    entityType: 'CONTRACT',
    lifecycle: 'future',
    status: 'planned',
    payloadExample: {}
  },
  {
    type: 'quote.created',
    category: 'COMMERCIAL',
    label: 'Orçamento Criado',
    description: 'Disparado na criação de um novo orçamento comercial.',
    entityType: 'QUOTE',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      quoteId: 'qte_981273',
      number: 'ORC-2026-0045',
      status: 'DRAFT',
      totalAmount: 6500.00
    }
  },
  {
    type: 'quote.status_changed',
    category: 'COMMERCIAL',
    label: 'Status do Orçamento Alterado',
    description: 'Disparado quando o orçamento é enviado, aprovado, recusado ou cancelado.',
    entityType: 'QUOTE',
    lifecycle: 'realtime',
    status: 'active',
    payloadExample: {
      quoteId: 'qte_981273',
      number: 'ORC-2026-0045',
      oldStatus: 'SENT',
      newStatus: 'ACCEPTED'
    }
  },
  {
    type: 'quote.expiring_soon',
    category: 'COMMERCIAL',
    label: 'Orçamento Expirando em Breve (Planejado)',
    description: 'Gatilho de contagem regressiva antes da validade final.',
    entityType: 'QUOTE',
    lifecycle: 'future',
    status: 'planned',
    payloadExample: {}
  },
  {
    type: 'quote.expired',
    category: 'COMMERCIAL',
    label: 'Orçamento Expirado (Planejado)',
    description: 'Orçamento excedeu data limite sem aprovação.',
    entityType: 'QUOTE',
    lifecycle: 'future',
    status: 'planned',
    payloadExample: {}
  },
  {
    type: 'quote.accepted',
    category: 'COMMERCIAL',
    label: 'Orçamento Aprovado (Planejado)',
    description: 'Assinatura e aprovação formal do cliente recebida.',
    entityType: 'QUOTE',
    lifecycle: 'future',
    status: 'planned',
    payloadExample: {}
  },
  {
    type: 'quote.rejected',
    category: 'COMMERCIAL',
    label: 'Orçamento Recusado (Planejado)',
    description: 'Proposta recusada formalmente pelo destinatário.',
    entityType: 'QUOTE',
    lifecycle: 'future',
    status: 'planned',
    payloadExample: {}
  }
];

export const WEBHOOK_EVENTS_BY_CATEGORY = {
  AUDIT: WEBHOOK_EVENT_CATALOG.filter(e => e.category === 'AUDIT'),
  OPERATION: WEBHOOK_EVENT_CATALOG.filter(e => e.category === 'OPERATION'),
  COMMERCIAL: WEBHOOK_EVENT_CATALOG.filter(e => e.category === 'COMMERCIAL'),
} as const;

export const WEBHOOK_EVENT_TYPES = WEBHOOK_EVENTS;

export const webhookEventTypeSchema = z.enum(WEBHOOK_EVENTS);
export const webhookCategorySchema = z.enum(['AUDIT', 'OPERATION', 'COMMERCIAL']);

const isPrivateHost = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    return (
      ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname)
    );
  } catch {
    return false;
  }
};

// Runtime guard for private URL — evaluated at call time to allow SSR/Node env detection
const blockPrivateUrls = (url: string): boolean => {
  const nodeEnv =
    typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV;
  return nodeEnv !== 'production' || !isPrivateHost(url);
};

export const createWebhookEndpointSchema = z.object({
  name: z.string().min(2, { message: 'O nome do webhook é obrigatório' }).max(150),
  url: z
    .string()
    .url({ message: 'URL inválida. Use http:// ou https://' })
    .refine((url) => /^https?:\/\//i.test(url), {
      message: 'URL deve usar protocolo HTTP ou HTTPS',
    })
    .refine(blockPrivateUrls, {
      message: 'URL aponta para rede privada ou local (não permitido em produção)',
    }),
  events: z
    .array(z.enum(WEBHOOK_EVENTS, {
      errorMap: () => ({ message: 'Apenas eventos ativos podem ser assinados. Eventos planejados não estão disponíveis no momento.' })
    }))
    .min(1, { message: 'Selecione ao menos um evento ativo' }),
  isActive: z.boolean().default(true),
});

export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;

export const updateWebhookEndpointSchema = createWebhookEndpointSchema.partial();

export type UpdateWebhookEndpointInput = z.infer<typeof updateWebhookEndpointSchema>;

export const webhookAutomationSettingsSchema = z.object({
  invoiceDueSoonOffsetHours: z.coerce
    .number()
    .int({ message: 'Informe uma antecedência em horas inteiras' })
    .min(1, { message: 'A antecedência mínima é de 1 hora' })
    .max(24 * 30, { message: 'A antecedência máxima é de 30 dias' }),
});

export type WebhookAutomationSettingsInput = z.infer<typeof webhookAutomationSettingsSchema>;

export const webhookDeliveryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type WebhookDeliveryQueryInput = z.infer<typeof webhookDeliveryQuerySchema>;

// --- SETUP VALIDATORS ---

export const setupAdminSchema = z.object({
  workspaceName: z.string().min(2, { message: 'Nome do workspace é obrigatório' }),
  adminName: z.string().min(2, { message: 'Nome do administrador é obrigatório' }),
  adminEmail: z.string().email({ message: 'E-mail inválido' }),
  adminPassword: z
    .string()
    .min(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
    .regex(/[A-Z]/, { message: 'A senha deve conter pelo menos uma letra maiúscula' })
    .regex(/[0-9]/, { message: 'A senha deve conter pelo menos um número' }),
  // Optional brand fields for wizard step 2 & 3
  brandName: z.string().max(150).optional().nullable().or(z.literal('')),
  legalName: z.string().max(200).optional().nullable().or(z.literal('')),
  companyDocument: z.string().max(30).optional().nullable().or(z.literal('')),
  companyEmail: z.string().email().max(150).optional().nullable().or(z.literal('')),
  companyPhone: z.string().max(30).optional().nullable().or(z.literal('')),
  companyWebsite: z.string().url().max(255).optional().nullable().or(z.literal('')),
  companyAddress: z.string().max(1000).optional().nullable().or(z.literal('')),
  primaryColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable().or(z.literal('')),
  documentSecondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable().or(z.literal('')),
  documentAccentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable().or(z.literal('')),
  documentFooterText: z.string().max(2000).optional().nullable().or(z.literal('')),
});

export type SetupAdminInput = z.infer<typeof setupAdminSchema>;

// --- WORKSPACE USER MANAGEMENT VALIDATORS ---

export const createWorkspaceUserSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(8, { message: 'A senha deve ter no mínimo 8 caracteres' }),
  role: z.enum(['ADMIN', 'TECHNICIAN', 'FINANCIAL', 'READ_ONLY'], {
    errorMap: () => ({ message: 'Papel inválido. Use: ADMIN, TECHNICIAN, FINANCIAL ou READ_ONLY' }),
  }),
});

export type CreateWorkspaceUserInput = z.infer<typeof createWorkspaceUserSchema>;

export const updateWorkspaceUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'TECHNICIAN', 'FINANCIAL', 'READ_ONLY'], {
    errorMap: () => ({ message: 'Papel inválido. OWNER não pode ser atribuído via este endpoint.' }),
  }),
});

export type UpdateWorkspaceUserRoleInput = z.infer<typeof updateWorkspaceUserRoleSchema>;

export const updateWorkspaceUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
    errorMap: () => ({ message: 'Status inválido. Use: ACTIVE, INACTIVE ou SUSPENDED' }),
  }),
});

export type UpdateWorkspaceUserStatusInput = z.infer<typeof updateWorkspaceUserStatusSchema>;

// --- DOCUMENT VALIDATORS ---

export const documentTypeEnum = z.enum(["QUOTE", "INVOICE", "TICKET_CLOSURE", "CONTRACT", "REPORT", "SERVICE_ORDER"]);
export type DocumentTypeEnum = z.infer<typeof documentTypeEnum>;

export const documentVisibilityEnum = z.enum(["PRIVATE", "PUBLIC"]);
export type DocumentVisibilityEnum = z.infer<typeof documentVisibilityEnum>;

export const documentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().nullable(),
  documentType: documentTypeEnum.optional().nullable(),
  entityType: z.string().max(50).optional().nullable(),
  entityId: z.string().uuid({ message: 'ID da entidade inválido' }).optional().nullable(),
  visibility: documentVisibilityEnum.optional().nullable(),
  dateFrom: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Data inicial inválida' }).optional().nullable().or(z.literal('')),
  dateTo: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Data final inválida' }).optional().nullable().or(z.literal('')),
});

export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;

export const documentUploadSchema = z.object({
  documentType: documentTypeEnum,
  entityType: z.string().trim().min(2).max(50).default("WORKSPACE"),
  entityId: z.string().uuid({ message: 'ID da entidade inválido' }).optional().nullable(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(120),
  data: z.string().min(1),
  visibility: documentVisibilityEnum.default("PRIVATE"),
  displayName: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

// --- INBOUND WEBHOOK VALIDATORS ---

export const INBOUND_ACTIONS = [
  'ticket.update_status',
  'ticket.add_comment',
  'ticket.assign',
  'contract.update_status',
] as const;

export const createInboundWebhookSchema = z.object({
  name: z.string().min(2, { message: 'O nome do endpoint de entrada é obrigatório' }).max(150),
  allowedActions: z.array(z.enum(INBOUND_ACTIONS)).min(1, { message: 'Selecione ao menos uma ação permitida' }),
  isActive: z.boolean().default(true),
});

export type CreateInboundWebhookInput = z.infer<typeof createInboundWebhookSchema>;

export const updateInboundWebhookSchema = createInboundWebhookSchema.partial();

export type UpdateInboundWebhookInput = z.infer<typeof updateInboundWebhookSchema>;







// Workspace-owned operational configuration. Never accept a stored ciphertext from HTTP.
export const workspaceEmailSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().max(253).refine(value => !value || /^[a-zA-Z0-9._:[\]-]+$/.test(value), 'Servidor SMTP inválido'),
  port: z.number().int().min(1).max(65535),
  security: z.enum(['STARTTLS', 'TLS']),
  username: z.string().max(254).refine(value => !/[\r\n]/.test(value), 'Usuário inválido'),
  password: z.string().max(2048).optional(),
  clearPassword: z.boolean().optional(),
  fromEmail: z.string().trim().email().max(254).or(z.literal('')),
  fromName: z.string().trim().max(150).refine(value => !/[\r\n]/.test(value), 'Nome inválido'),
  replyTo: z.string().trim().email().max(254).optional().nullable().or(z.literal('')),
  revision: z.number().int().min(0),
}).strict().superRefine((data, ctx) => {
  if (data.enabled && (!data.host || !data.fromEmail)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe servidor e remetente para ativar o SMTP.' });
  if (data.clearPassword && data.password) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Escolha substituir ou remover a senha.' });
});
export const workspaceOperationSettingsSchema = z.object({
  invoiceDueSoonOffsetHours: z.number().int().min(1).max(720),
  contractEndingSoonDays: z.number().int().min(0).max(365),
  ticketFeedbackAfterHours: z.number().int().min(1).max(720),
  automationIntervalMinutes: z.number().int().min(5).max(1440),
  webhookMaxAttempts: z.number().int().min(1).max(10),
  webhookTimeoutMs: z.number().int().min(1000).max(60000),
  sessionDurationMinutes: z.number().int().min(10).max(1440),
}).strict();
