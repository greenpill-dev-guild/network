import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';

const fallbackDockerPath = '/Applications/Docker.app/Contents/Resources/bin/docker';

function resolveDockerCommand() {
  const fromPath = spawnSync('sh', ['-c', 'command -v docker'], { encoding: 'utf8' });
  const candidate = fromPath.stdout.trim();

  if (fromPath.status === 0 && candidate) {
    return candidate;
  }

  if (existsSync(fallbackDockerPath)) {
    return fallbackDockerPath;
  }

  return 'docker';
}

const args = [];
const inputArgs = process.argv.slice(2);

for (let index = 0; index < inputArgs.length; index += 1) {
  const arg = inputArgs[index];

  if (arg !== '--env-file-if-exists') {
    args.push(arg);
    continue;
  }

  const envFile = inputArgs[index + 1];
  index += 1;

  if (envFile && existsSync(envFile)) {
    args.push('--env-file', envFile);
  }
}

const docker = resolveDockerCommand();
const result = spawnSync(docker, ['compose', ...args], {
  env: {
    ...process.env,
    PATH: `${dirname(docker)}:${process.env.PATH ?? ''}`,
  },
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
