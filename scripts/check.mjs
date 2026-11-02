import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const syntaxChecks = readdirSync(new URL('../dist/', import.meta.url)).filter((file) => file.endsWith('.js')).sort().map((file) => ['--check', `dist/${file}`]);
for (const args of [...syntaxChecks, ['--test', 'tests/order.test.mjs']]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
