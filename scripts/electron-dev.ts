/**
 * Cross-platform electron dev script
 * Replaces platform-specific npm scripts with a unified TypeScript solution
 */

import { spawn, type Subprocess } from "bun";
import { existsSync, rmSync, cpSync, readFileSync, statSync, mkdirSync } from "fs";
import { join, basename } from "path";
import * as esbuild from "esbuild";

const ROOT_DIR = join(import.meta.dir, "..");
const ELECTRON_DIR = join(ROOT_DIR, "apps/electron");
const DIST_DIR = join(ELECTRON_DIR, "dist");

// MCP server paths (for Codex sessions)
const SESSION_SERVER_DIR = join(ROOT_DIR, "packages/session-mcp-server");
const SESSION_SERVER_OUTPUT = join(SESSION_SERVER_DIR, "dist/index.js");
const BRIDGE_SERVER_DIR = join(ROOT_DIR, "packages/bridge-mcp-server");
const BRIDGE_SERVER_OUTPUT = join(BRIDGE_SERVER_DIR, "dist/index.js");

// Platform-specific binary paths (bun creates .exe on Windows, no extension on Unix)
const IS_WINDOWS = process.platform === "win32";
const BIN_EXT = IS_WINDOWS ? ".exe" : "";
const VITE_BIN = join(ROOT_DIR, `node_modules/.bin/vite${BIN_EXT}`);
const ELECTRON_BIN = join(ROOT_DIR, `node_modules/.bin/electron${BIN_EXT}`);

// Multi-instance detection (matches detect-instance.sh logic)
// Detects instance number from folder name suffix (e.g., craft-agents-1 → instance 1)
function detectInstance(): void {
  // Don't override if already set (e.g., by sourcing detect-instance.sh first)
  if (process.env.CRAFT_VITE_PORT) return;

  const folderName = basename(ROOT_DIR);
  const match = folderName.match(/-(\d+)$/);

  if (match) {
    const instanceNum = match[1];
    process.env.CRAFT_INSTANCE_NUMBER = instanceNum;
    process.env.CRAFT_VITE_PORT = `${instanceNum}173`;
    process.env.CRAFT_APP_NAME = `Craft Agents [${instanceNum}]`;
    process.env.IWEATHER_CONFIG_DIR = join(process.env.HOME || "", `.iweather-${instanceNum}`);
    process.env.CRAFT_DEEPLINK_SCHEME = `craftagents${instanceNum}`;
    console.log(`🔢 Instance ${instanceNum} detected: port=${process.env.CRAFT_VITE_PORT}, config=${process.env.IWEATHER_CONFIG_DIR}`);
  }
}

// Load .env file if it exists
function loadEnvFile(): void {
  const envPath = join(ROOT_DIR, ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          let value = trimmed.slice(eqIndex + 1).trim();
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    }
    console.log("📄 Loaded .env file");
  }
}

