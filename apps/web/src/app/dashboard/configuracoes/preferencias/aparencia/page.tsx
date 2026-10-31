import { redirect } from "next/navigation";

export default function LegacyPersonalAppearancePage() {
  redirect("/dashboard/configuracoes/aparencia?secao=pessoal");
}
