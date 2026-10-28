import { existsSync } from 'node:fs';
import { mkdir, open, link, unlink, lstat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

function defaultStoragePath(): string {
  if (process.env.STORAGE_PATH) {
    if (!isAbsolute(process.env.STORAGE_PATH)) {
      throw new Error('STORAGE_PATH deve ser um caminho absoluto.');
    }
    return process.env.STORAGE_PATH;
  }
  let directory = process.cwd();
  while (true) {
    if (existsSync(resolve(directory, 'pnpm-workspace.yaml'))) {
      return resolve(directory, 'data/storage');
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error('Defina STORAGE_PATH para o volume persistente compartilhado.');
}

/** Private filesystem store shared by the API, PDF worker and migration tool.
 * Existing bucket/key pairs remain unchanged; no database IDs or URLs change.
 * Only trusted application processes may write inside this directory.
 */
export class LocalObjectStorage {
  readonly bucket = 'peanut-os-documents';
  readonly root: string;

  constructor(root = defaultStoragePath()) {
    this.root = resolve(root);
  }

  objectPath(bucket: string, key: string): string {
    if (!bucket || !key || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(bucket) ||
        bucket === '.' || bucket === '..' || key.includes('\\') ||
        key.includes('\0') || key.split('/').some(part => !part || part === '.' || part === '..' || part.includes(':'))) {
      throw new Error('Caminho de arquivo inválido.');
    }
    const path = resolve(this.root, bucket, key);
    const child = relative(this.root, path);
    if (!child || isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) {
      throw new Error('Caminho fora do armazenamento.');
    }
    return path;
  }

  private async rejectSymlinks(path: string): Promise<void> {
    let current = path;
    while (true) {
      try {
        if ((await lstat(current)).isSymbolicLink()) throw new Error('Links simbólicos não são permitidos no armazenamento.');
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  async put(bucket: string, key: string, body: Buffer): Promise<void> {
    const path = this.objectPath(bucket, key);
    await this.rejectSymlinks(path);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temp = `${path}.${randomUUID()}.tmp`;
    const handle = await open(temp, 'wx', 0o600);
    try {
      try {
        await handle.writeFile(body);
        await handle.sync();
      } finally {
        await handle.close();
      }
      // Atomic publication with no overwrite, including concurrent writers.
      await link(temp, path);
    } finally {
      await unlink(temp).catch(() => {});
    }
  }

  async get(bucket: string, key: string) {
    const path = this.objectPath(bucket, key);
    await this.rejectSymlinks(path);
    const handle = await open(path, 'r');
    const stat = await handle.stat();
    if (!stat.isFile()) {
      await handle.close();
      throw new Error('Objeto não é um arquivo.');
    }
    return handle.createReadStream({ autoClose: true });
  }

  async remove(bucket: string, key: string): Promise<void> {
    const path = this.objectPath(bucket, key);
    await this.rejectSymlinks(path);
    await unlink(path);
  }
}
