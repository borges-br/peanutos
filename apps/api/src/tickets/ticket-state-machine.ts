import { TicketStatus } from "@peanut/db";

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["TRIAGE", "IN_PROGRESS", "CANCELLED"],
  TRIAGE: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: [
    "WAITING_CLIENT",
    "WAITING_THIRD_PARTY",
    "RESOLVED",
    "CANCELLED",
  ],
  WAITING_CLIENT: ["IN_PROGRESS"],
  WAITING_THIRD_PARTY: ["IN_PROGRESS"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

/**
 * Validates if a status transition is permitted under the Phase 3 State Machine rules.
 */
export function isValidTransition(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
