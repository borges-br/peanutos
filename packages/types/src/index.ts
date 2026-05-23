// ==============================================================================
// PEANUT OS - SHARED TYPES & CONSTANTS
// ==============================================================================

export type UserRole = 'OWNER' | 'ADMIN' | 'TECHNICIAN' | 'FINANCIAL' | 'READ_ONLY';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT';

export type AssetType =
  | 'WORKSTATION'
  | 'NOTEBOOK'
  | 'SERVER'
  | 'PRINTER'
  | 'ROUTER'
  | 'SWITCH'
  | 'ACCESS_POINT'
  | 'FIREWALL'
  | 'CAMERA'
  | 'NVR'
  | 'UPS'
  | 'RACK'
  | 'NAS'
  | 'MOBILE_DEVICE'
  | 'VIRTUAL_MACHINE'
  | 'CLOUD_SERVICE'
  | 'LICENSE'
  | 'SOFTWARE_LICENSE'
  | 'VPN'
  | 'STORAGE'
  | 'OTHER';

export type AssetStatus =
  | 'OPERATIONAL'
  | 'MAINTENANCE'
  | 'IN_MAINTENANCE'
  | 'OUT_OF_STANDARD'
  | 'STOCK'
  | 'IN_STOCK'
  | 'RETIRED'
  | 'SCRAPPED'
  | 'LOST'
  | 'PENDING_VALIDATION'
  | 'PENDING_REVIEW';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';

export type TicketStatus =
  | 'OPEN'
  | 'TRIAGE'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'WAITING_THIRD_PARTY'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';

export type TicketChannel = 'WHATSAPP' | 'EMAIL' | 'PHONE' | 'PORTAL' | 'MANUAL' | 'OTHER';

export type TicketCommentVisibility = 'INTERNAL' | 'CLIENT_VISIBLE_FUTURE';

export type TicketHistoryEvent =
  | 'TICKET_CREATED'
  | 'TICKET_UPDATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNED'
  | 'COMMENT_ADDED'
  | 'FIRST_RESPONSE_RECORDED'
  | 'STARTED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'SLA_WARNING'
  | 'SLA_BREACHED';

export type DocumentType = 'QUOTE' | 'INVOICE' | 'TICKET_CLOSURE' | 'CONTRACT' | 'REPORT';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED' | 'TERMINATED';
export type ContractType = 'RECURRING_SUPPORT' | 'PROJECT' | 'ON_DEMAND' | 'HYBRID';
export type RenewalMode = 'NONE' | 'MONTHLY' | 'ANNUAL' | 'MANUAL';
export type ContractLineItemType = 'SERVICE' | 'LICENSE' | 'STORAGE' | 'SUPPORT' | 'MONITORING' | 'BACKUP' | 'OTHER';
export type BillingScheduleStatus = 'PENDING' | 'DRAFT_READY' | 'SKIPPED' | 'CANCELLED' | 'GENERATED_FUTURE_INVOICE';

export interface Contract {
  id: string;
  workspaceId: string;
  clientId: string;
  number: string;
  title: string;
  description?: string | null;
  status: ContractStatus;
  type: ContractType;
  startDate: Date;
  endDate?: Date | null;
  renewalMode: RenewalMode;
  billingDay: number;
  monthlyAmountCents: number;
  currency: string;
  slaPolicyId?: string | null;
  maxUsers?: number | null;
  maxAssets?: number | null;
  includedRemoteTickets?: number | null;
  includedOnsiteVisits?: number | null;
  includedRemoteHours?: number | null;
  includedOnsiteHours?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractLineItem {
  id: string;
  workspaceId: string;
  contractId: string;
  description: string;
  itemType: ContractLineItemType;
  quantity: number | string;
  unitPriceCents: number;
  totalPriceCents: number;
  recurring: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractHistory {
  id: string;
  workspaceId: string;
  contractId: string;
  actorUserId?: string | null;
  event: string;
  description: string;
  before?: string | null;
  after?: string | null;
  createdAt: Date;
}

export interface BillingScheduleEvent {
  id: string;
  workspaceId: string;
  contractId: string;
  clientId: string;
  scheduledFor: Date;
  status: BillingScheduleStatus;
  periodKey: string;
  amountCents: number;
  currency: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Basic Entities Structure
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  workspaceId: string;
  legalName: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ClientUserStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PENDING_REVIEW';

export interface ClientUser {
  id: string;
  workspaceId: string;
  clientId: string;
  fullName: string;
  email: string;
  department?: string | null;
  jobTitle?: string | null;
  status: ClientUserStatus;
  primaryAssetId?: string | null;
  folderPermissions?: string | null;
  printerAccess?: string | null;
  accessHours?: string | null;
  storageQuota?: bigint | number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  workspaceId: string;
  clientId: string;
  assignedClientUserId?: string | null;
  name: string;
  hostname?: string | null;
  type: AssetType;
  status: AssetStatus;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  assetTag?: string | null;
  macAddress?: string | null;
  operatingSystem?: string | null;
  location?: string | null;
  remoteAccessId?: string | null;
  sensitiveDataEncrypted?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AssetHistoryEvent =
  | 'ASSET_CREATED'
  | 'ASSET_UPDATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'NOTE_ADDED'
  | 'SENSITIVE_DATA_UPDATED'
  | 'SENSITIVE_DATA_REVEALED';

export interface AssetHistory {
  id: string;
  workspaceId: string;
  clientId: string;
  assetId: string;
  actorUserId?: string | null;
  event: AssetHistoryEvent;
  description: string;
  before?: string | null;
  after?: string | null;
  createdAt: Date;
}

export type AssetNoteVisibility = 'INTERNAL' | 'CLIENT_VISIBLE_FUTURE';

export interface AssetNote {
  id: string;
  workspaceId: string;
  clientId: string;
  assetId: string;
  authorUserId?: string | null;
  content: string;
  visibility: AssetNoteVisibility;
  createdAt: Date;
  updatedAt: Date;
}


export interface Ticket {
  id: string;
  workspaceId: string;
  clientId: string;
  contactId?: string | null;
  clientUserId?: string | null;
  assetId?: string | null;
  contractId?: string | null;
  slaPolicyId?: string | null;
  number: string;
  title: string;
  description: string;
  channel: TicketChannel;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToId?: string | null;
  openedAt: Date;
  firstResponseAt?: Date | null;
  startedAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  slaDueFirstResponseAt?: Date | null;
  slaDueStartAt?: Date | null;
  slaDueResolutionAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketComment {
  id: string;
  workspaceId: string;
  ticketId: string;
  userId?: string | null;
  content: string;
  isInternal: boolean;
  visibility: TicketCommentVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketHistory {
  id: string;
  workspaceId: string;
  ticketId: string;
  actorUserId?: string | null;
  event: string;
  description: string;
  before?: string | null;
  after?: string | null;
  createdAt: Date;
}

export interface TicketTimeEntry {
  id: string;
  workspaceId: string;
  ticketId: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date | null;
  durationMinutes?: number | null;
  description: string;
  billable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlaPolicy {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  priority: TicketPriority;
  firstResponseMinutes: number;
  startMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
