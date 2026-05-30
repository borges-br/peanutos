-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'TECHNICIAN', 'FINANCIAL', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('WORKSTATION', 'NOTEBOOK', 'SERVER', 'PRINTER', 'ROUTER', 'SWITCH', 'ACCESS_POINT', 'FIREWALL', 'CAMERA', 'NVR', 'UPS', 'RACK', 'NAS', 'MOBILE_DEVICE', 'VIRTUAL_MACHINE', 'CLOUD_SERVICE', 'LICENSE', 'SOFTWARE_LICENSE', 'VPN', 'STORAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'IN_MAINTENANCE', 'OUT_OF_STANDARD', 'STOCK', 'IN_STOCK', 'RETIRED', 'SCRAPPED', 'LOST', 'PENDING_VALIDATION', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'PHONE', 'PORTAL', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('QUOTE', 'INVOICE', 'TICKET_CLOSURE', 'CONTRACT', 'REPORT', 'SERVICE_ORDER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('RECURRING_SUPPORT', 'PROJECT', 'ON_DEMAND', 'HYBRID');

-- CreateEnum
CREATE TYPE "RenewalMode" AS ENUM ('NONE', 'MONTHLY', 'ANNUAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "ContractLineItemType" AS ENUM ('SERVICE', 'LICENSE', 'STORAGE', 'SUPPORT', 'MONITORING', 'BACKUP', 'OTHER');

-- CreateEnum
CREATE TYPE "BillingScheduleStatus" AS ENUM ('PENDING', 'DRAFT_READY', 'SKIPPED', 'CANCELLED', 'GENERATED_FUTURE_INVOICE');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandName" VARCHAR(150),
    "brandSubtitle" VARCHAR(150),
    "legalName" VARCHAR(200),
    "companyDocument" VARCHAR(30),
    "companyEmail" VARCHAR(150),
    "financialEmail" VARCHAR(150),
    "companyPhone" VARCHAR(30),
    "companyWebsite" VARCHAR(255),
    "companyAddress" TEXT,
    "primaryColorHex" VARCHAR(7),
    "documentSecondaryColor" VARCHAR(7),
    "documentAccentColor" VARCHAR(7),
    "documentFooterText" TEXT,
    "defaultInvoiceNotes" TEXT,
    "defaultQuoteTerms" TEXT,
    "defaultServiceOrderTerms" TEXT,
    "defaultContractTerms" TEXT,
    "signatureName" VARCHAR(150),
    "logoFileObjectId" UUID,
    "invoiceDueSoonOffsetHours" INTEGER NOT NULL DEFAULT 72,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'READ_ONLY',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "jobTitle" VARCHAR(150),
    "phone" VARCHAR(30),
    "documentDisplayName" VARCHAR(150),
    "documentSignatureEnabled" BOOLEAN NOT NULL DEFAULT false,
    "avatarFileObjectId" UUID,
    "signatureImageFileObjectId" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "slaPolicyId" UUID,
    "type" VARCHAR(30) NOT NULL DEFAULT 'LEGAL_PERSON',
    "legalName" VARCHAR(200) NOT NULL,
    "tradeName" VARCHAR(200) NOT NULL,
    "document" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "website" VARCHAR(255),
    "notes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30),
    "mobile" VARCHAR(30),
    "role" VARCHAR(100),
    "department" VARCHAR(100),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_users" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30),
    "department" VARCHAR(100),
    "jobTitle" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "primaryAssetId" UUID,
    "folderPermissions" TEXT,
    "printerAccess" TEXT,
    "accessHours" VARCHAR(100),
    "storageQuota" BIGINT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "assignedClientUserId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "hostname" VARCHAR(100),
    "type" "AssetType" NOT NULL DEFAULT 'WORKSTATION',
    "status" "AssetStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "manufacturer" VARCHAR(100),
    "model" VARCHAR(100),
    "serialNumber" VARCHAR(100),
    "assetTag" VARCHAR(50),
    "macAddress" VARCHAR(50),
    "operatingSystem" VARCHAR(100),
    "location" VARCHAR(100),
    "remoteAccessId" VARCHAR(100),
    "sensitiveDataEncrypted" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "contactId" UUID,
    "clientUserId" UUID,
    "assetId" UUID,
    "contractId" UUID,
    "slaPolicyId" UUID,
    "categoryId" UUID,
    "number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100),
    "subcategory" VARCHAR(100),
    "channel" "TicketChannel" NOT NULL DEFAULT 'EMAIL',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" UUID,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstResponseAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaDueFirstResponseAt" TIMESTAMP(3),
    "slaDueStartAt" TIMESTAMP(3),
    "slaDueResolutionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_categories" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "userId" UUID,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "visibility" VARCHAR(50) NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_closures" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "closureSummary" TEXT NOT NULL,
    "rootCause" TEXT,
    "preventiveAction" TEXT,
    "technicalHoursUsed" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "clientApproved" BOOLEAN NOT NULL DEFAULT false,
    "clientSignatureName" VARCHAR(150),
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "subtotalServices" DECIMAL(12,2) NOT NULL,
    "subtotalMaterials" DECIMAL(12,2) NOT NULL,
    "subtotalMaterialCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "terms" TEXT,
    "observations" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "ticketId" UUID,
    "contractId" UUID,
    "responsibleUserId" UUID,
    "number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "laborMinutes" INTEGER NOT NULL DEFAULT 0,
    "internalNotes" TEXT,
    "clientNotes" TEXT,
    "subtotalServices" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotalMaterials" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotalMaterialCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_items" (
    "id" UUID NOT NULL,
    "serviceOrderId" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "quoteId" UUID,
    "contractId" UUID,
    "ticketId" UUID,
    "number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" VARCHAR(30) NOT NULL DEFAULT 'PIX',
    "pixKey" VARCHAR(100),
    "subtotalServices" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotalMaterials" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotalMaterialCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "observations" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "ContractType" NOT NULL DEFAULT 'RECURRING_SUPPORT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "renewalMode" "RenewalMode" NOT NULL DEFAULT 'MONTHLY',
    "billingDay" INTEGER NOT NULL DEFAULT 5,
    "monthlyAmountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "slaPolicyId" UUID,
    "maxUsers" INTEGER,
    "maxAssets" INTEGER,
    "includedRemoteTickets" INTEGER,
    "includedOnsiteVisits" INTEGER,
    "includedRemoteHours" INTEGER,
    "includedOnsiteHours" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_line_items" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "itemType" "ContractLineItemType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalPriceCents" INTEGER NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_history" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "actorUserId" UUID,
    "event" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_schedule_events" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "BillingScheduleStatus" NOT NULL,
    "periodKey" VARCHAR(7) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_schedule_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_objects" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "bucket" VARCHAR(100) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "originalFilename" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fileObjectId" UUID NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "generatedById" UUID,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "payload" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "encryptedSecret" TEXT,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "webhookId" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" VARCHAR(1000),
    "errorMessage" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_event_logs" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "periodKey" VARCHAR(50),
    "emittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,

    CONSTRAINT "webhook_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_webhook_endpoints" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "encryptedSecret" TEXT,
    "allowedActions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbound_webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "actorUserId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "ipAddress" VARCHAR(50),
    "userAgent" VARCHAR(255),
    "severity" VARCHAR(20) NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_history" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "actorUserId" UUID,
    "event" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_notes" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "authorUserId" UUID,
    "content" TEXT NOT NULL,
    "visibility" VARCHAR(50) NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_history" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "actorUserId" UUID,
    "event" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_time_entries" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "description" TEXT NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_policies" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "priority" "TicketPriority" NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_template_settings" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "documentType" VARCHAR(30) NOT NULL,
    "templateKey" VARCHAR(50) NOT NULL DEFAULT 'standard',
    "layoutVariant" VARCHAR(50) NOT NULL DEFAULT 'default',
    "enabledBlocks" JSONB NOT NULL,
    "blockOrder" JSONB NOT NULL,
    "customTexts" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_template_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_workspaceId_idx" ON "users"("workspaceId");

-- CreateIndex
CREATE INDEX "clients_workspaceId_idx" ON "clients"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_workspaceId_document_key" ON "clients"("workspaceId", "document");

-- CreateIndex
CREATE INDEX "client_contacts_clientId_idx" ON "client_contacts"("clientId");

-- CreateIndex
CREATE INDEX "client_users_clientId_idx" ON "client_users"("clientId");

-- CreateIndex
CREATE INDEX "client_users_workspaceId_idx" ON "client_users"("workspaceId");

-- CreateIndex
CREATE INDEX "assets_workspaceId_clientId_type_idx" ON "assets"("workspaceId", "clientId", "type");

-- CreateIndex
CREATE INDEX "assets_clientId_status_idx" ON "assets"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_number_key" ON "tickets"("number");

-- CreateIndex
CREATE INDEX "tickets_workspaceId_status_priority_idx" ON "tickets"("workspaceId", "status", "priority");

-- CreateIndex
CREATE INDEX "tickets_workspaceId_categoryId_idx" ON "tickets"("workspaceId", "categoryId");

-- CreateIndex
CREATE INDEX "ticket_categories_workspaceId_idx" ON "ticket_categories"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_categories_workspaceId_name_key" ON "ticket_categories"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "ticket_comments_ticketId_idx" ON "ticket_comments"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_comments_workspaceId_idx" ON "ticket_comments"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_closures_ticketId_key" ON "ticket_closures"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_number_key" ON "quotes"("number");

-- CreateIndex
CREATE INDEX "quotes_workspaceId_status_validUntil_idx" ON "quotes"("workspaceId", "status", "validUntil");

-- CreateIndex
CREATE INDEX "quote_items_quoteId_idx" ON "quote_items"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_number_key" ON "service_orders"("number");

-- CreateIndex
CREATE INDEX "service_orders_workspaceId_status_scheduledFor_idx" ON "service_orders"("workspaceId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "service_orders_workspaceId_clientId_idx" ON "service_orders"("workspaceId", "clientId");

-- CreateIndex
CREATE INDEX "service_orders_ticketId_idx" ON "service_orders"("ticketId");

-- CreateIndex
CREATE INDEX "service_order_items_serviceOrderId_idx" ON "service_order_items"("serviceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_workspaceId_status_dueDate_idx" ON "invoices"("workspaceId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_number_key" ON "contracts"("number");

-- CreateIndex
CREATE INDEX "contracts_workspaceId_idx" ON "contracts"("workspaceId");

-- CreateIndex
CREATE INDEX "contract_line_items_contractId_idx" ON "contract_line_items"("contractId");

-- CreateIndex
CREATE INDEX "contract_line_items_workspaceId_idx" ON "contract_line_items"("workspaceId");

-- CreateIndex
CREATE INDEX "contract_history_contractId_idx" ON "contract_history"("contractId");

-- CreateIndex
CREATE INDEX "contract_history_workspaceId_idx" ON "contract_history"("workspaceId");

-- CreateIndex
CREATE INDEX "billing_schedule_events_contractId_idx" ON "billing_schedule_events"("contractId");

-- CreateIndex
CREATE INDEX "billing_schedule_events_workspaceId_idx" ON "billing_schedule_events"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_schedule_events_contractId_periodKey_key" ON "billing_schedule_events"("contractId", "periodKey");

-- CreateIndex
CREATE INDEX "file_objects_workspaceId_idx" ON "file_objects"("workspaceId");

-- CreateIndex
CREATE INDEX "generated_documents_workspaceId_idx" ON "generated_documents"("workspaceId");

-- CreateIndex
CREATE INDEX "outbox_events_status_nextAttemptAt_idx" ON "outbox_events"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "outbox_events_workspaceId_idx" ON "outbox_events"("workspaceId");

-- CreateIndex
CREATE INDEX "webhook_endpoints_workspaceId_idx" ON "webhook_endpoints"("workspaceId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_workspaceId_idx" ON "webhook_deliveries"("workspaceId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhookId_idx" ON "webhook_deliveries"("webhookId");

-- CreateIndex
CREATE INDEX "webhook_event_logs_workspaceId_eventType_idx" ON "webhook_event_logs"("workspaceId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_event_logs_workspaceId_eventType_entityType_entityI_key" ON "webhook_event_logs"("workspaceId", "eventType", "entityType", "entityId", "periodKey");

-- CreateIndex
CREATE INDEX "inbound_webhook_endpoints_workspaceId_idx" ON "inbound_webhook_endpoints"("workspaceId");

-- CreateIndex
CREATE INDEX "audit_logs_workspaceId_entityType_entityId_idx" ON "audit_logs"("workspaceId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "asset_history_assetId_idx" ON "asset_history"("assetId");

-- CreateIndex
CREATE INDEX "asset_history_workspaceId_idx" ON "asset_history"("workspaceId");

-- CreateIndex
CREATE INDEX "asset_notes_assetId_idx" ON "asset_notes"("assetId");

-- CreateIndex
CREATE INDEX "asset_notes_workspaceId_idx" ON "asset_notes"("workspaceId");

-- CreateIndex
CREATE INDEX "ticket_history_ticketId_idx" ON "ticket_history"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_history_workspaceId_idx" ON "ticket_history"("workspaceId");

-- CreateIndex
CREATE INDEX "ticket_time_entries_ticketId_idx" ON "ticket_time_entries"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_time_entries_workspaceId_idx" ON "ticket_time_entries"("workspaceId");

-- CreateIndex
CREATE INDEX "sla_policies_workspaceId_priority_idx" ON "sla_policies"("workspaceId", "priority");

-- CreateIndex
CREATE INDEX "document_template_settings_workspaceId_idx" ON "document_template_settings"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "document_template_settings_workspaceId_documentType_key" ON "document_template_settings"("workspaceId", "documentType");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_assignedClientUserId_fkey" FOREIGN KEY ("assignedClientUserId") REFERENCES "client_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "client_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "client_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ticket_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_categories" ADD CONSTRAINT "ticket_categories_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_closures" ADD CONSTRAINT "ticket_closures_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_line_items" ADD CONSTRAINT "contract_line_items_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_line_items" ADD CONSTRAINT "contract_line_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_history" ADD CONSTRAINT "contract_history_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_history" ADD CONSTRAINT "contract_history_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_history" ADD CONSTRAINT "contract_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_schedule_events" ADD CONSTRAINT "billing_schedule_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_schedule_events" ADD CONSTRAINT "billing_schedule_events_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_schedule_events" ADD CONSTRAINT "billing_schedule_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_event_logs" ADD CONSTRAINT "webhook_event_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_webhook_endpoints" ADD CONSTRAINT "inbound_webhook_endpoints_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_notes" ADD CONSTRAINT "asset_notes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_notes" ADD CONSTRAINT "asset_notes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_notes" ADD CONSTRAINT "asset_notes_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_notes" ADD CONSTRAINT "asset_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_time_entries" ADD CONSTRAINT "ticket_time_entries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_time_entries" ADD CONSTRAINT "ticket_time_entries_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_time_entries" ADD CONSTRAINT "ticket_time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_settings" ADD CONSTRAINT "document_template_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

