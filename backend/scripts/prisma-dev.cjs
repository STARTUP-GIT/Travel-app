#!/usr/bin/env node
/**
 * AtlasWanders Prisma Development Wrapper
 * 
 * Automatically ensures the remote development database tunnel is healthy
 * before delegating the command to the Prisma CLI.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { ensureTunnel } = require('./dev-tunnel.cjs');

async function main() {
  try {
    await ensureTunnel();
  } catch (err) {
    console.error('[Prisma-Dev] Tunnel setup failed:', err.message);
    process.exit(1);
  }

  const prismaArgs = process.argv.slice(2);
  const prismaBuildIndex = path.resolve(__dirname, '../node_modules/prisma/build/index.js');

  let child;
  if (fs.existsSync(prismaBuildIndex)) {
    child = spawn(process.execPath, [prismaBuildIndex, ...prismaArgs], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
  } else {
    // Fall back to npx
    child = spawn('npx.cmd', ['prisma', ...prismaArgs], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      shell: true,
    });
  }

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code || 0);
    }
  });
}

main();
