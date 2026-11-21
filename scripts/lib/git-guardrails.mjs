// Git helpers for the diff-aware checks in scripts/quality. Adapted from Green Goods'
// scripts/lib/git-guardrails.mjs; the default base here is origin/main.
import { spawnSync } from 'node:child_process';

export function runGit(repoRoot, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error && !allowFailure) throw new Error(`git ${args.join(' ')} failed: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result;
}

function resolves(repoRoot, candidate) {
  return (
    runGit(repoRoot, ['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`], { allowFailure: true }).status === 0
  );
}

export function parseBaseArgs(argv) {
  let base;
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--base') {
      if (!argv[index + 1]) throw new Error('--base requires a Git ref');
      base = argv[++index];
    } else {
      throw new Error(`unknown argument: ${argv[index]}`);
    }
  }
  return { base };
}

export function resolveGitBase({ repoRoot, explicitBase, environmentVariables = [], fallback = 'origin/main' }) {
  if (explicitBase) {
    if (!resolves(repoRoot, explicitBase)) throw new Error(`base ref does not resolve to a commit: ${explicitBase}`);
    return explicitBase;
  }
  for (const variable of environmentVariables) {
    const candidate = process.env[variable];
    if (candidate && resolves(repoRoot, candidate)) return candidate;
  }
  return fallback && resolves(repoRoot, fallback) ? fallback : undefined;
}

/** A Git environment for test fixtures: no user or system config, a fixed identity. */
export function fixtureGitEnvironment(environment = process.env) {
  const inherited = Object.entries(environment).filter(([variable]) => !variable.startsWith('GIT_'));
  return {
    ...Object.fromEntries(inherited),
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  };
}
