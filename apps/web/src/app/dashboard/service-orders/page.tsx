'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import PlannedState from '../../../components/ui/PlannedState';

export default function ServiceOrdersPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'OPEN', label: 'Aberta' },
    { value: 'IN_PROGRESS', label: 'Em Execução' },
    { value: 'COMPLETED', label: 'Concluída' },
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            Ordens de Serviço (O.S.)
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            Gerencie atendimentos em campo, visitas presenciais e relatórios de execução técnica.
          </p>
        </div>
        
        <Button variant="primary" onClick={() => router.push('/dashboard/service-orders/new')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">add_circle</span>
          Nova O.S.
        </Button>
      </header>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-md justify-between items-stretch md:items-center bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <div className="flex gap-sm flex-1 max-w-xl">
          <Input
            type="text"
            placeholder="Buscar por número, chamado ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
            disabled
          />
          <Button type="button" variant="secondary" className="px-5 opacity-60" disabled>
            Buscar
          </Button>
        </div>

        <div className="flex gap-sm items-center">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={statusOptions}
            className="min-w-[160px]"
            disabled
          />
        </div>
      </div>

      {/* Planned State component */}
      <PlannedState
        title="Módulo de Ordens de Serviço Planejado"
        description="A emissão de ordens de serviço (O.S.) permitirá rastrear visitas operacionais presenciais, coletar assinaturas e peças fornecidas na próxima fase."
      />
    </div>
  );
}
