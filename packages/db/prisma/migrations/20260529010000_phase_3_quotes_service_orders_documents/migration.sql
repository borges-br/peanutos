-- Phase 3: quotes, service orders, and document center uploads.

ALTER TABLE "quotes"
  ADD COLUMN IF NOT EXISTS "terms" TEXT,
  ADD COLUMN IF NOT EXISTS "observations" TEXT;

CREATE TABLE IF NOT EXISTS "service_orders" (
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

CREATE TABLE IF NOT EXISTS "service_order_items" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "service_orders_number_key" ON "service_orders"("number");
CREATE INDEX IF NOT EXISTS "service_orders_workspaceId_status_scheduledFor_idx" ON "service_orders"("workspaceId", "status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "service_orders_workspaceId_clientId_idx" ON "service_orders"("workspaceId", "clientId");
CREATE INDEX IF NOT EXISTS "service_orders_ticketId_idx" ON "service_orders"("ticketId");
CREATE INDEX IF NOT EXISTS "service_order_items_serviceOrderId_idx" ON "service_order_items"("serviceOrderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_workspaceId_fkey'
  ) THEN
    ALTER TABLE "service_orders"
      ADD CONSTRAINT "service_orders_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_clientId_fkey'
  ) THEN
    ALTER TABLE "service_orders"
      ADD CONSTRAINT "service_orders_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_ticketId_fkey'
  ) THEN
    ALTER TABLE "service_orders"
      ADD CONSTRAINT "service_orders_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_contractId_fkey'
  ) THEN
    ALTER TABLE "service_orders"
      ADD CONSTRAINT "service_orders_contractId_fkey"
      FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_responsibleUserId_fkey'
  ) THEN
    ALTER TABLE "service_orders"
      ADD CONSTRAINT "service_orders_responsibleUserId_fkey"
      FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_order_items_serviceOrderId_fkey'
  ) THEN
    ALTER TABLE "service_order_items"
      ADD CONSTRAINT "service_order_items_serviceOrderId_fkey"
      FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
