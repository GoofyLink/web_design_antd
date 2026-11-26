import { spawnSync } from 'node:child_process';

const npmCommand =
  process.env.npm_execpath && /\.[cm]?js$/.test(process.env.npm_execpath)
    ? [process.execPath, process.env.npm_execpath]
    : [process.platform === 'win32' ? 'npm.cmd' : 'npm'];

const steps = [
  ['exec', '--', 'tsdown', '--no-dts'],
  [
    'exec',
    '--',
    'tsc',
    '-p',
    'tsconfig.build.json',
    '--emitDeclarationOnly',
    '--declaration',
    '--outDir',
    'dist',
  ],
];

for (const args of steps) {
  const [command, ...commandArgs] = npmCommand;
  const result = spawnSync(command, [...commandArgs, ...args], {
    shell: !process.env.npm_execpath && process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
