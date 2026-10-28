"use client";
import React, { useState } from "react";
import { dateKey } from "@peanut/utils/dist/timezone";
import { apiRequest } from "../../lib/api";
import { useWorkspaceFormatters } from "../../i18n/useWorkspaceFormatters";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

export default function ContractItemsPanel({
  contract,
  canEdit,
  onSaved,
}: {
  contract: any;
  canEdit: boolean;
  onSaved: () => Promise<void>;
}) {
  const { timeZone, formatCalendarDate } = useWorkspaceFormatters();
  const empty = () => {
    const [year, month] = dateKey(new Date(), timeZone)
      .slice(0, 7)
      .split("-")
      .map(Number);
    return {
      description: "",
      itemType: "SERVICE",
      quantity: "1",
      unitPrice: "0",
      recurring: true,
      servicePeriod: dateKey(new Date(), timeZone).slice(0, 7),
      chargePeriod: new Date(Date.UTC(year!, month!, 1))
        .toISOString()
        .slice(0, 7),
      billingRole: "ONE_OFF",
      startsOn: dateKey(new Date(), timeZone),
      endMode: "CONTRACT",
      endsOn: "",
      proration: "NONE",
    };
  };
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const money = (value: number) =>
    canEdit
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value / 100)
      : "Protegido";
  const change = (key: string, value: any) => {
    setForm((previous: any) => ({
      ...previous,
      [key]: value,
      ...(key === "billingRole" && value === "ADDON"
        ? { recurring: true }
        : {}),
    }));
    setNotice("");
  };
  function edit(item: any) {
    setEditing(item.id);
    setError("");
    setNotice("");
    setForm({
      description: item.description,
      itemType: item.itemType,
      quantity: String(item.quantity),
      unitPrice: (item.unitPriceCents / 100).toFixed(2),
      recurring: item.recurring,
      servicePeriod:
        item.servicePeriod || dateKey(new Date(), timeZone).slice(0, 7),
      chargePeriod: item.chargePeriod || "",
      billingRole: item.billingRole || "BASE",
      startsOn: item.startsOn?.slice(0, 10) || dateKey(new Date(), timeZone),
      endMode: item.endMode || "CONTRACT",
      endsOn: item.endsOn?.slice(0, 10) || "",
      proration: item.proration || "NONE",
    });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(
        `/contracts/${contract.id}/line-items${editing ? `/${editing}` : ""}`,
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            description: form.description.trim(),
            itemType: form.itemType,
            quantity: Number(form.quantity),
            unitPriceCents: Math.round(Number(form.unitPrice) * 100),
            recurring: form.billingRole === "ONE_OFF" ? false : true,
            billingRole: form.billingRole,
            servicePeriod: form.servicePeriod,
            chargePeriod: form.chargePeriod,
            startsOn: form.billingRole === "ADDON" ? form.startsOn : null,
            endsOn:
              form.billingRole === "ADDON" && form.endMode === "DATE"
                ? form.endsOn
                : null,
            endMode: form.endMode,
            proration: form.proration,
          }),
        },
      );
      await onSaved();
      setForm(empty());
      setEditing(null);
      setNotice(
        form.billingRole === "ONE_OFF"
          ? "Pontual salvo para a fatura de " +
              form.chargePeriod.split("-").reverse().join("/") +
              "."
          : "Item salvo.",
      );
    } catch (cause: any) {
      setError(cause.message || "Falha ao salvar o item.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: any) {
    if (
      !confirm(
        `Remover ${item.description} das próximas cobranças? Para programar o encerramento, prefira editar a data de término. Rascunhos precisarão ser atualizados; faturas emitidas permanecem iguais.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/contracts/${contract.id}/line-items/${item.id}`, {
        method: "DELETE",
      });
      await onSaved();
      if (editing === item.id) {
        setEditing(null);
        setForm(empty());
      }
      setNotice("Item removido. Atualize e confira os rascunhos existentes.");
    } catch (cause: any) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  const groups = [
    { role: "ONE_OFF", title: "Cobranças pontuais", text: "" },
    {
      role: "BASE",
      title: "Itens incluídos na mensalidade",
      text: "Já fazem parte do valor fixo contratado.",
    },
    {
      role: "ADDON",
      title: "Adicionais recorrentes",
      text: "Somados à mensalidade enquanto estiverem vigentes.",
    },
  ];
  return (
    <div className="space-y-lg">
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-success text-sm">
          {notice}
        </p>
      )}
      {canEdit && (
        <form
          onSubmit={save}
          className="border border-outline-variant rounded-xl p-md space-y-md"
        >
          <h3 className="font-semibold">
            {editing ? "Editar item / classificação" : "Lançar serviço ou item"}
          </h3>
          <fieldset
            disabled={busy}
            className="grid grid-cols-1 md:grid-cols-3 gap-md"
          >
            <Input
              label="Descrição do item"
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
              minLength={2}
              maxLength={255}
              required
            />
            <Select
              label="Classificação da cobrança"
              value={form.billingRole}
              onChange={(e) => change("billingRole", e.target.value)}
              options={[
                { value: "ONE_OFF", label: "Pontual · cobrar uma vez" },
                { value: "ADDON", label: "Adicional recorrente" },
                { value: "BASE", label: "Incluído na mensalidade" },
              ]}
            />
            <Select
              label="Tipo do item"
              value={form.itemType}
              onChange={(e) => change("itemType", e.target.value)}
              options={[
                { value: "SERVICE", label: "Serviço" },
                { value: "LICENSE", label: "Licença" },
                { value: "STORAGE", label: "Armazenamento" },
                { value: "SUPPORT", label: "Suporte" },
                { value: "MONITORING", label: "Monitoramento" },
                { value: "BACKUP", label: "Backup" },
                { value: "OTHER", label: "Outro" },
              ]}
            />
            <Input
              label="Quantidade"
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(e) => change("quantity", e.target.value)}
              required
            />
            <Input
              label="Valor unitário (R$)"
              type="number"
              min="0"
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => change("unitPrice", e.target.value)}
              required
            />
            {form.billingRole === "ONE_OFF" && (
              <>
                <Input
                  label="Mês do serviço"
                  type="month"
                  value={form.servicePeriod}
                  onChange={(e) => change("servicePeriod", e.target.value)}
                  required
                />
                <Input
                  label="Cobrar na fatura de"
                  type="month"
                  min={form.servicePeriod}
                  value={form.chargePeriod}
                  onChange={(e) => change("chargePeriod", e.target.value)}
                  required
                />
              </>
            )}
            {form.billingRole === "ADDON" && (
              <>
                <Input
                  label="Início do adicional"
                  type="date"
                  value={form.startsOn}
                  onChange={(e) => change("startsOn", e.target.value)}
                  required
                />
                <Select
                  label="Término do adicional"
                  value={form.endMode}
                  onChange={(e) => change("endMode", e.target.value)}
                  options={[
                    { value: "CONTRACT", label: "Até o término do contrato" },
                    { value: "OPEN", label: "Sem término próprio" },
                    { value: "DATE", label: "Data específica" },
                  ]}
                />
                {form.endMode === "DATE" && (
                  <Input
                    label="Data final do adicional"
                    type="date"
                    min={form.startsOn}
                    value={form.endsOn}
                    onChange={(e) => change("endsOn", e.target.value)}
                    required
                  />
                )}
                <Select
                  label="Cobrança no início e término"
                  value={form.proration}
                  onChange={(e) => change("proration", e.target.value)}
                  options={[
                    { value: "NONE", label: "Valor integral, sem rateio" },
                    {
                      value: "DAILY",
                      label: "Proporcional aos dias de vigência",
                    },
                  ]}
                />
              </>
            )}
          </fieldset>
          <p
            className={
              form.billingRole === "ADDON"
                ? "text-xs text-on-surface-variant"
                : "hidden"
            }
          >
            Com rateio, entram os dias corridos entre início e fim, inclusive,
            divididos pelos dias reais do mês. Sem rateio, cada competência com
            vigência recebe o valor integral. Toda cobrança respeita a vigência
            do contrato, inclusive quando o item não tem término próprio.
          </p>
          {form.billingRole === "BASE" && (
            <p className="text-sm text-on-surface-variant">
              Itens incluídos apenas detalham a mensalidade: sua soma precisa
              corresponder ao valor fixo configurado na aba Recorrência.
            </p>
          )}
          <div className="flex flex-wrap gap-sm">
            <Button type="submit" disabled={busy} loading={busy}>
              {editing ? "Salvar alterações do item" : "Adicionar item"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setEditing(null);
                  setForm(empty());
                  setError("");
                }}
              >
                Cancelar edição
              </Button>
            )}
          </div>
        </form>
      )}
      {groups.map((group) => {
        const items = (contract.lineItems || []).filter(
          (item: any) => (item.billingRole || "BASE") === group.role,
        );
        return (
          <section key={group.role} className="space-y-sm">
            <h3 className="font-semibold">{group.title}</h3>
            <p className="text-xs text-on-surface-variant">{group.text}</p>
            {!items.length ? (
              <p className="text-sm text-on-surface-variant py-sm">
                Nenhum item nesta categoria.
              </p>
            ) : (
              <div className="overflow-x-auto border border-outline-variant rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="p-sm">Descrição</th>
                      <th className="p-sm">Quantidade</th>
                      <th className="p-sm">
                        {group.role === "ONE_OFF" ? "Valor" : "Valor mensal"}
                      </th>
                      {group.role === "ONE_OFF" && (
                        <>
                          <th className="p-sm">Serviço realizado</th>
                          <th className="p-sm">Cobrar em</th>
                        </>
                      )}
                      {group.role === "ADDON" && (
                        <>
                          <th className="p-sm">Vigência</th>
                          <th className="p-sm">Rateio</th>
                        </>
                      )}
                      {canEdit && <th className="p-sm">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr
                        key={item.id}
                        className="border-b border-outline-variant/30"
                      >
                        <td className="p-sm">
                          {item.description}
                          {!item.recurring &&
                            item.billingRole !== "ONE_OFF" && (
                              <span className="block text-xs">
                                Cadastro de referência, fora da cobrança mensal.
                              </span>
                            )}
                        </td>
                        <td className="p-sm">{String(item.quantity)}</td>
                        <td className="p-sm whitespace-nowrap">
                          {money(item.totalPriceCents)}
                        </td>
                        {group.role === "ONE_OFF" && (
                          <>
                            <td className="p-sm">
                              {item.servicePeriod
                                ?.split("-")
                                .reverse()
                                .join("/")}
                            </td>
                            <td className="p-sm">
                              {item.chargePeriod
                                ?.split("-")
                                .reverse()
                                .join("/")}
                            </td>
                          </>
                        )}
                        {group.role === "ADDON" && (
                          <>
                            <td className="p-sm">
                              {formatCalendarDate(item.startsOn)} →{" "}
                              {item.endMode === "DATE"
                                ? formatCalendarDate(item.endsOn)
                                : item.endMode === "OPEN"
                                  ? "Sem término próprio"
                                  : contract.endDate
                                    ? `Fim do contrato: ${formatCalendarDate(contract.endDate)}`
                                    : "Até o fim do contrato"}
                            </td>
                            <td className="p-sm">
                              {item.proration === "DAILY"
                                ? "Proporcional por dia"
                                : "Sem rateio"}
                            </td>
                          </>
                        )}
                        {canEdit && (
                          <td className="p-sm">
                            <div className="flex gap-sm">
                              <Button
                                variant="ghost"
                                onClick={() => edit(item)}
                                disabled={busy}
                                aria-label={`Editar ${item.description}`}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => remove(item)}
                                disabled={busy}
                                aria-label={`Remover ${item.description}`}
                              >
                                Remover
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
      <p className="text-xs text-on-surface-variant">
        O valor efetivo do mês e o demonstrativo de rateio aparecem ao preparar
        ou atualizar a fatura. Alterar uma regra exige atualizar e conferir os
        rascunhos já preparados.
      </p>
    </div>
  );
}
