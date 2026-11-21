/**
 * AtlasWanders Remote Development Database Tunnel Manager
 * 
 * Automatically manages the secure SSH tunnel from Windows localhost:15433
 * to the isolated development database (atlaswanders_dev) on the AtlasWanders VM.
 * 
 * Target: atlaswanders-postgres18 (127.0.0.1:5432) on VM (192.168.122.225)
 * Hop 1: Windows (127.0.0.1:15433) -> Physical Host (127.0.0.1:25433)
 * Hop 2: Physical Host -> VM (127.0.0.1:5432) via ~/.ssh/atlasbasket_vm
 */

const net = require('net');
const { execSync, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  localHost: '127.0.0.1',
  localPort: 15433,
  intermediatePort: 25433,
  vmContainerIp: '127.0.0.1',
  vmPostgresPort: 5432,
  physicalHost: 'atlasbasket-host',
  vmHost: 'sathwik-atlaswanders@192.168.122.225',
  vmKey: '/home/sathwik/.ssh/atlasbasket_vm',
  probeTimeoutMs: 2000,
  connectWaitTimeoutMs: 25000,
};

/**
 * Probes the local port using the PostgreSQL SSLRequest handshake packet.
 * Returns true if remote PostgreSQL server sends 'S' (0x53) or 'N' (0x4E).
 */
function probePostgres(port = CONFIG.localPort, host = CONFIG.localHost, timeoutMs = CONFIG.probeTimeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const cleanup = (result) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      // 8-byte PostgreSQL SSLRequest packet: length (8), code (80877103)
      const buf = Buffer.alloc(8);
      buf.writeInt32BE(8, 0);
      buf.writeInt32BE(80877103, 4);
      socket.write(buf);
    });

    socket.on('data', (data) => {
      if (data && data.length > 0 && (data[0] === 0x53 || data[0] === 0x4E)) {
        cleanup(true);
      } else {
        cleanup(false);
      }
    });

    socket.on('timeout', () => cleanup(false));
    socket.on('error', () => cleanup(false));
    socket.on('close', () => cleanup(false));

    socket.connect(port, host);
  });
}

/**
 * Finds all process IDs listening on the local port on Windows.
 */
function findPidsOnPort(port = CONFIG.localPort) {
  try {
    const output = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const pids = new Set();
    const lines = output.split(/\r?\n/);
    const target = `:${port}`;

    for (const line of lines) {
      if (line.includes(target) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    }
    return Array.from(pids);
  } catch (_) {
    return [];
  }
}

/**
 * Kills any stale or hung processes listening on the local port.
 */
function killStaleTunnel(port = CONFIG.localPort) {
  const pids = findPidsOnPort(port);
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      console.log(`[Tunnel] Terminated process PID ${pid} listening on port ${port}.`);
    } catch (_) {}
  }
}

/**
 * Ensures the intermediate hop (physical host -> VM postgres) is running.
 */
function ensureRemoteHop() {
  try {
    const remoteCheckCmd = `pgrep -f "${CONFIG.intermediatePort}:${CONFIG.vmContainerIp}:${CONFIG.vmPostgresPort}" >/dev/null || nohup ssh -i ${CONFIG.vmKey} -o BatchMode=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -N -L ${CONFIG.intermediatePort}:${CONFIG.vmContainerIp}:${CONFIG.vmPostgresPort} ${CONFIG.vmHost} </dev/null >/dev/null 2>&1 & disown`;
    execFileSync('ssh', ['-n', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', CONFIG.physicalHost, remoteCheckCmd], {
      stdio: 'ignore',
      timeout: 10000,
    });
  } catch (_) {
    // Non-fatal; outer ssh will attempt or retry
  }
}

/**
 * Spawns the local Windows SSH tunnel daemon using WMI so it runs
 * independently of the parent Node/PowerShell process group.
 */
function spawnLocalTunnel() {
  const sshCmd = `ssh.exe -N -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -L ${CONFIG.localHost}:${CONFIG.localPort}:${CONFIG.localHost}:${CONFIG.intermediatePort} ${CONFIG.physicalHost}`;
  const psScript = `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${sshCmd}' } | Out-Null`;

  execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psScript}"`, {
    stdio: 'ignore',
    timeout: 10000,
  });
}

/**
 * Main function: Ensures a healthy SSH tunnel is active.
 * Reuses existing tunnel if healthy.
 * Recovers and restarts if missing or stale.
 */
async function ensureTunnel(silent = false) {
  // Step 1: Probe existing tunnel
  const initialProbe = await probePostgres();
  if (initialProbe) {
    if (!silent) {
      console.log(`[Tunnel] Healthy development database tunnel active on ${CONFIG.localHost}:${CONFIG.localPort}.`);
    }
    return true;
  }

  if (!silent) {
    console.log(`[Tunnel] No active tunnel found on ${CONFIG.localHost}:${CONFIG.localPort}. Initializing connection...`);
  }

  // Step 2: Clean up any stale or hung listener on port 15433
  killStaleTunnel(CONFIG.localPort);

  // Step 3: Ensure remote hop on physical host is running
  ensureRemoteHop();

  // Step 4: Spawn the local SSH tunnel daemon
  spawnLocalTunnel();

  // Step 5: Wait until PostgreSQL is confirmed reachable
  const startTime = Date.now();
  let connected = false;

  while (Date.now() - startTime < CONFIG.connectWaitTimeoutMs) {
    await new Promise((r) => setTimeout(r, 400));
    if (await probePostgres()) {
      connected = true;
      break;
    }
  }

  if (connected) {
    if (!silent) {
      console.log(`[Tunnel] Successfully connected to atlaswanders_dev via ${CONFIG.localHost}:${CONFIG.localPort} (${Date.now() - startTime}ms).`);
    }
    return true;
  } else {
    throw new Error(`[Tunnel] Failed to establish connection to PostgreSQL on ${CONFIG.localHost}:${CONFIG.localPort} within ${CONFIG.connectWaitTimeoutMs}ms.`);
  }
}

/**
 * Synchronous version for hook invocation in Prisma CLI.
 */
function ensureTunnelSync() {
  try {
    execFileSync(process.execPath, [__filename, '--ensure'], {
      stdio: 'inherit',
      timeout: CONFIG.connectWaitTimeoutMs + 5000,
    });
    return true;
  } catch (err) {
    console.error('[Tunnel] Automatic tunnel initialization failed:', err.message);
    throw err;
  }
}

// CLI Execution Support
if (require.main === module) {
  const arg = process.argv[2];

  if (arg === '--check') {
    probePostgres().then((healthy) => {
      if (healthy) {
        console.log(`[Tunnel] ACTIVE: PostgreSQL is responding on ${CONFIG.localHost}:${CONFIG.localPort}.`);
        process.exit(0);
      } else {
        console.log(`[Tunnel] INACTIVE: No responding PostgreSQL database on ${CONFIG.localHost}:${CONFIG.localPort}.`);
        process.exit(1);
      }
    });
  } else if (arg === '--stop') {
    console.log(`[Tunnel] Stopping tunnel on port ${CONFIG.localPort}...`);
    killStaleTunnel(CONFIG.localPort);
    console.log(`[Tunnel] Stopped.`);
    process.exit(0);
  } else if (arg === '--ensure') {
    ensureTunnel(true)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  } else {
    ensureTunnel(false)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  }
}

module.exports = {
  probePostgres,
  killStaleTunnel,
  ensureTunnel,
  ensureTunnelSync,
  CONFIG,
};
