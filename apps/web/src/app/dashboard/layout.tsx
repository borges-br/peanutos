"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { destinations } from "../../lib/navigation";
import AppShell from "../../components/layout/AppShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const getPageTitle = () =>
    destinations
      .filter((d) =>
        d.href === "/dashboard"
          ? pathname === d.href
          : pathname?.startsWith(d.href),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.label || "Peanut OS";

  return <AppShell title={getPageTitle()}>{children}</AppShell>;
}
