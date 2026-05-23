import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  // Mock bcrypt hash for "password123"
  const passwordHash = '$2b$10$EPf52D.RGA5f.x2XwKz2sOc0d4D6.08CqYfV/P.pYV3x2p9Y74pD2';
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
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

  // 5. Create a Client User
  const clientUser = await prisma.clientUser.create({
    data: {
      clientId: client.id,
      fullName: 'Beltrano Silva',
      email: 'beltrano@example.com',
      department: 'Financeiro',
      jobTitle: 'Analista Financeiro Sênior',
      status: 'ACTIVE',
      notes: 'Usuário financeiro com acesso restrito a faturas.',
    },
  });
  console.log(`- Fictive client user created: ${clientUser.fullName}`);

  // 6. Create Fictive Assets
  const serverAsset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      name: 'srv-acme-prod',
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
      sensitiveDataEncrypted: 'RmVjaGFkbyBlbSBjb2ZyZSBkZSB0ZXN0ZSBmaWN0w61jaW8=', // Base64 stub
      notes: 'Servidor de banco de dados de homologação.',
    },
  });

  const notebookAsset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      assignedClientUserId: clientUser.id,
      name: 'nb-acme-finance',
      hostname: 'nb-acme-fin02',
      type: 'NOTEBOOK',
      status: 'OPERATIONAL',
      manufacturer: 'Lenovo',
      model: 'ThinkPad T14',
      serialNumber: 'LNV987654321',
      assetTag: 'ACME-NB-02',
      operatingSystem: 'Windows 11 Pro',
      location: 'Escritório Central - Mesa 4',
      notes: 'Entregue com termo de responsabilidade assinado.',
    },
  });
  console.log(`- Fictive assets created: ${serverAsset.name}, ${notebookAsset.name}`);

  // 7. Create a Ticket
  const ticket = await prisma.ticket.create({
    data: {
      workspaceId: workspace.id,
      clientId: client.id,
      contactId: contact.id,
      clientUserId: clientUser.id,
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

  // 8. Create a Ticket Comment
  await prisma.ticketComment.create({
    data: {
      ticketId: ticket.id,
      userId: adminUser.id,
      content: 'Análise inicial concluída. Iremos verificar a utilização de memória no servidor nas próximas horas.',
      isInternal: true,
    },
  });

  // 9. Create an Audit Log
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
