# 06 — Agent Instructions

This repository is built sequentially by multiple AI agents (Claude, Antigravity, Codex, Cursor). To preserve architectural coherence, you **must** strictly adhere to the following rules:

---

## 🚦 Core Directives

1. **No Destructive Architectural Changes**:
   - Do not replace or scrap established packages (`@peanut/db`, `@peanut/types`, etc.) without documenting explicit engineering justifications in `02-decisions-log.md`.
2. **Preserve Continuity Logs**:
   - Every coding cycle must end by updating the `/docs/ai-handoff` documentation, specifically:
     - `00-current-state.md`
     - `01-next-steps.md`
     - `03-implemented-features.md`
     - `04-pending-features.md`
     - `05-known-issues.md`
     - `NEXT_AGENT_PROMPT.md`
3. **Keep the Build Green**:
   - Never finalize a session leaving compilation errors, failing typescript typechecks, or invalid schemas. Run `pnpm run build` or `turbo run build` before wrapping up.
4. **No Real Secrets**:
   - Never commit actual client data, real phone numbers, real API keys, or production `.env` files. Ensure seed scripts remain completely fictive (e.g. Acme Tech).
5. **White-Label Customization compliance**:
   - Never hardcode "Borges OS" or other specific brand labels in user interfaces. Leverage `process.env.NEXT_PUBLIC_BRAND_NAME` or custom brand modules.

---

## 💻 Coding Style Guidelines
- Use explicit TypeScript types, strict null checks, and avoid any loose usages of `any`.
- Keep Zod validation models synchronized inside `@peanut/validators`.
- Keep NestJS modules scoped and encapsulate DB operations inside services.