// Kill any process using the specified port
async function killProcessOnPort(port: string): Promise<void> {
  const isWindows = process.platform === "win32";

  try {
    if (isWindows) {
      // Windows: use netstat to find PID, then taskkill
      const netstat = spawn({
        cmd: ["cmd", "/c", `netstat -ano | findstr :${port}`],
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(netstat.stdout).text();
      await netstat.exited;

      // Parse PIDs from netstat output (last column)
      const pids = new Set<string>();
      for (const line of output.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid) && pid !== "0") {
            pids.add(pid);
          }
        }
      }

      // Kill each PID
      for (const pid of pids) {
        const kill = spawn({
          cmd: ["taskkill", "/PID", pid, "/F"],
          stdout: "pipe",
          stderr: "pipe",
        });
        await kill.exited;
      }

      if (pids.size > 0) {
        console.log(`🔪 Killed ${pids.size} process(es) on port ${port}`);
      }
    } else {
      // Mac/Linux: use lsof and kill
      const lsof = spawn({
        cmd: ["sh", "-c", `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`],
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(lsof.stdout).text();
      await lsof.exited;

      if (output.trim()) {
        console.log(`🔪 Killed process(es) on port ${port}`);
      }
    }
  } catch {
    // Ignore errors - port may not be in use
  }
}

// Clean Vite cache directory
function cleanViteCache(): void {
  const viteCacheDir = join(ELECTRON_DIR, "node_modules/.vite");
  if (existsSync(viteCacheDir)) {
    rmSync(viteCacheDir, { recursive: true, force: true });
    console.log("🧹 Cleaned Vite cache");
  }
}

// Copy resources to dist
function copyResources(): void {
  const srcDir = join(ELECTRON_DIR, "resources");
  const destDir = join(ELECTRON_DIR, "dist/resources");
  if (existsSync(srcDir)) {
    cpSync(srcDir, destDir, { recursive: true, force: true });
    console.log("📦 Copied resources to dist");
  }
}

// Build MCP servers for Codex sessions (one-time, no watch needed)
async function buildMcpServers(): Promise<void> {
  console.log("🌉 Building MCP servers for Codex sessions...");

  // Ensure dist directories exist
  const sessionDistDir = join(SESSION_SERVER_DIR, "dist");
  const bridgeDistDir = join(BRIDGE_SERVER_DIR, "dist");
  if (!existsSync(sessionDistDir)) mkdirSync(sessionDistDir, { recursive: true });
  if (!existsSync(bridgeDistDir)) mkdirSync(bridgeDistDir, { recursive: true });

  // Build both servers in parallel
  const [sessionResult, bridgeResult] = await Promise.all([
    runEsbuild(
      "packages/session-mcp-server/src/index.ts",
      "packages/session-mcp-server/dist/index.js",
      {},
      { packagesExternal: true }
    ),
    runEsbuild(
      "packages/bridge-mcp-server/src/index.ts",
      "packages/bridge-mcp-server/dist/index.js",
      {},
      { packagesExternal: true }
    ),
  ]);

  if (!sessionResult.success) {
    console.error("❌ Session MCP server build failed:", sessionResult.error);
    process.exit(1);
  }
  console.log("✅ Session MCP server built");

  if (!bridgeResult.success) {
    console.error("❌ Bridge MCP server build failed:", bridgeResult.error);
    process.exit(1);
  }
  console.log("✅ Bridge MCP server built");
}

// Get OAuth defines for esbuild API
function getOAuthDefines(): Record<string, string> {
  const oauthVars = [
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "SLACK_OAUTH_CLIENT_ID",
    "SLACK_OAUTH_CLIENT_SECRET",
    "MICROSOFT_OAUTH_CLIENT_ID",
    "MICROSOFT_OAUTH_CLIENT_SECRET",
  ];

  const defines: Record<string, string> = {};
  for (const varName of oauthVars) {
    const value = process.env[varName] || "";
    defines[`process.env.${varName}`] = JSON.stringify(value);
  }
  return defines;
}

// Get environment variables for electron process
function getElectronEnv(): Record<string, string> {
  const vitePort = process.env.CRAFT_VITE_PORT || "5173";

  // Codex binary path is resolved at runtime by the binary-resolver module.
  // It checks: CODEX_PATH env var > bundled binary > local dev fork > system PATH.
  // You can override with CODEX_PATH env var if needed for debugging.

  // Build env from process.env, excluding CLAUDECODE to allow nested sessions
  // (needed when developing Craft Agents inside Claude Code)
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key !== 'CLAUDECODE' && value !== undefined) {
      env[key] = value;
    }
  }

  return {
    ...env,
    VITE_DEV_SERVER_URL: `http://localhost:${vitePort}`,
    IWEATHER_CONFIG_DIR: process.env.IWEATHER_CONFIG_DIR || "",
    CRAFT_APP_NAME: process.env.CRAFT_APP_NAME || "Craft Agents",
    CRAFT_DEEPLINK_SCHEME: process.env.CRAFT_DEEPLINK_SCHEME || "craftagents",
    CRAFT_INSTANCE_NUMBER: process.env.CRAFT_INSTANCE_NUMBER || "",
  };
}

