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
  | 'CAMERA'
  | 'NVR'
  | 'UPS'
  | 'RACK'
  | 'LICENSE'
  | 'CLOUD_SERVICE'
  | 'VPN'
  | 'STORAGE'
  | 'OTHER';

export type AssetStatus =
  | 'OPERATIONAL'
  | 'MAINTENANCE'
  | 'OUT_OF_STANDARD'
  | 'STOCK'
  | 'RETIRED'
  | 'SCRAPPED'
  | 'LOST'
  | 'PENDING_VALIDATION';

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

export interface Asset {
  id: string;
  workspaceId: string;
  clientId: string;
  assignedClientUserId?: string | null;
  name: string;
  hostname?: string | null;
  type: AssetType;
  status: AssetStatus;
  serialNumber?: string | null;
  assetTag?: string | null;
  operatingSystem?: string | null;
  sensitiveDataEncrypted?: string | null;
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
