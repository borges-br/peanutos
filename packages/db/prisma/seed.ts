import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encryptSeedData(text: string): string {
  const key = process.env.APP_ENCRYPTION_KEY || process.env.APPLICATION_ENCRYPTION_KEY || '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
  let keyBuffer: Buffer;
  
  if (key.length === 64 && /^[0-9a-fA-F]{64}$/.test(key)) {
    keyBuffer = Buffer.from(key, 'hex');
  } else {
    try {
      const parsed = Buffer.from(key, 'base64');
      if (parsed.length === 32) {
        keyBuffer = parsed;
      } else {
        keyBuffer = Buffer.from(key.padEnd(32, '0').substring(0, 32), 'utf-8');
      }
    } catch {
      keyBuffer = Buffer.from(key.padEnd(32, '0').substring(0, 32), 'utf-8');
    }
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  return `v1:gcm:${iv.toString('base64')}:${authTag}:${encrypted}`;
}

async function main() {
  console.log('🌱 Starting database seed with strictly fictive data...');

  // 1. Create a Default Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'peanut-os-default' },
    update: {},
    create: {
      name: 'Peanut OS Default Workspace',
      slug: 'peanut-os-default',
      status: 'ACTIVE',
    },
  });
  console.log(`- Workspace created/found: ${workspace.name} (${workspace.id})`);

  // 2. Create default Admin User (OWNER role)
  const passwordHash = '$2b$10$aPtlplAqQ63c8I1GKjQDI.xMC9x3uqAhPH0LOiO33Ow6EqmiudVx6';
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash,
    },
    create: {
      workspaceId: workspace.id,
      name: 'Admin Peanut',
      email: 'admin@example.com',
      passwordHash,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });
  console.log(`- Default owner user created: ${adminUser.name} (${adminUser.email})`);

  // 3. Create a fictive Client (Acme Tecnologia Ltda)
  const client = await prisma.client.create({
    data: {
      workspaceId: workspace.id,
      type: 'LEGAL_PERSON',
      legalName: 'Acme Tecnologia Ltda',
      tradeName: 'Acme Tech',
      document: '12345678000195', // Fake CNPJ
      email: 'contato@example.com',
      phone: '1155550199', // Fake phone
      website: 'https://acme-example.com',
      notes: 'Cliente teste inicial fictício para homologação da plataforma.',
      status: 'ACTIVE',
    },
  });
  console.log(`- Fictive client created: ${client.legalName}`);

  // 4. Create a Contact for the Client
  const contact = await prisma.clientContact.create({
    data: {
      clientId: client.id,
      name: 'Fulano de Tal',
      email: 'fulano@example.com',
      phone: '1155550198',
      mobile: '11999990198',
      role: 'Gerente de TI',
      department: 'Tecnologia',
      isPrimary: true,
      notes: 'Ponto de contato principal para incidentes críticos.',
    },
  });
  console.log(`- Fictive contact created: ${contact.name}`);

  // 5. Create Client Users
  const clientUser1 = await prisma.clientUser.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      fullName: 'Maria Example',
      email: 'maria.example@acme.com',
      department: 'Financeiro',
      jobTitle: 'Analista Financeiro Sênior',
      status: 'ACTIVE',
      notes: 'Usuário financeiro com acesso restrito a faturas.',
    },
  });

  const clientUser2 = await prisma.clientUser.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      fullName: 'João Example',
      email: 'joao.example@acme.com',
      department: 'Tecnologia',
      jobTitle: 'Desenvolvedor Pleno',
      status: 'ACTIVE',
      notes: 'Desenvolvedor com acesso a máquinas de desenvolvimento.',
    },
  });
  console.log(`- Fictive client users created: ${clientUser1.fullName}, ${clientUser2.fullName}`);

  // 6. Create Fictive Assets with AES-256-GCM encrypted sensitive data
  const serverAsset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      name: 'SRV-ACME-001',
      hostname: 'srv-acme-prod.local',
      type: 'SERVER',
      status: 'OPERATIONAL',
      manufacturer: 'Dell',
      model: 'PowerEdge R740',
      serialNumber: 'ABC123XYZ456', // Fake serial
      assetTag: 'ACME-SRV-01',
      macAddress: '00:1A:2B:3C:4D:5E',
      operatingSystem: 'Ubuntu Server 22.04 LTS',
      location: 'Rack Principal - Sala do Servidor',
      sensitiveDataEncrypted: encryptSeedData(JSON.stringify({
        remoteAccessNotes: 'Senha SSH SSHPort: 22 admin / fictivePass123!',
        vpnNotes: 'Acesso via console local apenas',
        managementUrl: 'https://srv-prod.acme.local:8443'
      })),
      notes: 'Servidor de banco de dados de homologação.',
    },
  });

  const notebookAsset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      assignedClientUserId: clientUser1.id,
      name: 'NB-ACME-001',
      hostname: 'nb-acme-fin02',
      type: 'NOTEBOOK',
      status: 'OPERATIONAL',
      manufacturer: 'Lenovo',
      model: 'ThinkPad T14',
      serialNumber: 'LNV987654321',
      assetTag: 'ACME-NB-01',
      operatingSystem: 'Windows 11 Pro',
      location: 'Escritório Central - Mesa 4',
      sensitiveDataEncrypted: encryptSeedData(JSON.stringify({
        remoteAccessNotes: 'RustDesk ID: 987 654 321 / Pass: FictiveRustPass',
        vpnNotes: 'VPN Financeira ativa',
        managementUrl: ''
      })),
      notes: 'Notebook entregue com termo de responsabilidade assinado.',
    },
  });

  const routerAsset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      assignedClientUserId: clientUser2.id,
      name: 'RTR-ACME-001',
      hostname: 'rtr-acme-gw',
      type: 'ROUTER',
      status: 'OPERATIONAL',
      manufacturer: 'MikroTik',
      model: 'RB4011iGS+',
      serialNumber: 'MTK11223344',
      assetTag: 'ACME-RTR-01',
      location: 'Rack Principal',
      sensitiveDataEncrypted: encryptSeedData(JSON.stringify({
        remoteAccessNotes: 'MikroTik WinBox: admin / fictiveRouterPass1!',
        vpnNotes: 'Servidor VPN IPSec ativo',
        managementUrl: 'http://192.168.88.1'
      })),
      notes: 'Roteador Gateway de borda da rede.',
    },
  });

  const printerAsset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      name: 'PRN-ACME-001',
      hostname: 'prn-acme-finance',
      type: 'PRINTER',
      status: 'OPERATIONAL',
      manufacturer: 'HP',
      model: 'LaserJet Pro M404dn',
      serialNumber: 'HPP55667788',
      assetTag: 'ACME-PRN-01',
      location: 'Setor Financeiro',
      notes: 'Impressora LaserJet compartilhada na rede.',
    },
  });
  console.log(`- Fictive assets created: ${serverAsset.name}, ${notebookAsset.name}, ${routerAsset.name}, ${printerAsset.name}`);

  // 7. Seed notes and histories for demonstration
  await prisma.assetNote.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      assetId: serverAsset.id,
      authorUserId: adminUser.id,
      content: 'Realizado upgrade de memória RAM de 32GB para 64GB em manutenção programada.',
      visibility: 'INTERNAL',
    }
  });

  await prisma.assetHistory.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      assetId: serverAsset.id,
      actorUserId: adminUser.id,
      event: 'ASSET_CREATED',
      description: 'Ativo registrado no inventário inicial',
    }
  });

  await prisma.assetHistory.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      assetId: notebookAsset.id,
      actorUserId: adminUser.id,
      event: 'ASSIGNED',
      description: `Equipamento atribuído ao usuário Maria Example`,
    }
  });

  // 8. Seed default SLA Policies
  console.log('- Seeding default SLA Policies...');
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'] as const;
  const slaConfigs: Record<typeof priorities[number], { name: string; response: number; start: number; resolution: number }> = {
    LOW: { name: 'SLA Padrão - Baixa', response: 240, start: 960, resolution: 7200 },
    MEDIUM: { name: 'SLA Padrão - Média', response: 120, start: 240, resolution: 2880 },
    HIGH: { name: 'SLA Padrão - Alta', response: 60, start: 120, resolution: 1440 },
    URGENT: { name: 'SLA Padrão - Urgente', response: 30, start: 60, resolution: 480 },
    CRITICAL: { name: 'SLA Padrão - Crítica', response: 15, start: 30, resolution: 240 },
  };

  const slaPolicies: Record<string, string> = {};
  for (const prio of priorities) {
    const config = slaConfigs[prio];
    const policy = await prisma.slaPolicy.upsert({
      where: {
        workspaceId_priority: {
          workspaceId: workspace.id,
          priority: prio,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: config.name,
        priority: prio,
        firstResponseMinutes: config.response,
        startMinutes: config.start,
        resolutionMinutes: config.resolution,
        businessHoursOnly: false,
        active: true,
      },
    });
    slaPolicies[prio] = policy.id;
  }

  // 9. Create standard tickets
  const now = new Date();

  // Ticket 1: TCK-000001
  const t1DueResp = new Date(now); t1DueResp.setMinutes(t1DueResp.getMinutes() + 120); // MEDIUM: 2h
  const t1DueRes = new Date(now); t1DueRes.setMinutes(t1DueRes.getMinutes() + 2880); // MEDIUM: 48h
  const ticket1 = await prisma.ticket.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      contactId: contact.id,
      clientUserId: clientUser1.id,
      assetId: notebookAsset.id,
      slaPolicyId: slaPolicies['MEDIUM'],
      number: 'TCK-000001',
      title: 'Notebook não conecta no Wi-Fi',
      description: 'Dispositivo ThinkPad T14 (Maria Example) perde conectividade de rede sem fio repetidamente.',
      channel: 'WHATSAPP',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedToId: adminUser.id,
      openedAt: now,
      slaDueFirstResponseAt: t1DueResp,
      slaDueResolutionAt: t1DueRes,
    },
  });

  // Ticket 2: TCK-000002
  const t2DueResp = new Date(now); t2DueResp.setMinutes(t2DueResp.getMinutes() + 30); // URGENT: 30m
  const t2DueRes = new Date(now); t2DueRes.setMinutes(t2DueRes.getMinutes() + 480); // URGENT: 8h
  const ticket2 = await prisma.ticket.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      contactId: contact.id,
      clientUserId: clientUser2.id,
      assetId: serverAsset.id,
      slaPolicyId: slaPolicies['URGENT'],
      number: 'TCK-000002',
      title: 'Servidor com alerta de espaço em disco',
      description: 'Volume /var do servidor Dell PowerEdge R740 atingiu 92% de ocupação e requer limpeza.',
      channel: 'EMAIL',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      assignedToId: adminUser.id,
      openedAt: now,
      startedAt: now,
      slaDueFirstResponseAt: t2DueResp,
      slaDueResolutionAt: t2DueRes,
    },
  });

  // Ticket 3: TCK-000003
  const t3DueResp = new Date(now); t3DueResp.setMinutes(t3DueResp.getMinutes() + 240); // LOW: 4h
  const t3DueRes = new Date(now); t3DueRes.setMinutes(t3DueRes.getMinutes() + 7200); // LOW: 120h
  const ticket3 = await prisma.ticket.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      contactId: contact.id,
      assetId: printerAsset.id,
      slaPolicyId: slaPolicies['LOW'],
      number: 'TCK-000003',
      title: 'Impressora não imprime',
      description: 'HP LaserJet Pro no setor financeiro está apresentando código de erro offline constante.',
      channel: 'PHONE',
      priority: 'LOW',
      status: 'TRIAGE',
      openedAt: now,
      slaDueFirstResponseAt: t3DueResp,
      slaDueResolutionAt: t3DueRes,
    },
  });

  console.log(`- Fictive tickets created: ${ticket1.number}, ${ticket2.number}, ${ticket3.number}`);

  // 10. Seed comments with workspaceId!
  await prisma.ticketComment.create({
    data: {
      workspaceId: workspace.id,
      ticketId: ticket1.id,
      userId: adminUser.id,
      content: 'Verificando as configurações do access point principal para Maria.',
      isInternal: true,
      visibility: 'INTERNAL',
    },
  });

  // 11. Create an Audit Log
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: adminUser.id,
      action: 'CLIENT_CREATE',
      entityType: 'CLIENT',
      entityId: client.id,
      afterJson: JSON.stringify({ legalName: client.legalName, document: client.document }),
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PeanutAgent/1.0',
      severity: 'INFO',
    },
  });

  // ==============================================================================
  // PHASE 4 — CONTRACTS & RECURRING BILLING SEED
  // ==============================================================================
  console.log('- Seeding Phase 4 Contract, Line Items, and Billing Schedule Events...');
  const contract = await prisma.contract.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      number: 'CTR-ACME-2026-001',
      title: 'Contrato Mensal de Suporte e Monitoramento - Acme Tech',
      description: 'Suporte técnico integral de TI, licenciamento e backup corporativo com limites de quota.',
      status: 'ACTIVE',
      type: 'RECURRING_SUPPORT',
      startDate: new Date(2026, 0, 1), // Jan 1, 2026
      endDate: new Date(2026, 11, 31), // Dec 31, 2026
      renewalMode: 'MONTHLY',
      billingDay: 10,
      monthlyAmountCents: 150000, // R$ 1.500,00
      currency: 'BRL',
      maxUsers: 20,
      maxAssets: 50,
      includedRemoteTickets: 100,
      includedOnsiteVisits: 5,
      includedRemoteHours: 50,
      includedOnsiteHours: 10,
      slaPolicyId: slaPolicies['MEDIUM'],
      notes: 'Faturamento recorrente via PIX com cobrança no dia 10 de cada mês.',
    },
  });

  // Seed Contract Line Items
  await prisma.contractLineItem.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        contractId: contract.id,
        description: 'Suporte técnico recorrente',
        itemType: 'SUPPORT',
        quantity: 1.0,
        unitPriceCents: 100000, // R$ 1.000,00
        totalPriceCents: 100000,
        recurring: true,
      },
      {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        contractId: contract.id,
        description: 'Monitoramento básico',
        itemType: 'MONITORING',
        quantity: 1.0,
        unitPriceCents: 30000, // R$ 300,00
        totalPriceCents: 30000, // R$ 300,00
        recurring: true,
      },
      {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        contractId: contract.id,
        description: 'Backup cloud fictício',
        itemType: 'BACKUP',
        quantity: 1.0,
        unitPriceCents: 20000, // R$ 200,00
        totalPriceCents: 20000,
        recurring: true,
      },
    ],
  });

  // Seed Billing Schedule Event (PENDING event for next cycle)
  await prisma.billingScheduleEvent.create({
    data: {
      workspaceId: workspace.id,
      contractId: contract.id,
      clientId: client.id,
      scheduledFor: new Date(2026, 5, 10), // June 10, 2026
      status: 'PENDING',
      periodKey: '2026-06',
      amountCents: 150000,
      currency: 'BRL',
      description: 'Recorrência contratual mensal de suporte - Competência Junho/2026',
    },
  });

  // Seed Contract History
  await prisma.contractHistory.create({
    data: {
      workspaceId: workspace.id,
      contractId: contract.id,
      actorUserId: adminUser.id,
      event: 'CONTRACT_CREATED',
      description: 'Contrato inicial homologado e ativado no status ACTIVE com limite de 20 usuários e 50 ativos.',
      after: JSON.stringify({ status: 'ACTIVE', monthlyAmountCents: 150000, maxUsers: 20, maxAssets: 50 }),
    },
  });

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
