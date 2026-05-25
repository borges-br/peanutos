import { z } from 'zod';

// Login Validation Schema
export const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Client Validation Schema
export const clientSchema = z.object({
  legalName: z.string().min(2, { message: 'Razão social é obrigatória' }),
  tradeName: z.string().min(2, { message: 'Nome fantasia é obrigatório' }),
  document: z.string().min(11, { message: 'Documento (CPF ou CNPJ) inválido' }),
  email: z.string().email({ message: 'E-mail de contato inválido' }),
  phone: z.string().min(8, { message: 'Telefone inválido' }),
  website: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

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

export const slaPolicyCreateSchema = z.object({
  name: z.string().min(3, { message: 'O nome da política de SLA deve ter pelo menos 3 caracteres' }),
  description: z.string().optional().nullable(),
  priority: z.enum(ticketPriorities),
  firstResponseMinutes: z.number().int().min(1, { message: 'Tempo de primeira resposta deve ser de pelo menos 1 minuto' }),
  startMinutes: z.number().int().min(1, { message: 'Tempo de início deve ser de pelo menos 1 minuto' }),
  resolutionMinutes: z.number().int().min(1, { message: 'Tempo de resolução deve ser de pelo menos 1 minuto' }),
  businessHoursOnly: z.boolean().default(false),
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
  totalPrice: z.coerce.number().min(0).optional().nullable(),
});
export type InvoiceItemCreateInput = z.infer<typeof invoiceItemCreateSchema>;

export const invoiceCreateSchema = z.object({
  clientId: z.string().uuid({ message: 'ID do cliente inválido' }),
  quoteId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  ticketId: z.string().uuid().optional().nullable(),
  number: z.string().optional().nullable(),
  status: invoiceStatusEnum.default("DRAFT"),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de emissão inválida' }).optional().nullable(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data de vencimento inválida' }),
  paymentMethod: z.enum(["PIX", "TRANSFER", "CASH", "OTHER"]).default("PIX"),
  pixKey: z.string().optional().nullable(),
  items: z.array(invoiceItemCreateSchema).min(1, { message: 'A fatura deve ter pelo menos 1 item' }),
});
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;

export const invoiceStatusUpdateSchema = z.object({
  status: invoiceStatusEnum,
});
export type InvoiceStatusUpdateInput = z.infer<typeof invoiceStatusUpdateSchema>;

// --- WORKSPACE BRAND SETTINGS VALIDATORS ---

export const workspaceBrandSettingsSchema = z.object({
  brandName: z.string().max(150, { message: 'O nome público da empresa deve ter no máximo 150 caracteres' }).optional().nullable().or(z.literal('')),
  brandSubtitle: z.string().max(150, { message: 'O subtítulo da marca deve ter no máximo 150 caracteres' }).optional().nullable().or(z.literal('')),
  legalName: z.string().max(200, { message: 'A razão social deve ter no máximo 200 caracteres' }).optional().nullable().or(z.literal('')),
  companyDocument: z.string().max(30, { message: 'O documento da empresa deve ter no máximo 30 caracteres' }).optional().nullable().or(z.literal('')),
  companyEmail: z.string().email({ message: 'E-mail principal inválido' }).max(150).optional().nullable().or(z.literal('')),
  financialEmail: z.string().email({ message: 'E-mail financeiro inválido' }).max(150).optional().nullable().or(z.literal('')),
  companyPhone: z.string().max(30, { message: 'O telefone deve ter no máximo 30 caracteres' }).optional().nullable().or(z.literal('')),
  companyWebsite: z.string().url({ message: 'URL do website inválida' }).max(255).optional().nullable().or(z.literal('')),
  companyAddress: z.string().max(1000, { message: 'O endereço deve ter no máximo 1000 caracteres' }).optional().nullable().or(z.literal('')),
  primaryColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'A cor primária deve ser um formato hexadecimal válido (ex: #000000)' }).optional().nullable().or(z.literal('')),
  documentFooterText: z.string().max(1000, { message: 'O rodapé deve ter no máximo 1000 caracteres' }).optional().nullable().or(z.literal('')),
  signatureName: z.string().max(150, { message: 'O nome para assinatura deve ter no máximo 150 caracteres' }).optional().nullable().or(z.literal('')),
});

export type WorkspaceBrandSettingsInput = z.infer<typeof workspaceBrandSettingsSchema>;

// --- WEBHOOK VALIDATORS ---

export const WEBHOOK_EVENTS = [
  'invoice.created',
  'invoice.status_changed',
  'document.generated',
  'ticket.created',
  'ticket.status_changed',
  'user.created',
  'user.role_changed',
  'client.created',
  'client.updated',
  'contract.created',
  'contract.status_changed',
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number];

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
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, { message: 'Selecione ao menos um evento' }),
  isActive: z.boolean().default(true),
});

export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;

export const updateWebhookEndpointSchema = createWebhookEndpointSchema.partial();

export type UpdateWebhookEndpointInput = z.infer<typeof updateWebhookEndpointSchema>;

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

export const documentTypeEnum = z.enum(["QUOTE", "INVOICE", "TICKET_CLOSURE", "CONTRACT", "REPORT"]);
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





