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

  // 8. Create a Ticket
  const ticket = await prisma.ticket.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      contactId: contact.id,
      clientUserId: clientUser1.id,
      assetId: serverAsset.id,
      number: 'TKT-2026-0001',
      title: 'Aviso de lentidão no banco de dados de teste',
      description: 'Usuários relatam intermitência no acesso ao banco de dados no final da tarde.',
      channel: 'EMAIL',
      priority: 'HIGH',
      status: 'OPEN',
      assignedToId: adminUser.id,
    },
  });
  console.log(`- Fictive ticket created: ${ticket.number} - "${ticket.title}"`);

  // 9. Create a Ticket Comment
  await prisma.ticketComment.create({
    data: {
      ticketId: ticket.id,
      userId: adminUser.id,
      content: 'Análise inicial concluída. Iremos verificar a utilização de memória no servidor nas próximas horas.',
      isInternal: true,
    },
  });

  // 10. Create an Audit Log
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
