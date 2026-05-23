# 04 — Pending Features

This document maps all remaining operational and technical features planned for **Peanut OS** in future phases.

---

## 1. Advanced Contracts, SLA & Financials (Phase 4)
- **Contract Association**: Registration of service contracts linking to clients, enforcing user and asset quotas.
- **Quota Exceeded Blockers**: REST API service validation rejecting asset/user creation if contract limits are breached.
- **Pix & Billing Days**: Automatic monthly invoice triggers and Pix keys configuration.
- **Financial MRR Dashboard**: Summary of monthly recurring revenue (MRR), billing days progress, and active contracts.
- **BullMQ Billing Worker**: Scheduler triggers in `apps/worker` generating monthly contract billing drafts.

---

## 2. Documents Engine & PDF Exports (Phase 5)
- **Playwright PDF Worker**: Background service rendering clean, print-ready PDF attachments for closed tickets, invoice quotes, and quarterly reports.
- **Immutable Storage**: Archiving generated files in local MinIO or remote AWS S3 buckets.

---

## 3. White-Label Branding & Portals (Phase 6)
- **Operator customization**: Dynamic workspace branding logos, custom slug sub subdomain mapping, and custom color templates.
- **Client Portal**: Restrictive, secure login portal for client contacts to view their own inventory, tickets, and contracts.
- **Webhook Dispatcher**: Dispatching events to third-party APIs (like n8n) signed with HMAC SHA256 signatures.
