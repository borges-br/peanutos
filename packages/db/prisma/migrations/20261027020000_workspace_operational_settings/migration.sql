ALTER TABLE "workspaces"
  ADD COLUMN "contractEndingSoonDays" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "ticketFeedbackAfterHours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "automationIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "lastAutomationSweepAt" TIMESTAMP(3),
  ADD COLUMN "webhookMaxAttempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "webhookTimeoutMs" INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 45;

CREATE TABLE "workspace_email_settings" (
  "workspaceId" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "host" VARCHAR(253) NOT NULL DEFAULT '',
  "port" INTEGER NOT NULL DEFAULT 587,
  "security" VARCHAR(20) NOT NULL DEFAULT 'STARTTLS',
  "username" VARCHAR(254) NOT NULL DEFAULT '',
  "passwordEncrypted" TEXT,
  "fromEmail" VARCHAR(254) NOT NULL DEFAULT '',
  "fromName" VARCHAR(150) NOT NULL DEFAULT '',
  "replyTo" VARCHAR(254),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "lastTestAt" TIMESTAMP(3),
  "lastTestStatus" VARCHAR(20),
  "lastTestError" VARCHAR(255),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_email_settings_pkey" PRIMARY KEY ("workspaceId"),
  CONSTRAINT "workspace_email_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workspace_email_settings_port_check" CHECK ("port" BETWEEN 1 AND 65535),
  CONSTRAINT "workspace_email_settings_security_check" CHECK ("security" IN ('STARTTLS', 'TLS'))
);
