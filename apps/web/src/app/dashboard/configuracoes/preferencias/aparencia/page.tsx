"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../../../../context/AuthContext";
import {
  applyAppearance,
  defaultAppearance,
  saveAppearance,
} from "../../../../../lib/appearance";
import Button from "../../../../../components/ui/Button";
export default function AppearancePage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(defaultAppearance),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (user) setPrefs(applyAppearance(user));
  }, [user]);
  function change(key: string, value: any) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveAppearance(user, next);
    setNotice("Preferência salva neste navegador.");
  }
  return (
    <div className="space-y-lg max-w-4xl">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Do seu jeito</span>
          <h1>Aparência</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setPrefs(defaultAppearance);
            saveAppearance(user, defaultAppearance);
            setNotice("Aparência padrão restaurada.");
          }}
        >
          Restaurar padrão
        </Button>
      </header>
      <section className="settings-panel">
        <h2>Cor de destaque</h2>
        <div className="flex flex-wrap gap-md mt-md">
          {[
            { value: "mint", label: "Maré", color: "#93e2cf" },
            { value: "iris", label: "Íris", color: "#bfc4ff" },
            { value: "amber", label: "Âmbar", color: "#f1c686" },
          ].map((a) => (
            <button
              key={a.value}
              onClick={() => change("accent", a.value)}
              aria-pressed={prefs.accent === a.value}
              className="accent-choice"
            >
              <span style={{ background: a.color }} />
              {a.label}
              {prefs.accent === a.value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-panel space-y-lg">
        <h2>Conforto de leitura</h2>
        <label className="preference-row">
          <span>Densidade</span>
          <select
            value={prefs.density}
            onChange={(e) => change("density", e.target.value)}
          >
            <option value="comfortable">Confortável</option>
            <option value="compact">Compacta</option>
          </select>
        </label>
        <label className="preference-row">
          <span>Contraste</span>
          <select
            value={prefs.contrast}
            onChange={(e) => change("contrast", e.target.value)}
          >
            <option value="normal">Padrão</option>
            <option value="high">Alto contraste</option>
          </select>
        </label>
        <label className="preference-row">
          <span>Texto maior</span>
          <input
            type="checkbox"
            checked={prefs.largeText}
            onChange={(e) => change("largeText", e.target.checked)}
          />
        </label>
        <label className="preference-row">
          <span>Transições suaves</span>
          <input
            type="checkbox"
            checked={prefs.motion}
            onChange={(e) => change("motion", e.target.checked)}
          />
        </label>
      </section>
      <p role="status" className="text-primary">
        {notice}
      </p>
    </div>
  );
}
