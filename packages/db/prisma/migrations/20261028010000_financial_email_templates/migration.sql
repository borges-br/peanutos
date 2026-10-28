CREATE TABLE "email_templates" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "email_templates_workspaceId_name_key" ON "email_templates"("workspaceId", "name");
CREATE INDEX "email_templates_workspaceId_active_idx" ON "email_templates"("workspaceId", "active");
CREATE UNIQUE INDEX "email_templates_one_default" ON "email_templates"("workspaceId") WHERE "isDefault" AND "active";
ALTER TABLE "contracts" ADD COLUMN "billingEmailTemplateId" UUID;
ALTER TABLE "billing_schedule_events" ADD COLUMN "emailTemplateSnapshot" JSONB;
