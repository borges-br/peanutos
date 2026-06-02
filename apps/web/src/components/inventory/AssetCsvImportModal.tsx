import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { downloadInventoryAdScript, INVENTORY_AD_IMPORT_SCRIPT } from '../../lib/inventory-ad-import';
import Button from '../ui/Button';
import Select from '../ui/Select';

type ClientOption = {
  id: string;
  label: string;
};

type ImportSummary = {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors?: Array<{ line: number; message: string }>;
};

interface AssetCsvImportModalProps {
  clientId?: string;
  clientName?: string;
  clients?: ClientOption[];
  onClose: () => void;
  onImported: () => void;
}

export default function AssetCsvImportModal({
  clientId,
  clientName,
  clients = [],
  onClose,
  onImported,
}: AssetCsvImportModalProps) {
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);

  useEffect(() => {
    setSelectedClientId(clientId || '');
  }, [clientId]);

  const clientOptions = [
    { value: '', label: 'Selecione o cliente...' },
    ...clients.map((client) => ({ value: client.id, label: client.label })),
  ];

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    setResult(null);

    if (!file) {
      setCsvText('');
      setFileName('');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Selecione um arquivo .csv.');
      setCsvText('');
      setFileName('');
      return;
    }

    setCsvText(await file.text());
    setFileName(file.name);
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(INVENTORY_AD_IMPORT_SCRIPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Nao foi possivel copiar o script automaticamente.');
    }
  };

  const handleImport = async () => {
    setError(null);
    setResult(null);

    if (!selectedClientId) {
      setError('Selecione o cliente que recebera os ativos.');
      return;
    }

    if (!csvText.trim()) {
      setError('Selecione o CSV gerado no Windows Server PowerShell.');
      return;
    }

    setSubmitting(true);
    try {
      const summary = await apiRequest<ImportSummary>(`/clients/${selectedClientId}/assets/import-csv`, {
        method: 'POST',
        body: JSON.stringify({ csvText }),
      });
      setResult(summary);
      onImported();
    } catch (err: any) {
      setError(err.message || 'Falha ao importar ativos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-md backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-outline-variant/40 p-lg">
          <div>
            <h3 className="font-title-sm text-sm font-bold text-on-surface">Importar ativos via CSV</h3>
            <p className="mt-1 text-[12px] text-on-surface-variant">
              Use o arquivo gerado no Windows Server PowerShell.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} className="h-8 w-8 px-0 py-0 text-xl leading-none">
            &times;
          </Button>
        </header>

        <div className="flex flex-col gap-md overflow-y-auto p-lg">
          {error && (
            <div className="rounded-xl border border-error-container/20 bg-error-container/10 p-sm text-xs font-semibold text-error">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-sm text-xs font-semibold text-on-surface">
              Importacao concluida: {result.created} criado(s), {result.updated} atualizado(s), {result.skipped} ignorado(s) de {result.totalRows} linha(s).
            </div>
          )}

          {clientId ? (
            <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-sm text-[12px] text-on-surface-variant">
              Cliente selecionado: <span className="font-semibold text-on-surface">{clientName || clientId}</span>
            </div>
          ) : (
            <Select
              label="Cliente destino"
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              options={clientOptions}
            />
          )}

          <div className="flex flex-col gap-xs">
            <label className="text-[12px] font-semibold text-on-surface-variant">Arquivo CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm text-on-surface file:mr-4 file:rounded-md file:border-0 file:bg-surface-container-highest file:px-3 file:py-1 file:text-on-surface"
            />
            {fileName && <span className="text-[11px] text-on-surface-variant">Selecionado: {fileName}</span>}
          </div>

          <div className="flex flex-wrap gap-sm">
            <Button type="button" variant="outline" onClick={downloadInventoryAdScript}>
              <span className="material-symbols-outlined mr-1.5 text-[16px]">download</span>
              Baixar script .ps1
            </Button>
            <Button type="button" variant="outline" onClick={handleCopyScript}>
              <span className="material-symbols-outlined mr-1.5 text-[16px]">content_copy</span>
              {copied ? 'Copiado' : 'Copiar script'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowHelp((value) => !value)}>
              <span className="material-symbols-outlined mr-1.5 text-[16px]">help</span>
              Ajuda
            </Button>
          </div>

          {showHelp && (
            <div className="flex flex-col gap-sm rounded-xl border border-outline-variant/40 bg-surface-container-low p-md text-[12px] text-on-surface-variant">
              <p>
                Execute o arquivo <strong>gerar-inventario-ativos-ad.ps1</strong> no Windows Server PowerShell do servidor AD.
                O usuario precisa permissao para consultar o Active Directory e, se usar Hyper-V, permissao nos hosts configurados.
              </p>
              <p>
                O CSV deve manter cabecalhos como Nome, NomeDNS, TipoProvavel, SistemaOperacionalAD, SistemaOperacionalCIM,
                Fabricante, Modelo, Serial, IPsDetectados, MACsHyperV, OU e Observacoes.
              </p>
              <pre className="max-h-48 overflow-auto rounded-lg border border-outline-variant bg-surface p-sm text-[11px] text-on-surface">
                {INVENTORY_AD_IMPORT_SCRIPT}
              </pre>
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-sm border-t border-outline-variant/40 p-lg">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" variant="primary" loading={submitting} onClick={handleImport}>
            Importar CSV
          </Button>
        </footer>
      </div>
    </div>
  );
}
