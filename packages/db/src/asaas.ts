/** Provider adapter. Endpoints are fixed; credentials never follow redirects or caller-provided URLs. */
export class BillingProviderError extends Error {
  constructor(message: string, public readonly uncertain = false) { super(message); }
}
export interface BillingProvider {
  findPayments(reference: string): Promise<any[]>;
  findCustomer(document: string): Promise<any[]>;
  createCustomer(customer: any): Promise<any>;
  createPayment(payment: any): Promise<any>;
  getPayment(id: string): Promise<any>;
  verifyConnection(): Promise<void>;
}
export class AsaasProvider implements BillingProvider {
  private readonly base: string;
  constructor(environment: string, private readonly apiKey: string, private readonly requestFetch: typeof fetch = fetch) {
    if (!['SANDBOX', 'PRODUCTION'].includes(environment)) throw new BillingProviderError('Ambiente inválido.');
    this.base = environment === 'SANDBOX' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
  }
  private async request(path: string, method = 'GET', body?: any) {
    let response: Response;
    try { response = await this.requestFetch(this.base + path, { method, redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { access_token: this.apiKey, 'User-Agent': 'PeanutOS-finance/1.0', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch { throw new BillingProviderError('Não foi possível confirmar a resposta do ASAAS. Concilie antes de repetir uma criação.', method === 'POST'); }
    if (!response.ok) throw new BillingProviderError(`ASAAS recusou a solicitação (HTTP ${response.status}). Confira credenciais e cadastro; detalhes sensíveis não são exibidos.`, method === 'POST' && (response.status >= 500 || [408, 429].includes(response.status)));
    const text = await response.text();
    if (text.length > 2000000) throw new BillingProviderError('Resposta do provedor excede o limite permitido.', method === 'POST');
    try { return JSON.parse(text); } catch { throw new BillingProviderError('Resposta inválida do ASAAS. Concilie antes de repetir.', method === 'POST'); }
  }
  async findPayments(reference: string) { const result = await this.request(`/payments?externalReference=${encodeURIComponent(reference)}&limit=100`); if (!Array.isArray(result.data) || result.hasMore) throw new BillingProviderError('A consulta retornou um conjunto inesperado de cobranças. Revise no ASAAS.'); return result.data; }
  async findCustomer(document: string) { const result = await this.request(`/customers?cpfCnpj=${encodeURIComponent(document)}&limit=100`); if (!Array.isArray(result.data) || result.hasMore) throw new BillingProviderError('Revise os cadastros duplicados do cliente no ASAAS.'); return result.data; }
  createCustomer(customer: any) { return this.request('/customers', 'POST', customer); }
  createPayment(payment: any) { return this.request('/payments', 'POST', payment); }
  getPayment(id: string) { return this.request(`/payments/${encodeURIComponent(id)}`); }
  async verifyConnection() { await this.request('/customers?limit=1&offset=0'); }
}
export function asaasPaymentUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'asaas.com' || url.hostname.endsWith('.asaas.com')) ? url.href : null; } catch { return null; }
}
