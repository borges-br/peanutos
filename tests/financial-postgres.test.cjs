const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const core=require('../packages/db/dist');
const {PrismaClient,prisma,saveBillingConnection,createInvoiceCharge,reconcileInvoiceCharge,acceptAsaasWebhook,processBillingGatewayEvents,processRequestedInvoiceCharges,getInvoiceBankLink,saveBillingEmailTemplate,previewInvoiceEmail,prepareContractPeriod,approveContractInvoice,updateContractInvoice}=core;
const url=process.env.CONTRACT_BILLING_TEST_DATABASE_URL;
if(!url) test('financial integration requires isolated QA runner',{skip:true},()=>{});
else {
  const target=new URL(url);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/peanut_contract_billing_qa');
  const db=new PrismaClient({datasources:{db:{url}}}), workspaces=[];
  const previousKey=process.env.APP_ENCRYPTION_KEY;process.env.APP_ENCRYPTION_KEY=randomBytes(32).toString('hex');
  const token='synthetic-webhook-'+randomBytes(24).toString('hex'), key='synthetic-api-'+randomUUID();
  async function fixture(environment='PRODUCTION', status='ISSUED') {
    const ws=await db.workspace.create({data:{name:'Synthetic finance QA',slug:randomUUID(),timeZone:'America/Sao_Paulo'}});workspaces.push(ws.id);
    const user=await db.user.create({data:{workspaceId:ws.id,email:randomUUID()+'@example.invalid',name:'QA Finance',passwordHash:'test-only',role:'OWNER'}});
    const client=await db.client.create({data:{workspaceId:ws.id,legalName:'Fictitious Customer',document:'11122233344',email:'qa@example.invalid'}});
    const invoice=await db.invoice.create({data:{workspaceId:ws.id,clientId:client.id,clientName:client.legalName,number:'FAT-QA-'+randomUUID(),status,dueDate:new Date('2099-11-10'),totalAmount:100,subtotalServices:100}});
    const connection=await saveBillingConnection(db,ws.id,user.id,{provider:'ASAAS',environment,enabled:true,revision:0,apiKey:key,webhookToken:token});
    return {ws,user,client,invoice,connection};
  }
  function provider() {
    const payments=new Map(),customers=[];let posts=0, customerPosts=0, timeout=false;
    return {payments,customers,get posts(){return posts;},get customerPosts(){return customerPosts;},set timeout(value){timeout=value;},
      findPayments:async reference=>[...payments.values()].filter(p=>p.externalReference===reference).map(p=>({...p})),
      findCustomer:async document=>customers.filter(c=>c.cpfCnpj===document),
      createCustomer:async data=>{customerPosts++;const row={...data,id:'cus_'+randomUUID()};customers.push(row);return row;},
      createPayment:async data=>{posts++;const row={...data,id:'pay_'+randomUUID(),status:'PENDING',netValue:97,invoiceUrl:'https://www.asaas.com/i/qa',bankSlipUrl:null};payments.set(row.id,row);if(timeout) throw new core.BillingProviderError('Synthetic timeout',true);return {...row};},
      getPayment:async id=>({...payments.get(id)}),verifyConnection:async()=>{},
    };
  }
  test.after(async()=>{
    await db.billingGatewayEvent.deleteMany({where:{connection:{workspaceId:{in:workspaces}}}});
    await db.billingReceipt.deleteMany({where:{charge:{invoice:{workspaceId:{in:workspaces}}}}});
    await db.billingCharge.deleteMany({where:{invoice:{workspaceId:{in:workspaces}}}});
    await db.billingCustomer.deleteMany({where:{connection:{workspaceId:{in:workspaces}}}});
    await db.billingConnection.deleteMany({where:{workspaceId:{in:workspaces}}});
    await db.workspace.deleteMany({where:{id:{in:workspaces}}});await db.$disconnect();await prisma.$disconnect();
    if(previousKey===undefined) delete process.env.APP_ENCRYPTION_KEY;else process.env.APP_ENCRYPTION_KEY=previousKey;
  });
  test('gateway settings encrypt secrets, preserve blank credentials and reject stale revisions',async()=>{
    const f=await fixture();const row=await db.billingConnection.findUniqueOrThrow({where:{id:f.connection.id}});
    assert.ok(row.apiKeyEncrypted.startsWith('v1:gcm:'));assert.ok(!JSON.stringify(f.connection).includes(key));
    const saved=await saveBillingConnection(db,f.ws.id,f.user.id,{provider:'ASAAS',environment:'PRODUCTION',enabled:true,revision:1});assert.equal(saved.revision,2);
    assert.equal((await db.billingConnection.findUniqueOrThrow({where:{id:row.id}})).apiKeyEncrypted,row.apiKeyEncrypted);
    await assert.rejects(saveBillingConnection(db,f.ws.id,f.user.id,{provider:'ASAAS',environment:'PRODUCTION',enabled:true,revision:1}),/mudou/);
    const audit=await db.auditLog.findMany({where:{workspaceId:f.ws.id}});assert.ok(!JSON.stringify(audit).includes(key));assert.ok(!JSON.stringify(audit).includes(token));
  });
  test('concurrent charge requests create exactly one external charge and never cross workspaces',async()=>{
    const f=await fixture(),other=await fixture(),p=provider();
    await assert.rejects(createInvoiceCharge(db,other.ws.id,f.invoice.id,f.connection.id,'PIX',other.user.id,p),/pagas e canceladas/);
    await assert.rejects(createInvoiceCharge(db,f.ws.id,f.invoice.id,other.connection.id,'PIX',f.user.id,p),/workspace/);
    await Promise.allSettled([createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p),createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p)]);
    assert.equal(p.posts,1);assert.equal(await db.billingCharge.count({where:{invoiceId:f.invoice.id}}),1);
    const charge=await db.billingCharge.findFirstOrThrow({where:{invoiceId:f.invoice.id}});assert.equal(charge.state,'ACTIVE');assert.equal(charge.paymentUrl,'https://www.asaas.com/i/qa');
    await createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p);assert.equal(p.posts,1);
  });
  test('unknown POST outcomes are reconciled by reference without repeating external creation',async()=>{
    const f=await fixture(),p=provider();p.timeout=true;
    await assert.rejects(createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'BOLETO',f.user.id,p),/timeout/);
    const charge=await db.billingCharge.findFirstOrThrow({where:{invoiceId:f.invoice.id}});assert.equal(charge.state,'UNKNOWN');
    await assert.rejects(createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'BOLETO',f.user.id,p),/Conciliar/);assert.equal(p.posts,1);
    await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);assert.equal(p.posts,1);assert.equal((await db.billingCharge.findUniqueOrThrow({where:{id:charge.id}})).state,'ACTIVE');
  });
  test('production confirmation differs from receipt; repeated reconciliation does not duplicate credits and refunds reopen the invoice',async()=>{
    const f=await fixture(),p=provider(),charge=await createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p);
    const payment=p.payments.get(charge.externalId);payment.status='CONFIRMED';await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);
    assert.equal((await db.invoice.findUniqueOrThrow({where:{id:f.invoice.id}})).status,'ISSUED');assert.equal(await db.billingReceipt.count({where:{chargeId:charge.id}}),0);
    payment.status='RECEIVED';payment.creditDate='2026-10-28';await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);
    assert.equal((await db.invoice.findUniqueOrThrow({where:{id:f.invoice.id}})).status,'PAID');const receipt=await db.billingReceipt.findFirstOrThrow({where:{chargeId:charge.id}});assert.equal(receipt.principalCents,10000);assert.equal(receipt.netCents,9700);assert.equal(await db.billingReceipt.count({where:{chargeId:charge.id}}),1);
    payment.status='REFUNDED';await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);assert.equal((await db.invoice.findUniqueOrThrow({where:{id:f.invoice.id}})).status,'ISSUED');assert.equal(await db.billingReceipt.count({where:{chargeId:charge.id}}),2);
    const sum=await db.billingReceipt.aggregate({where:{chargeId:charge.id},_sum:{principalCents:true}});assert.equal(sum._sum.principalCents,0);
  });
  test('sandbox receipts never settle a real invoice or enter the real receipts ledger',async()=>{
    const f=await fixture('SANDBOX'),p=provider(),charge=await createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p);
    p.payments.get(charge.externalId).status='RECEIVED';await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);
    assert.equal((await db.invoice.findUniqueOrThrow({where:{id:f.invoice.id}})).status,'ISSUED');assert.equal(await db.billingReceipt.count({where:{chargeId:charge.id}}),0);assert.equal(await getInvoiceBankLink(db,f.invoice.id),null);
  });
  test('a full refund reverses the original gross including interest while keeping unknown refund fees explicit',async()=>{
    const f=await fixture(),p=provider(),charge=await createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p);
    const payment=p.payments.get(charge.externalId);Object.assign(payment,{status:'RECEIVED',originalValue:100,value:110,netValue:107});await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);
    payment.status='REFUNDED';await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);
    const sum=await db.billingReceipt.aggregate({where:{chargeId:charge.id},_sum:{grossCents:true,principalCents:true}});assert.equal(sum._sum.grossCents,0);assert.equal(sum._sum.principalCents,0);
    assert.equal(await db.billingReceipt.count({where:{chargeId:charge.id,netCents:null}}),1);
  });
  test('webhooks authenticate before persistence, ignore duplicates, and verify canonical values rather than trusting posted amounts',async()=>{
    const f=await fixture(),p=provider(),charge=await createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p);
    const body={id:'evt_'+randomUUID(),event:'PAYMENT_RECEIVED',payment:{id:charge.externalId,value:999999,status:'RECEIVED'}};
    await assert.rejects(acceptAsaasWebhook(db,f.connection.id,'wrong',body),/autorizado/);assert.equal(await db.billingGatewayEvent.count({where:{connectionId:f.connection.id}}),0);
    await Promise.all([acceptAsaasWebhook(db,f.connection.id,token,body),acceptAsaasWebhook(db,f.connection.id,token,body)]);
    assert.equal(await db.billingGatewayEvent.count({where:{connectionId:f.connection.id}}),1);
    p.payments.get(charge.externalId).status='RECEIVED';await processBillingGatewayEvents(db,new Date(),()=>p);
    assert.equal((await db.invoice.findUniqueOrThrow({where:{id:f.invoice.id}})).status,'PAID');assert.equal((await db.billingReceipt.findFirstOrThrow({where:{chargeId:charge.id}})).principalCents,10000);
  });
  test('divergent provider amounts are held for review without falsely marking the invoice paid',async()=>{
    const f=await fixture(),p=provider(),charge=await createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p);
    Object.assign(p.payments.get(charge.externalId),{value:200,status:'RECEIVED'});const result=await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);
    assert.equal(result.state,'REVIEW');assert.equal((await db.invoice.findUniqueOrThrow({where:{id:f.invoice.id}})).status,'ISSUED');assert.equal(await db.billingReceipt.count({where:{chargeId:charge.id}}),0);
  });
  test('a provider response cannot replace the expected customer before financial verification',async()=>{
    const f=await fixture(),p=provider(),create=p.createPayment;
    p.createPayment=async data=>{const row=await create(data);Object.assign(p.payments.get(row.id),{customer:'cus_wrong',status:'RECEIVED'});return {...p.payments.get(row.id)};};
    const charge=await createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p);
    assert.equal(charge.state,'REVIEW');assert.notEqual(charge.externalCustomerId,'cus_wrong');
    assert.equal((await db.invoice.findUniqueOrThrow({where:{id:f.invoice.id}})).status,'ISSUED');assert.equal(await db.billingReceipt.count({where:{chargeId:charge.id}}),0);
  });
  test('choosing bank collection on a draft records an intent without external calls; issuance processes it once and unblocks delivery',async()=>{
    const f=await fixture('PRODUCTION','DRAFT'),p=provider();const charge=await createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'BOLETO',f.user.id,p);
    assert.equal(charge.state,'REQUESTED');assert.equal(p.posts,0);await assert.rejects(getInvoiceBankLink(db,f.invoice.id,true),/Aguarde/);
    await db.invoice.update({where:{id:f.invoice.id},data:{status:'ISSUED'}});await processRequestedInvoiceCharges(db,()=>p);await processRequestedInvoiceCharges(db,()=>p);
    assert.equal(p.posts,1);assert.equal(await getInvoiceBankLink(db,f.invoice.id,true),'https://www.asaas.com/i/qa');
  });
  test('template defaults are unique, tenant-scoped and frozen at approval until the invoice changes',async()=>{
    const f=await fixture(),other=await fixture();
    let template=await saveBillingEmailTemplate(db,f.ws.id,f.user.id,{name:'A',subject:'Original {fatura}',body:'Olá, {cliente}. Total {total}',isDefault:true});
    await saveBillingEmailTemplate(db,f.ws.id,f.user.id,{name:'B',subject:'B',body:'B',isDefault:true});assert.equal(await db.emailTemplate.count({where:{workspaceId:f.ws.id,isDefault:true}}),1);
    await assert.rejects(saveBillingEmailTemplate(db,other.ws.id,other.user.id,{...template,name:'Cross'},template.id),/não encontrado/);
    const contract=await db.contract.create({data:{workspaceId:f.ws.id,clientId:f.client.id,number:'CTR-'+randomUUID(),title:'Monthly',status:'ACTIVE',type:'RECURRING_SUPPORT',startDate:new Date('2026-01-01'),monthlyAmountCents:10000,billingDay:10,billingEmailTemplateId:template.id}});
    const event=await prepareContractPeriod(db,contract.id,f.ws.id,'2026-11',f.user.id);await approveContractInvoice(db,event.invoiceId,f.ws.id,f.user.id);
    template=await saveBillingEmailTemplate(db,f.ws.id,f.user.id,{...template,subject:'Changed {fatura}'},template.id);
    const frozen=await previewInvoiceEmail(db,f.ws.id,event.invoiceId);assert.ok(frozen.subject.startsWith('Original'));assert.equal(frozen.frozen,true);
    await updateContractInvoice(db,event.invoiceId,f.ws.id,{observations:'Edited'});const fresh=await previewInvoiceEmail(db,f.ws.id,event.invoiceId);assert.ok(fresh.subject.startsWith('Changed'));assert.equal(fresh.frozen,false);
  });
  test('financial metrics separate gateway fees and forecast queries stay inside the selected workspace',async()=>{
    const f=await fixture(),other=await fixture(),p=provider(),charge=await createInvoiceCharge(db,f.ws.id,f.invoice.id,f.connection.id,'PIX',f.user.id,p);
    Object.assign(p.payments.get(charge.externalId),{status:'RECEIVED',creditDate:new Date().toISOString().slice(0,10)});await reconcileInvoiceCharge(db,f.ws.id,charge.id,p);
    const {FinancialsService}=require('../apps/api/dist/financials/financials.service');const service=new FinancialsService({log:async()=>{}});
    const metrics=await service.getMrrMetrics(f.ws.id,f.user.id);assert.equal(metrics.gatewayReceived.grossCents,10000);assert.equal(metrics.gatewayReceived.knownNetCents,9700);assert.equal(metrics.gatewayReceived.knownFeesCents,300);
    const forecast=await core.getFinancialForecast(db,other.ws.id,'2099-11');assert.equal(forecast.openCents,10000);assert.equal(forecast.rows.length,1);assert.equal(forecast.rows[0].invoiceId,other.invoice.id);
  });
  test('financial and gateway controllers expose reads to financial roles but credential writes only to administrators',async()=>{
    const {createRequire}=require('node:module');const apiRequire=createRequire(require('node:path').resolve('apps/api/package.json'));apiRequire('reflect-metadata');
    const {BillingGatewayController,AsaasWebhookController}=require('../apps/api/dist/financials/billing-gateway.controller');
    assert.deepEqual(Reflect.getMetadata('roles',BillingGatewayController),['OWNER','ADMIN','FINANCIAL']);
    assert.deepEqual(Reflect.getMetadata('roles',BillingGatewayController.prototype.save),['OWNER','ADMIN']);
    assert.deepEqual(Reflect.getMetadata('roles',BillingGatewayController.prototype.test),['OWNER','ADMIN']);
    const {RolesGuard}=require('../apps/api/dist/auth/roles.guard');const reflector=new (apiRequire('@nestjs/core').Reflector)();const guard=new RolesGuard(reflector);
    const context=(handler,role)=>({getHandler:()=>handler,getClass:()=>BillingGatewayController,switchToHttp:()=>({getRequest:()=>({user:{role}})})});
    assert.equal(guard.canActivate(context(BillingGatewayController.prototype.create,'TECHNICIAN')),false);
    assert.equal(guard.canActivate(context(BillingGatewayController.prototype.save,'FINANCIAL')),false);
    assert.equal(guard.canActivate(context(BillingGatewayController.prototype.create,'FINANCIAL')),true);
    assert.equal(Reflect.getMetadata('__httpCode__',AsaasWebhookController.prototype.receive),200);
  });
  test('October work is charged once in November, visible before draft and preserved after issue',async()=>{
    const f=await fixture();
    const c=await db.contract.create({data:{workspaceId:f.ws.id,clientId:f.client.id,number:'CTR-UX-'+randomUUID(),title:'Suporte',type:'RECURRING_SUPPORT',status:'ACTIVE',monthlyAmountCents:170031,startDate:new Date('2099-01-01'),endDate:new Date('2099-12-31'),billingDay:10,billingIssueDay:1}});
    const old=await core.saveContractLineItem(db,f.ws.id,c.id,{description:'Nobreak revisão e duas baterias',itemType:'SERVICE',quantity:1,unitPriceCents:44800,billingRole:'BASE',recurring:true},f.user.id);
    await assert.rejects(()=>prepareContractPeriod(db,c.id,f.ws.id,'2099-11',f.user.id),/soma dos itens fixos/);
    const payload={description:old.description,itemType:'SERVICE',quantity:1,unitPriceCents:44800,billingRole:'ONE_OFF',servicePeriod:'2099-10',chargePeriod:'2099-11'};
    const {contractLineItemUpdateSchema}=require('../packages/validators/dist');assert.equal(contractLineItemUpdateSchema.parse(payload).chargePeriod,'2099-11');
    await core.saveContractLineItem(db,f.ws.id,c.id,payload,f.user.id,old.id);
    await core.saveContractLineItem(db,f.ws.id,c.id,{description:'Adicionais mensais',itemType:'SERVICE',quantity:1,unitPriceCents:148600,billingRole:'ADDON',startsOn:'2099-10-01'},f.user.id);
    const summary=await core.getContractPeriodSummary(db,f.ws.id,c.id,'2099-11');assert.equal(summary.warning,null);assert.equal(summary.extraCents,44800);assert.equal(summary.totalCents,363431);
    const results=await Promise.all([prepareContractPeriod(db,c.id,f.ws.id,'2099-11',f.user.id),prepareContractPeriod(db,c.id,f.ws.id,'2099-11',f.user.id)]);
    assert.equal(results[0].invoiceId,results[1].invoiceId);
    let invoice=await db.invoice.findUnique({where:{id:results[0].invoiceId},include:{items:true}});assert.equal(Number(invoice.totalAmount),3634.31);assert.equal(invoice.items.filter(i=>i.sourceContractLineItemId===old.id).length,1);assert.match(invoice.items.find(i=>i.sourceContractLineItemId===old.id).description,/10\/2099/);
    invoice=await updateContractInvoice(db,invoice.id,f.ws.id,{refreshBase:true});assert.equal(Number(invoice.totalAmount),3634.31);
    const dec=await prepareContractPeriod(db,c.id,f.ws.id,'2099-12',f.user.id);assert.equal(Number(dec.invoice.totalAmount),3186.31);
    await db.invoice.update({where:{id:invoice.id},data:{status:'ISSUED'}});
    await assert.rejects(()=>core.saveContractLineItem(db,f.ws.id,c.id,{...payload,chargePeriod:'2099-12'},f.user.id,old.id),/emitida/);
    await assert.rejects(()=>core.removeContractLineItem(db,f.ws.id,c.id,old.id,f.user.id),/emitida/);
    assert.equal((await db.contract.findUnique({where:{id:c.id}})).monthlyAmountCents,170031);
  });
  test('global search uses real Portuguese text search, respects roles and isolates workspaces',async()=>{
    const f=await fixture();const other=await fixture();
    await db.client.update({where:{id:f.client.id},data:{legalName:'Revisões sintéticas Nobreak'}});
    const {SearchController}=require('../apps/api/dist/search/search.controller');const controller=new SearchController();
    const result=await controller.search({workspaceId:f.ws.id,role:'OWNER'},'revisão');assert.ok(result.data.some(r=>r.id===f.client.id));assert.ok(!result.data.some(r=>r.id===other.client.id));
    const fin=await controller.search({workspaceId:f.ws.id,role:'OWNER'},f.invoice.number);assert.ok(fin.data.some(r=>r.id===f.invoice.id));
    const tech=await controller.search({workspaceId:f.ws.id,role:'TECHNICIAN'},f.invoice.number);assert.equal(tech.data.length,0);
    assert.deepEqual((await controller.search({workspaceId:f.ws.id,role:'OWNER'},"'; DROP TABLE clients; --")).data,[]);
  });

  test('client groups separate active agreements before pagination and inventory cards use database counts',async()=>{
    const f=await fixture();const other=await db.client.create({data:{workspaceId:f.ws.id,legalName:'Avulso QA'}});
    await db.contract.create({data:{workspaceId:f.ws.id,clientId:f.client.id,number:'GROUP-'+randomUUID(),title:'Suporte',type:'RECURRING_SUPPORT',status:'ACTIVE',monthlyAmountCents:10000,startDate:new Date('2020-01-01')}});
    await db.asset.create({data:{workspaceId:f.ws.id,clientId:f.client.id,name:'QA equipamento'}});
    const {ClientsService}=require('../apps/api/dist/clients/clients.service');const service=new ClientsService();
    const active=await service.list(f.ws.id,{contractGroup:'active',limit:1});assert.equal(active.meta.total,1);assert.equal(active.data[0].id,f.client.id);assert.equal(active.data[0].contracts.length,1);assert.equal(active.data[0]._count.assets,1);
    const rest=await service.list(f.ws.id,{contractGroup:'other'});assert.equal(rest.meta.total,1);assert.equal(rest.data[0].id,other.id);
    const {InventoryService}=require('../apps/api/dist/inventory/inventory.service');const groups=await new InventoryService().groups(f.ws.id);assert.equal(groups.total,1);assert.equal(groups.clients.length,1);assert.equal(groups.clients[0]._count.assets,1);
  });

}
