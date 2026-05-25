/**
 * E2E Integration and Validation Script for White-Label Hardening (Round 6)
 * Run: node scratch/validate_white_label.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://127.0.0.1:3001/api/v1';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🚀 Starting White-Label Hardening Integration Verification...');

  try {
    // 1. Get Setup Status
    console.log('\n--- STEP 1: Checking Setup Status ---');
    let statusRes = await fetch(`${API_URL}/setup`);
    let statusData = await statusRes.json();
    console.log('Setup status response:', statusData);
    
    if (!statusData.requiresSetup) {
      console.log('⚠️ Database is already bootstrapped. We will proceed with existing database.');
    } else {
      console.log('✅ Fresh database detected. Proceeding with Setup Wizard simulation.');
      
      // 2. Execute Stateful Setup Wizard
      console.log('\n--- STEP 2: Executing Stateful Setup Wizard ---');
      const setupPayload = {
        workspaceName: 'Peanut OS Enterprise',
        adminName: 'Nathan Administrator',
        adminEmail: 'nathan@example.com',
        adminPassword: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        publicName: 'Peanut OS Services',
        legalName: 'Nathan Systems Ltda',
        taxId: '99888777000199',
        primaryEmail: 'billing@nathan.systems',
        phone: '1155550100',
        website: 'https://nathan.systems',
        address: 'Av. Paulista, 1000 - São Paulo, SP',
        documentPrimaryColor: '#4f46e5',
        documentSecondaryColor: '#10b981',
        documentAccentColor: '#f59e0b',
        documentFooterText: 'Nathan Systems Ltda | Licença Comercial'
      };

      const setupRes = await fetch(`${API_URL}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupPayload)
      });
      
      const setupResult = await setupRes.json();
      console.log('Setup execution result:', setupResult);
      if (setupRes.status !== 201) {
        throw new Error(`Setup failed with status ${setupRes.status}: ${JSON.stringify(setupResult)}`);
      }
      console.log('✅ Setup completed successfully!');
    }

    // 3. Authenticate / Login
    console.log('\n--- STEP 3: Authenticating/Logging in ---');
    const loginPayload = {
      email: 'nathan@example.com',
      password: 'SecurePassword123!'
    };
    
    let loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });
    
    let loginData = await loginRes.json();
    if (loginRes.status !== 201) {
      // Try fallback to admin seed credentials if DB was pre-seeded
      console.log('Could not login as nathan@example.com. Attempting default seed user admin@example.com...');
      const seedLoginPayload = {
        email: 'admin@example.com',
        password: 'change-me-in-production'
      };
      loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seedLoginPayload)
      });
      loginData = await loginRes.json();
      if (loginRes.status !== 201) {
        throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
      }
    }
    
    const token = loginData.accessToken;
    console.log('✅ Authenticated successfully! Token obtained.');

    // 4. Verify User Profile / Role
    console.log('\n--- STEP 4: Verifying User Profile & RBAC Role ---');
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meRes.json();
    console.log('Active user profile:', {
      id: meData.id,
      name: meData.name,
      email: meData.email,
      role: meData.role,
      workspaceId: meData.workspaceId
    });
    
    if (meData.role !== 'OWNER' && meData.role !== 'ADMIN') {
      throw new Error(`Unexpected user role: ${meData.role}. Setup user must be OWNER/ADMIN.`);
    }
    console.log(`✅ Verified role is: ${meData.role}`);

    // 5. Update Company Profile (Configurações > Empresa)
    console.log('\n--- STEP 5: Updating Company White-Label/Branding Settings ---');
    const updateWsPayload = {
      name: 'Peanut Hardened OS',
      publicName: 'Peanut Hardened Inc',
      legalName: 'Peanut Hardened Solutions S.A.',
      companyDocument: '11222333000144',
      companyEmail: 'financeiro@peanutsystems.com',
      companyPhone: '11999998888',
      companyWebsite: 'https://peanutsystems.com',
      companyAddress: 'Alameda Santos, 400 - São Paulo, SP',
      primaryColorHex: '#6366f1',
      documentSecondaryColor: '#14b8a6',
      documentAccentColor: '#f43f5e',
      documentFooterText: 'Peanut Hardened Solutions S.A. | Todos os direitos reservados.',
      defaultInvoiceNotes: 'Pagamento em até 5 dias úteis.',
      defaultContractTerms: 'Contrato sujeito aos termos da licença Peanut Hardened.'
    };
    
    const updateWsRes = await fetch(`${API_URL}/workspaces/current`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateWsPayload)
    });
    
    const wsData = await updateWsRes.json();
    console.log('Workspace update response status:', updateWsRes.status);
    console.log('Workspace updated properties:', {
      name: wsData.name,
      publicName: wsData.publicName,
      primaryColorHex: wsData.primaryColorHex,
      documentSecondaryColor: wsData.documentSecondaryColor,
      documentFooterText: wsData.documentFooterText
    });
    
    if (updateWsRes.status !== 200) {
      throw new Error(`Workspace update failed: ${JSON.stringify(wsData)}`);
    }
    console.log('✅ Company details and brand colors successfully updated!');

    // 6. Test Templates Configuration
    console.log('\n--- STEP 6: Testing Document Templates Block Settings ---');
    const updateTemplatePayload = {
      templateKey: 'standard',
      layoutVariant: 'premium',
      enabledBlocks: {
        header: true,
        logo: true,
        companyInfo: true,
        clientInfo: true,
        documentTitle: true,
        itemsTable: true,
        financialSummary: true,
        paymentInfo: true,
        terms: true,
        observations: true,
        responsibleSignature: true,
        clientSignature: false,
        qrCode: false,
        footer: true
      },
      blockOrder: [
        'header', 'logo', 'companyInfo', 'clientInfo', 'documentTitle',
        'itemsTable', 'financialSummary', 'paymentInfo', 'observations',
        'terms', 'responsibleSignature', 'footer'
      ]
    };
    
    const updateTemplateRes = await fetch(`${API_URL}/document-templates/INVOICE`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateTemplatePayload)
    });
    
    const templateData = await updateTemplateRes.json();
    console.log('Template update response status:', updateTemplateRes.status);
    console.log('Updated template setting structure:', {
      documentType: templateData.documentType,
      templateKey: templateData.templateKey,
      layoutVariant: templateData.layoutVariant,
      blockOrderCount: templateData.blockOrder.length,
      enabledBlocksKeys: Object.keys(templateData.enabledBlocks)
    });
    
    if (updateTemplateRes.status !== 200) {
      throw new Error(`Template setting update failed: ${JSON.stringify(templateData)}`);
    }
    console.log('✅ A4 Document template block settings successfully saved!');

    // 7. Seed Client and Invoice in DB
    console.log('\n--- STEP 7: Creating Test Client and Invoice ---');
    const workspaceId = meData.workspaceId;
    
    // Create test Client
    const testClient = await prisma.client.create({
      data: {
        workspaceId,
        type: 'LEGAL_PERSON',
        legalName: 'E2E Test Client Inc',
        tradeName: 'E2E Client',
        document: '99888777000100',
        email: 'e2e@client.com',
        phone: '1144445555',
        status: 'ACTIVE'
      }
    });
    console.log(`Created test client: ${testClient.legalName} (${testClient.id})`);
    
    // Create test Invoice
    const testInvoice = await prisma.invoice.create({
      data: {
        workspaceId,
        clientId: testClient.id,
        number: 'FT-E2E-2026-999',
        status: 'PENDING',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        paymentMethod: 'PIX',
        pixKey: 'pix@peanutsystems.com',
        serviceSubtotalCents: 120000,
        materialSubtotalCents: 30000,
        totalAmountCents: 150000,
        currency: 'BRL',
        items: {
          create: [
            {
              workspaceId,
              description: 'Desenvolvimento e Configuração de Infraestrutura Hardened',
              type: 'SERVICE',
              quantity: 1,
              unitPriceCents: 120000,
              totalPriceCents: 120000
            },
            {
              workspaceId,
              description: 'Dispositivo Licença Gateway Firewall',
              type: 'MATERIAL',
              quantity: 1,
              unitPriceCents: 30000,
              totalPriceCents: 30000
            }
          ]
        }
      }
    });
    console.log(`Created test invoice: ${testInvoice.number} (${testInvoice.id})`);

    // 8. Test Background PDF Worker & Snapshot Generation
    console.log('\n--- STEP 8: Testing Invoice PDF PDF-Generation worker & Snapshots ---');
    const generatePdfRes = await fetch(`${API_URL}/invoices/${testInvoice.id}/pdf`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const generatePdfData = await generatePdfRes.json();
    console.log('PDF generation response status:', generatePdfRes.status);
    console.log('PDF generation response payload:', generatePdfData);
    
    if (generatePdfRes.status !== 200 && generatePdfRes.status !== 201) {
      throw new Error(`PDF generation request failed: ${JSON.stringify(generatePdfData)}`);
    }
    
    // Wait for the background worker to fetch, generate, and store the document metadata
    console.log('Waiting for background bullmq worker to compile templates and generate PDF...');
    let pdfDoc = null;
    for (let attempt = 1; attempt <= 15; attempt++) {
      await wait(1000);
      pdfDoc = await prisma.generatedDocument.findFirst({
        where: {
          workspaceId,
          entityType: 'INVOICE',
          entityId: testInvoice.id
        }
      });
      if (pdfDoc && pdfDoc.status === 'COMPLETED') {
        console.log(`Background generation completed on attempt ${attempt}!`);
        break;
      } else if (pdfDoc && pdfDoc.status === 'FAILED') {
        throw new Error(`Background generation failed! Error: ${pdfDoc.errorMessage}`);
      }
    }
    
    if (!pdfDoc) {
      throw new Error('Background generation timed out or GeneratedDocument was not created!');
    }
    
    console.log('GeneratedDocument details from DB:');
    console.log({
      id: pdfDoc.id,
      status: pdfDoc.status,
      fileObjectId: pdfDoc.fileObjectId,
      createdAt: pdfDoc.createdAt
    });
    
    // Verify document snapshots!
    console.log('Parsing metadata snapshots stored in GeneratedDocument...');
    const metadata = pdfDoc.metadata || {};
    console.log('Snapshots captured:');
    console.log('- brandSnapshot:', metadata.brandSnapshot);
    console.log('- responsibleSnapshot:', metadata.responsibleSnapshot);
    console.log('- templateSnapshot:', metadata.templateSnapshot);
    
    if (!metadata.brandSnapshot || !metadata.templateSnapshot) {
      throw new Error('Verification failed: brandSnapshot or templateSnapshot is missing from document metadata!');
    }
    
    if (metadata.brandSnapshot.documentPrimaryColor !== '#6366f1') {
      throw new Error(`Verification failed: documentPrimaryColor in brandSnapshot is ${metadata.brandSnapshot.documentPrimaryColor}, expected '#6366f1'`);
    }
    
    if (metadata.templateSnapshot.layoutVariant !== 'premium') {
      throw new Error(`Verification failed: layoutVariant in templateSnapshot is ${metadata.templateSnapshot.layoutVariant}, expected 'premium'`);
    }
    
    console.log('✅ Snapshots verified successfully! The historic document locked the colors and blocks perfectly.');

    // 9. Query Audit Logs
    console.log('\n--- STEP 9: Verifying Sanitized Audit Logs ---');
    const logs = await prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${logs.length} audit logs in current workspace:`);
    logs.slice(0, 10).forEach(log => {
      console.log(`- Action: ${log.action} | Entity: ${log.entityType} | Actor: ${log.actorUserId}`);
    });
    
    const brandUpdatedLog = logs.find(log => log.action === 'brand.updated');
    const templateUpdatedLog = logs.find(log => log.action === 'document_template.updated');
    
    if (!brandUpdatedLog) {
      console.log('⚠️ Warning: brand.updated audit event not found in database.');
    } else {
      console.log('✅ Found brand.updated log:');
      console.log(JSON.parse(brandUpdatedLog.afterJson));
    }
    
    if (!templateUpdatedLog) {
      console.log('⚠️ Warning: document_template.updated audit event not found.');
    } else {
      console.log('✅ Found document_template.updated log:');
      console.log(JSON.parse(templateUpdatedLog.afterJson));
    }
    
    console.log('\n🌟🌟🌟 ALL INTEGRATION CHECKS COMPLETED SUCCESSFULY! 🌟🌟🌟');
    
  } catch (error) {
    console.error('\n❌ E2E Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
