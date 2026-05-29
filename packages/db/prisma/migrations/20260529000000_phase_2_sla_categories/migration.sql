ALTER TABLE "clients"
ADD COLUMN IF NOT EXISTS "slaPolicyId" UUID;

ALTER TABLE "tickets"
ADD COLUMN IF NOT EXISTS "categoryId" UUID,
ADD COLUMN IF NOT EXISTS "category" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "subcategory" VARCHAR(100);

ALTER TABLE "sla_policies"
ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

UPDATE "sla_policies"
SET "isDefault" = true
WHERE "name" ILIKE 'SLA Padrão%';

ALTER TABLE "sla_policies"
DROP CONSTRAINT IF EXISTS "sla_policies_workspaceId_priority_key";

CREATE INDEX IF NOT EXISTS "sla_policies_workspaceId_priority_idx"
ON "sla_policies"("workspaceId", "priority");

CREATE TABLE IF NOT EXISTS "ticket_categories" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_categories_workspaceId_name_key"
ON "ticket_categories"("workspaceId", "name");

CREATE INDEX IF NOT EXISTS "ticket_categories_workspaceId_idx"
ON "ticket_categories"("workspaceId");

CREATE INDEX IF NOT EXISTS "tickets_workspaceId_categoryId_idx"
ON "tickets"("workspaceId", "categoryId");

ALTER TABLE "clients"
DROP CONSTRAINT IF EXISTS "clients_slaPolicyId_fkey";

ALTER TABLE "clients"
ADD CONSTRAINT "clients_slaPolicyId_fkey"
FOREIGN KEY ("slaPolicyId") REFERENCES "sla_policies"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ticket_categories"
DROP CONSTRAINT IF EXISTS "ticket_categories_workspaceId_fkey";

ALTER TABLE "ticket_categories"
ADD CONSTRAINT "ticket_categories_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tickets"
DROP CONSTRAINT IF EXISTS "tickets_categoryId_fkey";

ALTER TABLE "tickets"
ADD CONSTRAINT "tickets_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "ticket_categories"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
