import AppearanceSettings from "../../../../components/settings/AppearanceSettings";

export default function AppearancePage({
  searchParams,
}: {
  searchParams: { secao?: string; area?: string };
}) {
  return (
    <AppearanceSettings
      initialSection={searchParams.secao === "pessoal" ? "personal" : "company"}
      initialBrandTab={searchParams.area}
    />
  );
}