// Run a one-shot esbuild using the JavaScript API
async function runEsbuild(
  entryPoint: string,
  outfile: string,
  defines: Record<string, string> = {},
  options: { packagesExternal?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    await esbuild.build({
      entryPoints: [join(ROOT_DIR, entryPoint)],
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: join(ROOT_DIR, outfile),
      external: ["electron"],
      ...(options.packagesExternal ? { packages: "external" as const } : {}),
      define: defines,
      logLevel: "warning",
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Verify a JavaScript file exists and has content.
// Note: We don't use `node --check` because it evaluates module-level code,
// which fails for Electron-specific packages like @sentry/electron that
// require Electron's runtime. esbuild's successful build already guarantees
// valid JavaScript syntax.
async function verifyJsFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
  if (!existsSync(filePath)) {
    return { valid: false, error: "File does not exist" };
  }

  // Check file has content
  const stats = statSync(filePath);
  if (stats.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  return { valid: true };
}

// Wait for file to stabilize (no size changes)
async function waitForFileStable(filePath: string, timeoutMs = 10000): Promise<boolean> {
  const startTime = Date.now();
  let lastSize = -1;
  let stableCount = 0;

  while (Date.now() - startTime < timeoutMs) {
    if (!existsSync(filePath)) {
      await Bun.sleep(100);
      continue;
    }

    const stats = statSync(filePath);
    if (stats.size === lastSize) {
      stableCount++;
      // File size unchanged for 3 checks (300ms) - consider it stable
      if (stableCount >= 3) {
        return true;
      }
    } else {
      stableCount = 0;
      lastSize = stats.size;
    }

    await Bun.sleep(100);
  }

  return false;
}

async function main(): Promise<void> {
  console.log("🚀 Starting Electron dev environment...\n");

  // Setup
  detectInstance();
  loadEnvFile();
  cleanViteCache();

  // Ensure dist directory exists
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }

  copyResources();

  // Build MCP servers for Codex sessions
  await buildMcpServers();

  const vitePort = process.env.CRAFT_VITE_PORT || "5173";
  const oauthDefines = getOAuthDefines();

  // Kill any existing process on the Vite port
  await killProcessOnPort(vitePort);

  // =========================================================
  // PHASE 1: Initial build (one-shot, wait for completion)
  // =========================================================
  console.log("🔨 Building main process...");

  const mainCjsPath = join(DIST_DIR, "main.cjs");
  const preloadCjsPath = join(DIST_DIR, "preload.cjs");

  // Remove old build files to ensure fresh build
  if (existsSync(mainCjsPath)) rmSync(mainCjsPath);
  if (existsSync(preloadCjsPath)) rmSync(preloadCjsPath);

  // Build main and preload in parallel
  const [mainResult, preloadResult] = await Promise.all([
    runEsbuild(
      "apps/electron/src/main/index.ts",
      "apps/electron/dist/main.cjs",
      oauthDefines
    ),
    runEsbuild(
      "apps/electron/src/preload/index.ts",
      "apps/electron/dist/preload.cjs"
    ),
  ]);

  if (!mainResult.success) {
    console.error("❌ Main process build failed:", mainResult.error);
    process.exit(1);
  }

  if (!preloadResult.success) {
    console.error("❌ Preload build failed:", preloadResult.error);
    process.exit(1);
  }

  // Patch import_meta.resolve in main.cjs
  console.log("🔧 Patching import.meta.resolve polyfill...");
  const mainCjsContent = readFileSync(mainCjsPath, "utf-8");
  // Match both patterns: "var import_meta4 = {};" and "import_meta4 = {};"
  const importMetaPattern = /(var\s+)?(import_meta\d+)\s*=\s*\{\};/g;
  const importMetaVars: string[] = [];
  let match;
  while ((match = importMetaPattern.exec(mainCjsContent)) !== null) {
    if (!importMetaVars.includes(match[2])) {
      importMetaVars.push(match[2]);
    }
  }

  if (importMetaVars.length > 0) {
    const polyfill = `
// Polyfill for import.meta.resolve - esbuild transforms it incorrectly for CJS
const __path = require('path');
const __url = require('url');
function __importMetaResolve(specifier) {
  try {
    const resolved = require.resolve(specifier);
    return __url.pathToFileURL(resolved).href;
  } catch (e) {
    if (specifier === '@github/copilot/sdk') {
      const sdkPath = require.resolve('@github/copilot-sdk');
      const indexPath = __path.join(__path.dirname(__path.dirname(sdkPath)), 'sdk', 'index.js');
      return __url.pathToFileURL(indexPath).href;
    }
    throw e;
  }
}
`;
    let patchedContent = polyfill + mainCjsContent;
    for (const varName of importMetaVars) {
      // Replace both patterns
      patchedContent = patchedContent.replace(
        new RegExp(`(var\\s+)?${varName}\\s*=\\s*\\{\\};`, 'g'),
        `$1${varName} = { resolve: __importMetaResolve };`
      );
    }
    const { writeFileSync } = await import("fs");
    writeFileSync(mainCjsPath, patchedContent);
    console.log(`✅ Patched ${importMetaVars.length} import_meta variable(s)`);
  }

  // Wait for files to stabilize (filesystem flush)
  console.log("⏳ Waiting for build files to stabilize...");
  const [mainStable, preloadStable] = await Promise.all([
    waitForFileStable(mainCjsPath),
    waitForFileStable(preloadCjsPath),
  ]);

  if (!mainStable || !preloadStable) {
    console.error("❌ Build files did not stabilize");
    process.exit(1);
  }

  // Verify the built files are valid JavaScript
  console.log("🔍 Verifying build output...");
  const [mainValid, preloadValid] = await Promise.all([
    verifyJsFile(mainCjsPath),
    verifyJsFile(preloadCjsPath),
  ]);

  if (!mainValid.valid) {
    console.error("❌ main.cjs is invalid:", mainValid.error);
    process.exit(1);
  }

  if (!preloadValid.valid) {
    console.error("❌ preload.cjs is invalid:", preloadValid.error);
    process.exit(1);
  }

  console.log("✅ Initial build complete and verified\n");

  // =========================================================
  // PHASE 2: Start dev servers with watch mode
  // =========================================================
  console.log("📡 Starting dev servers...\n");

  const processes: Subprocess[] = [];
  const esbuildContexts: esbuild.BuildContext[] = [];

  // 1. Vite dev server (strictPort ensures we don't silently switch ports)
  const viteProc = spawn({
    cmd: [VITE_BIN, "dev", "--config", "apps/electron/vite.config.ts", "--port", vitePort, "--strictPort"],
    cwd: ROOT_DIR,
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    env: process.env as Record<string, string>,
  });
  processes.push(viteProc);

  // 2. Main process watcher (using esbuild watch API)
  // Plugin to patch import.meta.resolve for @github/copilot-sdk
  const importMetaResolvePlugin: esbuild.Plugin = {
    name: 'import-meta-resolve-polyfill',
    setup(build) {
      build.onEnd(async (result) => {
        if (result.errors.length > 0) return;

        const outfile = join(ROOT_DIR, "apps/electron/dist/main.cjs");
        if (!existsSync(outfile)) return;

        let content = readFileSync(outfile, "utf-8");

        // Check if patching is needed - match both "var import_meta4 = {};" and "import_meta4 = {};"
        const importMetaPattern = /(var\s+)?(import_meta\d+)\s*=\s*\{\};/g;
        const importMetaVars: string[] = [];
        let match;
        while ((match = importMetaPattern.exec(content)) !== null) {
          if (!importMetaVars.includes(match[2])) {
            importMetaVars.push(match[2]);
          }
        }

        if (importMetaVars.length === 0) return;

        // Add polyfill at the top
        const polyfill = `
// Polyfill for import.meta.resolve - esbuild transforms it incorrectly for CJS
const __path = require('path');
const __url = require('url');
function __importMetaResolve(specifier) {
  try {
    const resolved = require.resolve(specifier);
    return __url.pathToFileURL(resolved).href;
  } catch (e) {
    if (specifier === '@github/copilot/sdk') {
      const sdkPath = require.resolve('@github/copilot-sdk');
      const indexPath = __path.join(__path.dirname(__path.dirname(sdkPath)), 'sdk', 'index.js');
      return __url.pathToFileURL(indexPath).href;
    }
    throw e;
  }
}
`;
        content = polyfill + content;

        // Add resolve method to each import_meta variable
        for (const varName of importMetaVars) {
          content = content.replace(
            new RegExp(`(var\\s+)?${varName}\\s*=\\s*\\{\\};`, 'g'),
            `$1${varName} = { resolve: __importMetaResolve };`
          );
        }

        const { writeFileSync } = await import("fs");
        writeFileSync(outfile, content);
        console.log(`🔧 Patched ${importMetaVars.length} import_meta variable(s)`);
      });
    }
  };

  const mainContext = await esbuild.context({
    entryPoints: [join(ROOT_DIR, "apps/electron/src/main/index.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: join(ROOT_DIR, "apps/electron/dist/main.cjs"),
    external: ["electron"],
    define: oauthDefines,
    logLevel: "info",
    plugins: [importMetaResolvePlugin],
  });
  await mainContext.watch();
  esbuildContexts.push(mainContext);
  console.log("👀 Watching main process...");

  // 3. Preload watcher (using esbuild watch API)
  const preloadContext = await esbuild.context({
    entryPoints: [join(ROOT_DIR, "apps/electron/src/preload/index.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: join(ROOT_DIR, "apps/electron/dist/preload.cjs"),
    external: ["electron"],
    logLevel: "info",
  });
  await preloadContext.watch();
  esbuildContexts.push(preloadContext);
  console.log("👀 Watching preload...");

  // 4. Start Electron (build already verified)
  console.log("🚀 Starting Electron...\n");

  const electronProc = spawn({
    cmd: [ELECTRON_BIN, "apps/electron"],
    cwd: ROOT_DIR,
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    env: getElectronEnv(),
  });
  processes.push(electronProc);

  // Handle cleanup on exit
  const cleanup = async () => {
    console.log("\n🛑 Shutting down...");
    // Dispose esbuild contexts
    for (const ctx of esbuildContexts) {
      try {
        await ctx.dispose();
      } catch {
        // Context may already be disposed
      }
    }
    // Kill subprocesses
    for (const proc of processes) {
      try {
        proc.kill();
      } catch {
        // Process may already be dead
      }
    }
    process.exit(0);
  };

  process.on("SIGINT", () => cleanup());
  process.on("SIGTERM", () => cleanup());

  // Windows doesn't have SIGINT/SIGTERM in the same way
  if (process.platform === "win32") {
    process.on("SIGHUP", () => cleanup());
  }

  // Wait for electron to exit (main process)
  await electronProc.exited;
  await cleanup();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
