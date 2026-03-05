#!/usr/bin/env node
const { spawn } = require('child_process');

const test = spawn('npm', ['run', 'test:run', '--', 'src/stores/timeTrackingStore.taskSelection.properties.test.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

test.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});
