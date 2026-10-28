ALTER TABLE "contract_line_items"
  ADD COLUMN "billingRole" VARCHAR(20) NOT NULL DEFAULT 'BASE',
  ADD COLUMN "startsOn" DATE,
  ADD COLUMN "endsOn" DATE,
  ADD COLUMN "endMode" VARCHAR(20) NOT NULL DEFAULT 'CONTRACT',
  ADD COLUMN "proration" VARCHAR(20) NOT NULL DEFAULT 'NONE',
  ADD CONSTRAINT "contract_items_billing_role_check" CHECK ("billingRole" IN ('BASE', 'ADDON')),
  ADD CONSTRAINT "contract_items_end_mode_check" CHECK ("endMode" IN ('OPEN', 'CONTRACT', 'DATE')),
  ADD CONSTRAINT "contract_items_proration_check" CHECK ("proration" IN ('NONE', 'DAILY')),
  ADD CONSTRAINT "contract_addon_validity_check" CHECK (
    "billingRole" <> 'ADDON' OR ("recurring" AND "startsOn" IS NOT NULL AND
      (("endMode" = 'DATE' AND "endsOn" IS NOT NULL AND "endsOn" >= "startsOn") OR
       ("endMode" <> 'DATE' AND "endsOn" IS NULL)))
  );
ALTER TABLE "invoice_items"
  ADD COLUMN "sourceContractLineItemId" UUID,
  ADD COLUMN "recurrenceSnapshot" JSONB;
ALTER TABLE "billing_schedule_events"
  ADD COLUMN "needsRecurringRefresh" BOOLEAN NOT NULL DEFAULT false;
