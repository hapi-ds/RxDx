#!/usr/bin/env node
import { spawn } from 'child_process';

const test = spawn('npm', ['run', 'test:run', '--', 'src/stores/timeTrackingStore.taskSelection.properties.test.ts'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

test.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});
