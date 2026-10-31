import { redirect } from "next/navigation";

export default function LegacyBrandPage() {
  redirect("/dashboard/configuracoes/aparencia?secao=empresa");
}
