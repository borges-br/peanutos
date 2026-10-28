const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFinancialForecast, contractPeriodSummary, AsaasProvider, asaasPaymentUrl } = require('../packages/db/dist');
const { renderBillingEmail, DEFAULT_BILLING_EMAIL } = require('../packages/utils/dist');
const contract = () => ({ id:'contract', clientId:'client', number:'CTR-QA', title:'Support', currency:'BRL', status:'ACTIVE', type:'RECURRING_SUPPORT', startDate:new Date('2026-01-01T00:00:00Z'), endDate:null, monthlyAmountCents:10000, billingDay:10, billingIssueDay:5, billingIssueTime:'09:00', lineItems:[{id:'addon', description:'License', quantity:'1', unitPriceCents:3100, recurring:true, billingRole:'ADDON', startsOn:new Date('2026-10-16T00:00:00Z'), endMode:'OPEN', proration:'DAILY'}], client:{legalName:'Synthetic'}, billingScheduleEvents:[] });
const zone='America/Sao_Paulo', now=new Date('2026-10-28T12:00:00Z');
test('contract totals include prorated add-ons and saved invoice snapshots take precedence', () => {
  const c=contract(); const projected=contractPeriodSummary(c,'2026-10',zone);
  assert.equal(projected.baseCents,10000); assert.equal(projected.recurringCents,1600); assert.equal(projected.totalCents,11600);
  const saved=contractPeriodSummary(c,'2026-10',zone,{needsRecurringRefresh:true, invoice:{id:'invoice',status:'DRAFT', totalAmount:150,discountAmount:10,items:[{billingKind:'BASE',totalPrice:100},{billingKind:'RECURRING',totalPrice:20},{billingKind:'EXTRA',totalPrice:40}]}});
  assert.deepEqual([saved.baseCents,saved.recurringCents,saved.extraCents,saved.discountCents,saved.totalCents],[10000,2000,4000,1000,15000]); assert.equal(saved.ruleTotalCents,11600); assert.equal(saved.needsRecurringRefresh,true);
});
test('forecast replaces the contract projection with its saved invoice, excludes paid/cancelled amounts and separates overdue', () => {
  const c=contract(); c.billingScheduleEvents=[{periodKey:'2026-11',invoiceId:'nov',status:'DRAFT_READY'}];
  const invoices=[{id:'nov',contractId:c.id,number:'NOV',status:'DRAFT',totalAmount:145,dueDate:new Date('2026-11-10')},{id:'open',number:'OPEN',status:'ISSUED',totalAmount:50,dueDate:new Date('2026-11-15')},{id:'paid',status:'PAID',totalAmount:999,dueDate:new Date('2026-11-12')},{id:'cancel',status:'CANCELLED',totalAmount:999,dueDate:new Date('2026-11-12')},{id:'old',number:'OLD',status:'ISSUED',totalAmount:20,dueDate:new Date('2026-10-01')}];
  const f=buildFinancialForecast([c],invoices,'2026-11',zone,now);
  assert.equal(f.rows.length,2); assert.equal(f.expectedCents,19500); assert.equal(f.projectedCents,0); assert.equal(f.overdueCents,2000); assert.equal(f.overdue[0].daysOverdue,27);
});
test('cross-month due dates and calendar zones are included without creating drafts', () => {
  const c=contract(); c.billingDay=5; c.billingIssueDay=20;
  const f=buildFinancialForecast([c],[],'2026-11',zone,now);
  assert.equal(f.rows.length,1); assert.equal(f.rows[0].periodKey,'2026-10'); assert.equal(f.rows[0].amountCents,11600); assert.equal(f.rows[0].dueDate,'2026-11-05');
});
test('unlinked historical invoices produce a review warning rather than an additional duplicate projection', () => {
  const c=contract(); const f=buildFinancialForecast([c],[{id:'manual',contractId:c.id,number:'MANUAL',status:'ISSUED',totalAmount:131,dueDate:new Date('2026-11-10')}],'2026-11',zone,now);
  assert.equal(f.rows.length,1); assert.equal(f.expectedCents,13100); assert.match(f.warnings[0],/duplicidade/);
});
test('email rendering escapes markup in data, rejects unknown variables and header injection, and emits both HTML and text', () => {
  const mail=renderBillingEmail(DEFAULT_BILLING_EMAIL,{cliente:'<script>alert(1)</script> **Name**',fatura:'FAT-QA',empresa:'QA',total:'R$ 100,00',vencimento:'10/11/2026',competencia:'2026-11',contrato:'CTR-QA',fuso:zone,link_pagamento:'https://www.asaas.com/i/qa'});
  assert.ok(mail.html.includes('&lt;script&gt;')); assert.ok(!mail.html.includes('<script>')); assert.ok(mail.html.includes('**Name**')); assert.ok(mail.text.includes('FAT-QA')); assert.ok(mail.html.includes('Consultar cobrança e pagamento'));
  assert.throws(()=>renderBillingEmail({subject:'Bad\r\nBcc: test',body:'x'},{}),/Assunto/);
  assert.throws(()=>renderBillingEmail({subject:'Test',body:'{unknown}'},{}),/Variável/);
  const unsafe=renderBillingEmail({subject:'Test',body:'<img src=x onerror=alert(1)> [x](javascript:alert(1))'},{});
  assert.ok(!unsafe.html.includes('<img')); assert.ok(!unsafe.html.includes('href="javascript:'));
});
test('ASAAS adapter uses the official sandbox host, no redirects, safe headers and only supported Pix/boleto payloads',async()=>{
  const calls=[]; const adapter=new AsaasProvider('SANDBOX','synthetic-key',async(url,options)=>{calls.push({url,options}); return new Response(JSON.stringify(url.includes('?')?{data:[],hasMore:false}:{id:'pay_test'}),{status:200});});
  await adapter.findPayments('invoice/1'); await adapter.createPayment({billingType:'PIX',value:100});
  assert.equal(calls[0].url,'https://api-sandbox.asaas.com/v3/payments?externalReference=invoice%2F1&limit=100'); assert.equal(calls[0].options.redirect,'error'); assert.equal(calls[0].options.headers.access_token,'synthetic-key');
  assert.equal(asaasPaymentUrl('https://evil.invalid/pay'),null); assert.equal(asaasPaymentUrl('https://asaas.com.evil.invalid/pay'),null); assert.equal(asaasPaymentUrl('https://sandbox.asaas.com/i/qa'),'https://sandbox.asaas.com/i/qa');
});
