import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { homedir } from 'node:os';

const fallbackDockerPath = '/Applications/Docker.app/Contents/Resources/bin/docker';
const fallbackOrbStackDockerPath = `${homedir()}/.orbstack/bin/docker`;
const fallbackOrbStackComposePath = `${homedir()}/.orbstack/bin/docker-compose`;
const fallbackOrbStackSocketPath = `${homedir()}/.orbstack/run/docker.sock`;

function findCommand(command) {
  const fromPath = spawnSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8' });
  return fromPath.status === 0 ? fromPath.stdout.trim() : '';
}

function supportsDockerCompose(docker) {
  const result = spawnSync(docker, ['compose', 'version'], { encoding: 'utf8' });
  return result.status === 0;
}

function resolveComposeCommand() {
  const dockerCandidates = [
    findCommand('docker'),
    existsSync(fallbackDockerPath) ? fallbackDockerPath : '',
    existsSync(fallbackOrbStackDockerPath) ? fallbackOrbStackDockerPath : '',
  ].filter(Boolean);

  for (const docker of dockerCandidates) {
    if (supportsDockerCompose(docker)) {
      return {
        command: docker,
        argsPrefix: ['compose'],
        env: docker === fallbackOrbStackDockerPath && existsSync(fallbackOrbStackSocketPath)
          ? { DOCKER_HOST: `unix://${fallbackOrbStackSocketPath}` }
          : {},
      };
    }
  }

  const compose = findCommand('docker-compose')
    || (existsSync(fallbackOrbStackComposePath) ? fallbackOrbStackComposePath : '');

  if (compose) {
    return {
      command: compose,
      argsPrefix: [],
      env: compose === fallbackOrbStackComposePath && existsSync(fallbackOrbStackSocketPath)
        ? { DOCKER_HOST: `unix://${fallbackOrbStackSocketPath}` }
        : {},
    };
  }

  return {
    command: 'docker',
    argsPrefix: ['compose'],
    env: {},
  };
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

const compose = resolveComposeCommand();
const result = spawnSync(compose.command, [...compose.argsPrefix, ...args], {
  env: {
    ...process.env,
    ...compose.env,
    PATH: `${dirname(compose.command)}:${process.env.PATH ?? ''}`,
  },
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
