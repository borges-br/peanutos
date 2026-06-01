-- Relax client registration data so PeanutOS can handle both companies and people.
ALTER TABLE "clients" ALTER COLUMN "tradeName" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "document" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "phone" DROP NOT NULL;

-- Preserve current client display data before allowing ad-hoc commercial documents.
ALTER TABLE "quotes" ADD COLUMN "clientName" VARCHAR(200);
ALTER TABLE "quotes" ADD COLUMN "clientDocument" VARCHAR(20);
ALTER TABLE "quotes" ADD COLUMN "clientEmail" VARCHAR(150);
ALTER TABLE "quotes" ADD COLUMN "clientPhone" VARCHAR(30);
UPDATE "quotes"
SET "clientName" = COALESCE("clients"."tradeName", "clients"."legalName"),
    "clientDocument" = "clients"."document",
    "clientEmail" = "clients"."email",
    "clientPhone" = "clients"."phone"
FROM "clients"
WHERE "quotes"."clientId" = "clients"."id";
ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_clientId_fkey";
ALTER TABLE "quotes" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD COLUMN "clientName" VARCHAR(200);
ALTER TABLE "invoices" ADD COLUMN "clientDocument" VARCHAR(20);
ALTER TABLE "invoices" ADD COLUMN "clientEmail" VARCHAR(150);
ALTER TABLE "invoices" ADD COLUMN "clientPhone" VARCHAR(30);
UPDATE "invoices"
SET "clientName" = COALESCE("clients"."tradeName", "clients"."legalName"),
    "clientDocument" = "clients"."document",
    "clientEmail" = "clients"."email",
    "clientPhone" = "clients"."phone"
FROM "clients"
WHERE "invoices"."clientId" = "clients"."id";
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_clientId_fkey";
ALTER TABLE "invoices" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_orders" ADD COLUMN "clientName" VARCHAR(200);
ALTER TABLE "service_orders" ADD COLUMN "clientDocument" VARCHAR(20);
ALTER TABLE "service_orders" ADD COLUMN "clientEmail" VARCHAR(150);
ALTER TABLE "service_orders" ADD COLUMN "clientPhone" VARCHAR(30);
UPDATE "service_orders"
SET "clientName" = COALESCE("clients"."tradeName", "clients"."legalName"),
    "clientDocument" = "clients"."document",
    "clientEmail" = "clients"."email",
    "clientPhone" = "clients"."phone"
FROM "clients"
WHERE "service_orders"."clientId" = "clients"."id";
ALTER TABLE "service_orders" DROP CONSTRAINT IF EXISTS "service_orders_clientId_fkey";
ALTER TABLE "service_orders" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
