import { spawnSync } from 'node:child_process';

// Source ZIP downloads have no Git repository and do not need Git hooks.
const git = spawnSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
if (git.status === 0) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'exec', '--', 'lefthook', 'install'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} else {
  console.log('Skipping Git hooks: this directory is not a Git repository.');
}
