'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';
import { extractArray } from '../../../../lib/api-shape';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import ClientPageHeader from '../../../../components/layout/ClientPageHeader';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
  { value: 'CRITICAL', label: 'Crítica' },
];

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
  const days = hours / 24;
  return `${Number.isInteger(days) ? days : days.toFixed(1)} d`;
}

export default function TicketSettingsPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [firstResponseMinutes, setFirstResponseMinutes] = useState('60');
  const [startMinutes, setStartMinutes] = useState('120');
  const [resolutionMinutes, setResolutionMinutes] = useState('480');
  const [isDefault, setIsDefault] = useState(false);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyRes, categoryRes] = await Promise.all([
        apiRequest<unknown>('/tickets/sla-policies'),
        apiRequest<unknown>('/tickets/categories'),
      ]);
      setPolicies(extractArray(policyRes));
      setCategories(extractArray(categoryRes));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar regras de chamados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetPolicyForm = () => {
    setName('');
    setPriority('MEDIUM');
    setFirstResponseMinutes('60');
    setStartMinutes('120');
    setResolutionMinutes('480');
    setIsDefault(false);
    setBusinessHoursOnly(false);
  };

  const handleCreatePolicy = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPolicy(true);
    setError(null);
    try {
      await apiRequest('/tickets/sla-policies', {
        method: 'POST',
        body: JSON.stringify({
          name,
          priority,
          firstResponseMinutes: Number(firstResponseMinutes),
          startMinutes: Number(startMinutes),
          resolutionMinutes: Number(resolutionMinutes),
          isDefault,
          businessHoursOnly,
          active: true,
        }),
      });
      resetPolicyForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar política de SLA.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSetDefault = async (policy: any) => {
    try {
      await apiRequest(`/tickets/sla-policies/${policy.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDefault: true }),
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao definir SLA padrão.');
    }
  };

  const handleDeletePolicy = async (policy: any) => {
    if (!confirm(`Desativar a política "${policy.name}"?`)) return;
    try {
      await apiRequest(`/tickets/sla-policies/${policy.id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao desativar política de SLA.');
    }
  };

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingCategory(true);
    setError(null);
    try {
      await apiRequest('/tickets/categories', {
        method: 'POST',
        body: JSON.stringify({ name: categoryName }),
      });
      setCategoryName('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar categoria.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: any) => {
    if (!confirm(`Excluir a categoria "${category.name}"?`)) return;
    try {
      await apiRequest(`/tickets/categories/${category.id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir categoria.');
    }
  };

  return (
    <div className="flex flex-col gap-lg select-none">
      <ClientPageHeader
        breadcrumbs={[
          { label: 'Chamados', href: '/dashboard/tickets' },
          { label: 'Regras e categorias' },
        ]}
        title="Regras e categorias"
        description="Configure políticas de SLA reutilizáveis e categorias usadas na abertura de chamados."
        secondaryActions={
          <Button variant="outline" onClick={() => router.push('/dashboard/tickets')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">arrow_back</span>
            Voltar
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-error/20 bg-error-container/10 p-md text-xs font-semibold text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-sm py-xl text-sm text-on-surface-variant">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          Carregando regras...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-lg xl:grid-cols-12">
          <section className="flex flex-col gap-md xl:col-span-8">
            <div className="rounded-xl border border-outline-variant bg-surface p-lg shadow-lg">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Políticas de SLA</h2>

              <form onSubmit={handleCreatePolicy} className="mt-md grid grid-cols-1 gap-md md:grid-cols-6">
                <div className="md:col-span-2">
                  <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: SLA Premium" />
                </div>
                <div>
                  <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={PRIORITY_OPTIONS} />
                </div>
                <Input label="1ª resposta (min)" type="number" min="1" value={firstResponseMinutes} onChange={(e) => setFirstResponseMinutes(e.target.value)} required />
                <Input label="Início (min)" type="number" min="1" value={startMinutes} onChange={(e) => setStartMinutes(e.target.value)} required />
                <Input label="Resolução (min)" type="number" min="1" value={resolutionMinutes} onChange={(e) => setResolutionMinutes(e.target.value)} required />

                <label className="flex items-center gap-sm text-[12px] text-on-surface-variant md:col-span-2">
                  <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                  Usar como padrão desta prioridade
                </label>
                <label className="flex items-center gap-sm text-[12px] text-on-surface-variant md:col-span-2">
                  <input type="checkbox" checked={businessHoursOnly} onChange={(e) => setBusinessHoursOnly(e.target.checked)} />
                  Horário comercial
                </label>
                <div className="flex justify-end md:col-span-2">
                  <Button type="submit" variant="primary" disabled={savingPolicy}>
                    {savingPolicy ? 'Salvando...' : 'Adicionar SLA'}
                  </Button>
                </div>
              </form>

              <div className="mt-lg overflow-hidden rounded-lg border border-outline-variant/50">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-surface-container-low text-on-surface-variant">
                    <tr>
                      <th className="px-sm py-2">Política</th>
                      <th className="px-sm py-2">Prioridade</th>
                      <th className="px-sm py-2">Prazos</th>
                      <th className="px-sm py-2">Uso</th>
                      <th className="px-sm py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {policies.map((policy) => (
                      <tr key={policy.id} className="bg-surface">
                        <td className="px-sm py-2 font-semibold text-on-surface">{policy.name}</td>
                        <td className="px-sm py-2 text-on-surface-variant">{policy.priority}</td>
                        <td className="px-sm py-2 font-mono text-on-surface-variant">
                          {minutesLabel(policy.firstResponseMinutes)} / {minutesLabel(policy.startMinutes)} / {minutesLabel(policy.resolutionMinutes)}
                        </td>
                        <td className="px-sm py-2">
                          {policy.isDefault ? (
                            <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Padrão</span>
                          ) : (
                            <span className="text-on-surface-variant">Customizado</span>
                          )}
                        </td>
                        <td className="px-sm py-2">
                          <div className="flex justify-end gap-xs">
                            {!policy.isDefault && (
                              <Button variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => handleSetDefault(policy)}>
                                Tornar padrão
                              </Button>
                            )}
                            <Button variant="ghost" className="h-7 px-2 text-[11px] text-error" onClick={() => handleDeletePolicy(policy)} disabled={policy.isDefault}>
                              Desativar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-md xl:col-span-4">
            <div className="rounded-xl border border-outline-variant bg-surface p-lg shadow-lg">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Categorias</h2>
              <form onSubmit={handleCreateCategory} className="mt-md flex gap-sm">
                <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Ex: Rede" required />
                <Button type="submit" variant="primary" disabled={savingCategory}>
                  Add
                </Button>
              </form>

              <div className="mt-md flex flex-wrap gap-xs">
                {categories.length === 0 ? (
                  <p className="text-[12px] text-on-surface-variant">Nenhuma categoria cadastrada.</p>
                ) : (
                  categories.map((category) => (
                    <span key={category.id} className="inline-flex items-center gap-1 rounded-md border border-outline-variant/50 bg-surface-container-low px-2 py-1 text-[11px] text-on-surface">
                      {category.name}
                      <span className="text-on-surface-variant/60">({category._count?.tickets || 0})</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        className="ml-1 rounded px-1 text-on-surface-variant hover:bg-error/10 hover:text-error"
                        aria-label={`Excluir categoria ${category.name}`}
                      >
                        x
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
