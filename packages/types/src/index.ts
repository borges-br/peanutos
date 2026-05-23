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
  | 'OUT_OF_STANDARD'
  | 'STOCK'
  | 'IN_STOCK'
  | 'RETIRED'
  | 'SCRAPPED'
  | 'LOST'
  | 'PENDING_VALIDATION'
  | 'PENDING_REVIEW';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'WAITING_THIRD_PARTY'
  | 'RESOLVED'
  | 'CLOSED';

export type DocumentType = 'QUOTE' | 'INVOICE' | 'TICKET_CLOSURE' | 'CONTRACT' | 'REPORT';

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
  clientUserId?: string | null;
  assetId?: string | null;
  number: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToId?: string | null;
  openedAt: Date;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
