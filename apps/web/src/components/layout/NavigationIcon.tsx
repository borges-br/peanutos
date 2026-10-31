import React from "react";

// The bundled variable font contains this small subset. New icons safely use
// the existing full font until the subset is regenerated from its provenance.
const variableIcons = new Set([
  "account_balance_wallet",
  "confirmation_number",
  "construction",
  "description",
  "design_services",
  "devices",
  "edit_document",
  "folder",
  "groups",
  "history",
  "mail",
  "palette",
  "picture_as_pdf",
  "receipt_long",
  "request_quote",
  "settings",
  "space_dashboard",
  "webhook",
]);
export default function NavigationIcon({ name }: { name: string }) {
  return (
    <span
      className={`material-symbols-outlined${variableIcons.has(name) ? " brand-navigation-symbol" : ""}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
