/**
 * Injects the AtlasWanders automatic tunnel hook into node_modules/prisma/build/index.js
 * so that any direct execution (e.g., `npx prisma migrate status`, raw CLI, or AI coding agents)
 * automatically checks and establishes the dev database tunnel without manual intervention.
 */

const fs = require('fs');
const path = require('path');

const prismaIndexPath = path.resolve(__dirname, '../node_modules/prisma/build/index.js');

const HOOK_MARKER = '/* [AtlasWanders Auto-Tunnel Hook] */';
const HOOK_CODE = `${HOOK_MARKER}
try {
  const _tunnelPath = require('path').resolve(__dirname, '../../../scripts/dev-tunnel.cjs');
  if (require('fs').existsSync(_tunnelPath)) {
    require(_tunnelPath).ensureTunnelSync();
  }
} catch (_e) {}
`;

function installHook() {
  if (!fs.existsSync(prismaIndexPath)) {
    console.log('[Setup-Prisma-Hook] Prisma build index not found. Skipping hook injection.');
    return;
  }

  const content = fs.readFileSync(prismaIndexPath, 'utf8');
  if (content.includes(HOOK_MARKER)) {
    console.log('[Setup-Prisma-Hook] Hook is already installed in Prisma CLI.');
    return;
  }

  // Insert after shebang if present
  let updatedContent;
  if (content.startsWith('#!')) {
    const firstNewline = content.indexOf('\n');
    const shebang = content.slice(0, firstNewline + 1);
    const rest = content.slice(firstNewline + 1);
    updatedContent = `${shebang}${HOOK_CODE}\n${rest}`;
  } else {
    updatedContent = `${HOOK_CODE}\n${content}`;
  }

  fs.writeFileSync(prismaIndexPath, updatedContent, 'utf8');
  console.log('[Setup-Prisma-Hook] Successfully injected automatic tunnel hook into Prisma CLI.');
}

if (require.main === module) {
  installHook();
}

module.exports = { installHook };
