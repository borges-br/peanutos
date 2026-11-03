export interface BillingNoteItem {
  billingNote?: string | null;
  billingProration?: "NONE" | "DAILY" | null;
}

/** Presentation only: old issued snapshots may still contain "sem rateio". */
export function invoiceBillingNote(item: BillingNoteItem): string {
  const note = item.billingNote?.trim() || "";
  // Before billingProration was included, this exact generated phrase was only
  // produced for items explicitly configured as DAILY. Preserve those snapshots.
  const legacyDaily =
    item.billingProration == null &&
    /(?:^|·)\s*Rateio:\s*\d+\/\d+\s*dias\b/i.test(note);
  if (item.billingProration === "DAILY" || legacyDaily) return note;
  return note
    .split("·")
    .map((part) => part.trim())
    .filter((part) => part && !/rateio|prorata|proration/i.test(part))
    .join(" · ");
}
