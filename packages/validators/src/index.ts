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


