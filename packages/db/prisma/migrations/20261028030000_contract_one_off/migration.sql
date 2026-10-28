ALTER TABLE "contract_line_items" ADD COLUMN "servicePeriod" VARCHAR(7), ADD COLUMN "chargePeriod" VARCHAR(7);
ALTER TABLE "contract_line_items" DROP CONSTRAINT "contract_items_billing_role_check";
ALTER TABLE "contract_line_items" ADD CONSTRAINT "contract_items_billing_role_check" CHECK ("billingRole" IN ('BASE','ADDON','ONE_OFF'));
ALTER TABLE "contract_line_items" ADD CONSTRAINT "contract_items_one_off_period_check" CHECK ("billingRole" <> 'ONE_OFF' OR ("recurring" = false AND "servicePeriod" IS NOT NULL AND "chargePeriod" IS NOT NULL AND "servicePeriod" ~ '^\d{4}-(0[1-9]|1[0-2])$' AND "chargePeriod" ~ '^\d{4}-(0[1-9]|1[0-2])$' AND "chargePeriod" >= "servicePeriod"));
CREATE INDEX "contract_line_items_contractId_chargePeriod_idx" ON "contract_line_items"("contractId", "chargePeriod");
