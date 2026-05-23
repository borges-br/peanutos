# 02 - Decisions Log

## Phase 4 Decisions

- Financial values are stored as integer cents: `monthlyAmountCents`, `unitPriceCents`, `totalPriceCents`, and `amountCents`.
- A client may have only one active primary contract of type `RECURRING_SUPPORT` or `HYBRID`. `PROJECT` and `ON_DEMAND` may coexist.
- Quota enforcement is a hard block for all roles, including OWNER and ADMIN. Administrative overrides are deferred to a future phase.
- Counted asset statuses for quota are `OPERATIONAL`, `IN_MAINTENANCE`, `OUT_OF_STANDARD`, `IN_STOCK`, and `PENDING_REVIEW`.
- Non-counted asset statuses are `RETIRED`, `SCRAPPED`, and `LOST`. Legacy statuses such as `MAINTENANCE`, `STOCK`, and `PENDING_VALIDATION` remain for compatibility but are not quota-counted.
- Contract-aware SLA selection uses an active primary contract with `slaPolicyId` when available, then falls back to the Phase 3 priority SLA.
- Billing schedule events are foundation records only. No invoice, webhook, email, payment, PIX, or NFS-e is generated in Phase 4.
- Duplicate billing schedule events are guarded by `contractId + periodKey` (`YYYY-MM`).
- Financial dashboard and financial endpoints are restricted to OWNER, ADMIN, and FINANCIAL.
- TECHNICIAN and READ_ONLY may read limited contract metadata, with financial amounts sanitized.
