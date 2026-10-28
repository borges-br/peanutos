ALTER TABLE "contracts"
  ADD COLUMN "billingIssueDay" INTEGER,
  ADD COLUMN "billingIssueTime" VARCHAR(5) NOT NULL DEFAULT '09:00',
  ADD COLUMN "billingAutoIssue" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "billingAutoEmail" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "billingEmailRecipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "billingWhatsappNumbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "billingPaymentMethod" VARCHAR(30) NOT NULL DEFAULT 'PIX',
  ADD COLUMN "billingPixKey" VARCHAR(100);

ALTER TABLE "invoice_items"
  ADD COLUMN "billingKind" VARCHAR(20),
  ADD COLUMN "sourceTicketId" UUID,
  ADD COLUMN "sourceServiceOrderId" UUID;

ALTER TABLE "billing_schedule_events"
  ADD COLUMN "invoiceId" UUID,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" UUID,
  ADD COLUMN "emailRecipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "emailStatus" VARCHAR(30) NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN "emailAcceptedRecipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "emailRejectedRecipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "emailMessageId" VARCHAR(255),
  ADD COLUMN "emailSentAt" TIMESTAMP(3),
  ADD COLUMN "emailAttemptedAt" TIMESTAMP(3),
  ADD COLUMN "emailNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "emailAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "emailLastError" VARCHAR(255),
  ADD COLUMN "emailPdfFileObjectId" UUID,
  ADD COLUMN "documentSnapshot" JSONB;

CREATE UNIQUE INDEX "billing_schedule_events_invoiceId_key" ON "billing_schedule_events"("invoiceId");
ALTER TABLE "billing_schedule_events" ADD CONSTRAINT "billing_schedule_events_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_billingIssueDay_check" CHECK ("billingIssueDay" BETWEEN 1 AND 31);

CREATE INDEX "invoice_items_sourceTicketId_idx" ON "invoice_items"("sourceTicketId");
CREATE INDEX "invoice_items_sourceServiceOrderId_idx" ON "invoice_items"("sourceServiceOrderId");
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_sourceTicketId_fkey" FOREIGN KEY ("sourceTicketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_sourceServiceOrderId_fkey" FOREIGN KEY ("sourceServiceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "billing_schedule_events_status_scheduledFor_idx" ON "billing_schedule_events"("status", "scheduledFor");
CREATE INDEX "billing_schedule_events_emailStatus_emailNextAttemptAt_idx" ON "billing_schedule_events"("emailStatus", "emailNextAttemptAt");
