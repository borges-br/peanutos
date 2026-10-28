#!/usr/bin/env node
// Copy only. Never edits the database, removes source objects or overwrites a target.
const { createHash } = require('node:crypto');
const { existsSync } = require('node:fs');
const { writeFile } = require('node:fs/promises');
const { resolve, isAbsolute } = require('node:path');

async function verifyFile(store, file) {
  const hash = createHash('sha256');
  let size = 0n;
  for await (const chunk of await store.get(file.bucket, file.key)) {
    size += BigInt(chunk.length);
    hash.update(chunk);
  }
  if (size !== BigInt(file.sizeBytes) || hash.digest('hex') !== file.sha256.toLowerCase()) {
    throw new Error('Tamanho ou SHA-256 diferente do registro no banco.');
  }
}

async function transferFile(file, target, source) {
  try {
    await verifyFile(target, file);
    return 'already_verified';
  } catch (error) {
    // Corrupt targets and permission failures must never be silently overwritten.
    if (error.code !== 'ENOENT') throw error;
    if (!source) throw new Error('Arquivo ausente no destino.');
  }
  const hash = createHash('sha256');
  const chunks = [];
  let size = 0n;
  for await (const chunk of await source.get(file.bucket, file.key)) {
    const buffer = Buffer.from(chunk);
    size += BigInt(buffer.length);
    if (size > BigInt(file.sizeBytes)) throw new Error('Origem maior que o tamanho registrado.');
    hash.update(buffer);
    chunks.push(buffer);
  }
  if (size !== BigInt(file.sizeBytes) || hash.digest('hex') !== file.sha256.toLowerCase()) {
    throw new Error('Origem não confere com o tamanho/SHA-256 do banco.');
  }
  await target.put(file.bucket, file.key, Buffer.concat(chunks));
  await verifyFile(target, file);
  return 'copied_and_verified';
}

async function main() {
  for (const path of [resolve(process.cwd(), '.env'), resolve(__dirname, '../../../.env')]) {
    if (existsSync(path)) { require('dotenv').config({ path, override: false }); break; }
  }
  const { prisma } = require('@peanut/db');
  try {
    const { LocalObjectStorage } = require('@peanut/utils');
    const args = process.argv.slice(2);
    if (args.includes('--help')) {
      console.log('node scripts/migrate-storage.cjs --source=verify|s3|directory [--source-dir=/export] [--report=/backup/report.json]');
      return;
    }
    if (args.some(arg => !/^--(?:source|source-dir|report)=.+$/.test(arg))) throw new Error('Argumento inválido. Use --help.');
    const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
    const mode = option('source') || 'verify';
    const reportPath = resolve(option('report') || 'storage-migration-report.json');
    const target = new LocalObjectStorage();
    let source;
    if (mode === 'directory') {
      const directory = option('source-dir');
      if (!directory || !isAbsolute(directory)) throw new Error('--source-dir deve indicar uma exportação em caminho absoluto.');
      if (resolve(directory) === target.root) throw new Error('Origem e destino devem ser diferentes.');
      source = new LocalObjectStorage(directory);
    } else if (mode === 's3') {
      // The S3 SDK is restricted to this offline migration tool, never app runtime.
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const endpoint = process.env.MIGRATION_S3_ENDPOINT;
      const accessKeyId = process.env.MIGRATION_S3_ACCESS_KEY;
      const secretAccessKey = process.env.MIGRATION_S3_SECRET_KEY;
      if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error('Defina MIGRATION_S3_ENDPOINT, MIGRATION_S3_ACCESS_KEY e MIGRATION_S3_SECRET_KEY.');
      const client = new S3Client({
        endpoint, region: process.env.MIGRATION_S3_REGION || 'us-east-1',
        forcePathStyle: process.env.MIGRATION_S3_FORCE_PATH_STYLE !== 'false',
        credentials: { accessKeyId, secretAccessKey },
      });
      source = { get: async (bucket, key) => {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!result.Body) throw new Error('Objeto sem conteúdo na origem.');
        return result.Body;
      } };
    } else if (mode !== 'verify') {
      throw new Error('--source deve ser verify, s3 ou directory.');
    }
    const report = { startedAt: new Date().toISOString(), mode, verified: 0, copied: 0, failed: 0, failures: [] };
    // Preflight report permissions before copying anything.
    await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
    let cursor;
    while (true) {
      const files = await prisma.fileObject.findMany({
        take: 100, orderBy: { id: 'asc' }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!files.length) break;
      for (const file of files) {
        try {
          const status = await transferFile(file, target, source);
          report.verified++;
          if (status === 'copied_and_verified') report.copied++;
        } catch (error) {
          report.failed++;
          report.failures.push({ fileObjectId: file.id, bucket: file.bucket, key: file.key, error: error.message });
        }
      }
      cursor = files[files.length - 1].id;
      await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
    }
    report.finishedAt = new Date().toISOString();
    await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ verified: report.verified, copied: report.copied, failed: report.failed, report: reportPath }));
    if (report.failed) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { verifyFile, transferFile };
if (require.main === module) main().catch(error => {
  console.error(`Migração interrompida: ${error.message}`);
  process.exitCode = 1;
});
