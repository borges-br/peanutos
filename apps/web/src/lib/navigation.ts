export type Destination = {
  label: string;
  href: string;
  terms: string;
  group: string;
  roles?: string[];
};
const finance = ["OWNER", "ADMIN", "FINANCIAL"];
export const destinations: Destination[] = [
  {
    label: "Visão geral",
    href: "/dashboard",
    terms: "inicio resumo painel home",
    group: "Dia a dia",
  },
  {
    label: "Clientes",
    href: "/dashboard/clients",
    terms: "empresa contato telefone cpf cnpj cadastro editar cliente contrato",
    group: "Dia a dia",
  },
  {
    label: "Inventário",
    href: "/dashboard/inventory",
    terms:
      "equipamento computador notebook servidor patrimonio ativo inventario tecnico",
    group: "Dia a dia",
    roles: ["OWNER", "ADMIN", "TECHNICIAN", "READ_ONLY"],
  },
  {
    label: "Chamados",
    href: "/dashboard/tickets",
    terms: "ticket suporte atendimento problema solicitacao",
    group: "Dia a dia",
  },
  {
    label: "Ordens de serviço",
    href: "/dashboard/service-orders",
    terms: "os ordem servico conserto revisao visita",
    group: "Dia a dia",
  },
  {
    label: "Contratos",
    href: "/dashboard/contracts",
    terms: "mensalidade recorrencia adicional pontual contrato",
    group: "Financeiro",
  },
  {
    label: "Faturas",
    href: "/dashboard/invoices",
    terms: "cobranca cobrar boleto pix pagamento receber emitir fatura",
    group: "Financeiro",
    roles: finance,
  },
  {
    label: "Previsão de recebimentos",
    href: "/dashboard/financials",
    terms: "proximo mes recorrencia financeira receber vencido atraso previsao",
    group: "Financeiro",
    roles: finance,
  },
  {
    label: "Orçamentos",
    href: "/dashboard/quotes",
    terms: "proposta orcamento preco comercial",
    group: "Financeiro",
    roles: finance,
  },
  {
    label: "Modelos de email",
    href: "/dashboard/templates-email",
    terms: "template email modelo mensagem envio editar",
    group: "Documentos",
    roles: finance,
  },
  {
    label: "Documentos",
    href: "/dashboard/documentos",
    terms: "arquivo pdf documento download",
    group: "Documentos",
  },
  {
    label: "Modelos de PDF",
    href: "/dashboard/templates-a4",
    terms: "template a4 impressao layout pdf",
    group: "Documentos",
    roles: finance,
  },
  {
    label: 'Relatórios e propostas',
    href: '/dashboard/documentos/relatorios',
    terms: 'relatorio tecnico proposta diagnostico recomendacao projeto documento elaborar',
    group: 'Documentos',
  },
  {
    label: "Configurações",
    href: "/dashboard/configuracoes",
    terms:
      "configurar smtp senha email asaas integracao banco fuso horario empresa",
    group: "Preferências",
  },
  {
    label: "Aparência",
    href: "/dashboard/configuracoes/preferencias/aparencia",
    terms: "tema escuro cor contraste densidade fonte animacao personalizar",
    group: "Preferências",
  },
  {
    label: 'Marca e aparência',
    href: '/dashboard/configuracoes/marca',
    terms: 'branding identidade logo simbolo fonte tema sidebar whitelabel documentos',
    group: 'Preferências',
    roles: ['OWNER','ADMIN'],
  },
  {
    label: "Automações",
    href: "/dashboard/webhooks",
    terms: "webhook automacao integracao evento",
    group: "Preferências",
    roles: ["OWNER", "ADMIN"],
  },
  {
    label: "Histórico de atividades",
    href: "/dashboard/auditoria",
    terms: "auditoria historico alteracao registro atividade",
    group: "Preferências",
    roles: ["OWNER", "ADMIN"],
  },
];
export const quickActions: Destination[] = [
  {
    label: "Cadastrar cliente",
    href: "/dashboard/clients/new",
    terms: "novo adicionar criar cliente empresa",
    group: "Ações",
    roles: ["OWNER", "ADMIN", "TECHNICIAN"],
  },
  {
    label: "Abrir chamado",
    href: "/dashboard/tickets/new",
    terms: "novo abrir criar suporte chamado ticket",
    group: "Ações",
  },
  {
    label: "Criar contrato",
    href: "/dashboard/contracts/new",
    terms: "novo criar contrato mensalidade",
    group: "Ações",
    roles: finance,
  },
  {
    label: "Criar fatura",
    href: "/dashboard/invoices/new",
    terms: "nova criar emitir cobrar fatura cobranca",
    group: "Ações",
    roles: finance,
  },
  {
    label: "Criar orçamento",
    href: "/dashboard/quotes/new",
    terms: "novo criar orcamento proposta",
    group: "Ações",
    roles: finance,
  },
  {
    label: "Criar ordem de serviço",
    href: "/dashboard/service-orders/new",
    terms: "nova criar ordem servico os",
    group: "Ações",
    roles: ["OWNER", "ADMIN", "TECHNICIAN"],
  },
];
export const normalizeSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function matchDestinations(
  query: string,
  role: string,
  usage: Record<string, number> = {},
) {
  const words = normalizeSearch(query)
    .split(/\W+/)
    .filter((w) => w.length > 1);
  return [...destinations, ...quickActions]
    .filter((d) => !d.roles || d.roles.includes(role))
    .map((d) => {
      const text = normalizeSearch(`${d.label} ${d.terms}`);
      const score = words.reduce(
        (s, w) =>
          s +
          (normalizeSearch(d.label).includes(w) ? 5 : text.includes(w) ? 2 : 0),
        0,
      );
      return { ...d, score: words.length ? score : usage[d.href] || 0 };
    })
    .filter((d) => !words.length || d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
