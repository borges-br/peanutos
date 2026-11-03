"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n/useI18n";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { apiRequest } from "../../lib/api";
import { DEFAULT_PUBLIC_LOGIN_BRAND } from "../../lib/public-login-brand";
import PublicLoginSurface, {
  PublicLoginBrand,
} from "../../components/layout/PublicLoginSurface";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [publicBrand, setPublicBrand] = useState<PublicLoginBrand | null>(null);
  const [brandReady, setBrandReady] = useState(false);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 5000);
    apiRequest<{ brand: PublicLoginBrand | null }>("/public/branding/login", {
      signal: abort.signal,
      cache: "no-store",
    })
      .then((data) => {
        if (active) setPublicBrand(data.brand);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        if (active) setBrandReady(true);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      abort.abort();
    };
  }, []);
  useEffect(() => {
    if (!publicBrand) return;
    document.title = publicBrand.name;
  }, [publicBrand]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const expiredByQuery = params.get("session") === "expired";
    const expiredByStorage =
      sessionStorage.getItem("peanut_session_expired") === "true";
    if (expiredByQuery || expiredByStorage) {
      setError("Sua sessão expirou. Faça login novamente para continuar.");
      sessionStorage.removeItem("peanut_session_expired");
      if (expiredByQuery) {
        window.history.replaceState(null, "", "/login");
      }
    }
  }, []);

  useEffect(() => {
    async function checkSetup() {
      try {
        const { requiresSetup } = await apiRequest<{ requiresSetup: boolean }>(
          "/setup/status",
        );
        if (requiresSetup) {
          router.replace("/setup");
        }
      } catch {
        // If API is unreachable, stay on login page
      }
    }
    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Falha ao realizar login. Tente novamente.");
      setLoading(false);
    }
  };

  const credentialsForm = (
    <>
      {/* Error alert banner */}
      {error && (
        <div className="mb-md bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm text-center animate-in fade-in duration-200">
          {error}
        </div>
      )}

      {/* Form elements */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-md">
        <Input mask="email"
          id="email"
          type="email"
          label={t.auth.email}
          placeholder="exemplo@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <Input
          id="password"
          type="password"
          label={t.auth.password}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2 py-2"
          loading={loading}
        >
          {loading ? t.auth.signingIn : t.auth.signIn}
        </Button>
      </form>
    </>
  );
  if (!brandReady)
    return (
      <main className="brand-login-loading" aria-busy="true">
        Carregando…
      </main>
    );
  return (
      <PublicLoginSurface
        brand={publicBrand || DEFAULT_PUBLIC_LOGIN_BRAND}
        title={t.auth.loginTitle}
        message={t.auth.loginSubtitle}
      >
        {credentialsForm}
      </PublicLoginSurface>
    );

}
