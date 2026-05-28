-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "netAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotalMaterialCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quote_items" ADD COLUMN     "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "netAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotalMaterialCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

