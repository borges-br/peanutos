-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "gatewayBillingType" VARCHAR(20) NOT NULL DEFAULT 'PIX';

-- CreateTable
CREATE TABLE "billing_connections" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "environment" VARCHAR(20) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyEncrypted" TEXT,
    "webhookTokenEncrypted" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "state" VARCHAR(30) NOT NULL,
    "externalId" VARCHAR(100),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_charges" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "externalReference" VARCHAR(150) NOT NULL,
    "externalId" VARCHAR(100),
    "externalCustomerId" VARCHAR(100),
    "billingType" VARCHAR(20) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "state" VARCHAR(30) NOT NULL,
    "providerStatus" VARCHAR(50),
    "paymentUrl" TEXT,
    "bankSlipUrl" TEXT,
    "receivedCents" INTEGER NOT NULL DEFAULT 0,
    "netReceivedCents" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_receipts" (
    "id" UUID NOT NULL,
    "chargeId" UUID NOT NULL,
    "principalCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "netCents" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_gateway_events" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "externalEventId" VARCHAR(200) NOT NULL,
    "paymentId" VARCHAR(100) NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_gateway_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_connections_workspaceId_provider_environment_key" ON "billing_connections"("workspaceId", "provider", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_connectionId_clientId_key" ON "billing_customers"("connectionId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_charges_invoiceId_connectionId_key" ON "billing_charges"("invoiceId", "connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_charges_connectionId_externalId_key" ON "billing_charges"("connectionId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_charges_connectionId_externalReference_key" ON "billing_charges"("connectionId", "externalReference");

-- CreateIndex
CREATE INDEX "billing_receipts_chargeId_occurredAt_idx" ON "billing_receipts"("chargeId", "occurredAt");

-- CreateIndex
CREATE INDEX "billing_gateway_events_processedAt_nextAttemptAt_idx" ON "billing_gateway_events"("processedAt", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_gateway_events_connectionId_externalEventId_key" ON "billing_gateway_events"("connectionId", "externalEventId");

-- AddForeignKey
ALTER TABLE "billing_connections" ADD CONSTRAINT "billing_connections_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "billing_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_charges" ADD CONSTRAINT "billing_charges_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_charges" ADD CONSTRAINT "billing_charges_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "billing_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_receipts" ADD CONSTRAINT "billing_receipts_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "billing_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_gateway_events" ADD CONSTRAINT "billing_gateway_events_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "billing_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
