const { execFileSync, spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, ".."),
  name = `peanut-branding-qa-${randomUUID().slice(0, 8)}`,
  password = randomUUID();
const docker = (args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 90000,
  }).trim();
let container,
  cleanedUp = false;
const evidence = path.join(root, "data/qa/branding-v2");
fs.mkdirSync(evidence, { recursive: true });
const startedAt = new Date().toISOString(),
  steps = [],
  logs = [];
try {
  container = docker([
    "run",
    "-d",
    "--rm",
    "--name",
    name,
    "--label",
    "peanut.qa=branding",
    "--memory",
    "512m",
    "--tmpfs",
    "/var/lib/postgresql/data:rw",
    "-p",
    "127.0.0.1::5432",
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "-e",
    "POSTGRES_DB=peanut_branding_qa",
    "postgres:16-alpine",
  ]);
  if (!/^[a-f0-9]{64}$/.test(container))
    throw new Error("Unexpected QA container.");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    if (
      spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres"], {
        windowsHide: true,
      }).status === 0
    ) {
      ready = true;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  if (!ready) throw new Error("Disposable PostgreSQL did not start.");
  const port = docker(["port", container, "5432/tcp"]).match(
    /127\.0\.0\.1:(\d+)/,
  )?.[1];
  if (!port) throw new Error("PostgreSQL must use loopback.");
  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/peanut_branding_qa?schema=public`,
    env = {
      ...process.env,
      DATABASE_URL: url,
      BRANDING_TEST_DATABASE_URL: url,
    };
  const cli = createRequire(
    path.join(root, "packages/db/package.json"),
  ).resolve("prisma/build/index.js");
  const run = (args) => {
    const r = spawnSync(process.execPath, args, {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    process.stdout.write(
      (r.stdout || "")
        .split("\n")
        .filter((line) => !line.startsWith("[FilesController]"))
        .join("\n"),
    );
    process.stderr.write(r.stderr || "");
    const label = args.includes("migrate")
      ? "prisma migrate deploy"
      : args.filter((a) => !a.includes("node_modules")).join(" ");
    logs.push(`${label}\n${r.stdout || ""}${r.stderr || ""}`);
    steps.push({
      command: label,
      exitCode: r.status,
      tests:
        Number((r.stdout || "").match(/(?:ℹ tests |# tests )(\d+)/)?.[1]) ||
        undefined,
    });
    if (r.status !== 0) throw new Error("QA command failed.");
  };
  run([
    cli,
    "migrate",
    "deploy",
    "--schema",
    "packages/db/prisma/schema.prisma",
  ]);
  run(["--test", "tests/branding-postgres.test.cjs"]);
  if (process.argv.includes("--ui"))
    run([
      "tests/branding-ui.cjs",
      "--extended",
      "--postgres",
      ...(process.argv.includes("--dev") ? ["--dev"] : []),
    ]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (
    container &&
    /^[a-f0-9]{64}$/.test(container) &&
    docker([
      "inspect",
      "--format",
      '{{ index .Config.Labels "peanut.qa" }}',
      container,
    ]) === "branding"
  ) {
    docker(["rm", "-f", container]);
    cleanedUp = true;
  }
  fs.writeFileSync(
    path.join(evidence, "postgres-tests.log"),
    logs.join("\n\n"),
  );
  fs.writeFileSync(
    path.join(evidence, "postgres-results.json"),
    JSON.stringify(
      {
        startedAt,
        completedAt: new Date().toISOString(),
        image: "postgres:16-alpine",
        database: "peanut_branding_qa",
        tmpfs: true,
        loopbackOnly: true,
        steps,
        cleanedUp,
        passed: process.exitCode !== 1 && steps.length >= 2,
      },
      null,
      2,
    ),
  );
}
