import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const python = process.platform === 'win32'
  ? path.join(projectDirectory, '.venv-imagegen', 'Scripts', 'python.exe')
  : path.join(projectDirectory, '.venv-imagegen', 'bin', 'python');
const generator = path.join(projectDirectory, 'scripts', 'generate-instruments.py');
const child = spawn(python, [generator, ...process.argv.slice(2)], {
  cwd: projectDirectory,
  env: process.env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Could not start the local image generator: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) console.error(`Image generation stopped by ${signal}.`);
  process.exitCode = code ?? 1;
});