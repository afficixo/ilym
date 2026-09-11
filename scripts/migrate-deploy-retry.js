const { spawn } = require('node:child_process');

const maxAttempts = 3;
const retryDelaysMs = [5000, 15000];
const prismaCli = require.resolve('prisma/build/index.js');

function getMigrationDatabaseUrl() {
  if (process.env.DIRECT_DATABASE_URL) {
    return process.env.DIRECT_DATABASE_URL;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);
    if (url.hostname.includes('-pooler.')) {
      url.hostname = url.hostname.replace('-pooler.', '.');
      return url.toString();
    }
  } catch {
    return databaseUrl;
  }

  return databaseUrl;
}

function runMigration() {
  return new Promise((resolve, reject) => {
    const migrationDatabaseUrl = getMigrationDatabaseUrl();
    const child = spawn(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(migrationDatabaseUrl ? { DATABASE_URL: migrationDatabaseUrl } : {}),
      },
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const exitCode = await runMigration();

    if (exitCode === 0) {
      return;
    }

    if (attempt < maxAttempts) {
      const waitMs = retryDelaysMs[attempt - 1];
      console.warn(`Prisma migration failed; retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxAttempts}).`);
      await delay(waitMs);
    } else {
      process.exitCode = exitCode;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});