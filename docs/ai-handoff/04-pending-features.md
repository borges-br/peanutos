# 04 — Pending Features

This document maps all remaining operational and technical features planned for **Peanut OS** in future phases.

---

## 1. Ticketing & SLA Foundation (Phase 3)
- **SLA Priority Engine**: Calculate response and resolution deadlines automatically based on priority level (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- **Helpdesk Board**: Visual Next.js dashboard at `/dashboard/tickets` displaying cards of tickets, priority markers, and SLA warnings.
- **SLA Alert System**: BullMQ background workers dispatching alerts if a ticket is approaching breach.
- **Closure Summaries**: Capturing technical hours used and resolution details upon ticket closure.

---

## 2. Advanced Contracts, SLA & Financials (Phase 4)
- **Contract Tracking**: Association of service contracts to clients, enforcing user/asset quotas.
- **Billing Days**: Automated tracking of monthly contract values and pix keys.
- **Financial summary dashboard**: Showing overall monthly recurring revenue (MRR) and active billing summaries.

---

## 3. Documents Engine & PDF Exports (Phase 5)
- **Playwright PDF Worker**: Background service rendering clean, print-ready PDF attachments for closed tickets, invoice quotes, and quarterly reports.
- **Immutable Storage**: Archiving generated files in local MinIO or remote AWS S3 buckets.

---

## 4. White-Label Branding & Portals (Phase 6)
- **Operator customization**: Dynamic workspace branding logos, custom slug subdomains, and color templates.
- **Client Portal**: Restrictive, secure login portal for client contacts to view their own inventory, tickets, and contracts.
- **Webhook Dispatcher**: Dispatching events to third-party APIs (like n8n) signed with HMAC SHA256 signatures.
