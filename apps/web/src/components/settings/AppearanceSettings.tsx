"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import BrandStudio from "./BrandStudio";
import PersonalAppearance from "./PersonalAppearance";

type Section = "company" | "personal";
const sections = [
  { id: "company", label: "Marca da empresa", query: "empresa" },
  { id: "personal", label: "Minha visualização", query: "pessoal" },
] as const;

export default function AppearanceSettings({
  initialSection,
  initialBrandTab,
}: {
  initialSection: Section;
  initialBrandTab?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const canManageBrand = ["OWNER", "ADMIN"].includes(user?.role);
  const [section, setSection] = useState(initialSection);
  const [visited, setVisited] = useState({
    company: initialSection === "company",
    personal: initialSection === "personal",
  });
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    setSection(initialSection);
    setVisited((previous) => ({ ...previous, [initialSection]: true }));
  }, [initialSection]);
  const activeSection = canManageBrand ? section : "personal";

  function selectSection(index: number) {
    const next = sections[index]!;
    setSection(next.id);
    setVisited((previous) => ({ ...previous, [next.id]: true }));
    router.replace(`/dashboard/configuracoes/aparencia?secao=${next.query}`, {
      scroll: false,
    });
  }

  return (
    <div className="appearance-settings space-y-lg">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Configurações</span>
          <h1>Aparência</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            {canManageBrand
              ? "Personalize a identidade da empresa e seu conforto de leitura."
              : "Ajuste seu conforto de leitura neste navegador."}
          </p>
        </div>
      </header>
      {canManageBrand && (
        <div
          className="brand-studio-tabs appearance-scopes"
          role="tablist"
          aria-label="Âmbito da aparência"
        >
          {sections.map((item, index) => (
            <Button
              key={item.id}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`appearance-tab-${item.id}`}
              aria-controls={`appearance-panel-${item.id}`}
              aria-selected={activeSection === item.id}
              tabIndex={activeSection === item.id ? 0 : -1}
              variant={activeSection === item.id ? "primary" : "ghost"}
              onClick={() => selectSection(index)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 1
                      : 1 - index;
                selectSection(next);
                tabs.current[next]?.focus();
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
      {canManageBrand && (visited.company || activeSection === "company") && (
        <section
          id="appearance-panel-company"
          role="tabpanel"
          aria-labelledby="appearance-tab-company"
          hidden={activeSection !== "company"}
        >
          <BrandStudio initialTab={initialBrandTab} />
        </section>
      )}
      {(visited.personal || activeSection === "personal") && (
        <section
          id="appearance-panel-personal"
          role={canManageBrand ? "tabpanel" : undefined}
          aria-labelledby={
            canManageBrand ? "appearance-tab-personal" : undefined
          }
          hidden={activeSection !== "personal"}
        >
          <PersonalAppearance />
        </section>
      )}
    </div>
  );
}
