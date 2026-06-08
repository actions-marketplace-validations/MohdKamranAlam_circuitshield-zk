import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { scanProject } from "./scanner.js";
import { loadBaseline, saveBaseline, toBaselineSnapshot } from "./baseline.js";
import { runBenchmarks } from "./benchmark.js";
import { ensureDatabase, getDatabaseStatus, listScanHistory, saveBaselineRecord, saveBenchmarkReport, saveScanResult } from "./db.js";
import { runBaselineDriftDemo } from "./demo.js";

const workspaceRoot = process.cwd();
const port = Number(process.env.CIRCUITSHIELD_API_PORT ?? 8787);

interface RequestBody {
  target?: string;
  config?: string;
  baseline?: string;
  ref?: string;
  compileArtifacts?: boolean;
  useCircomspect?: boolean;
  persist?: boolean;
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) return sendJson(res, 404, { error: "Not found" });
    const url = new URL(req.url, `http://${req.headers.host ?? "127.0.0.1"}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      const database = await getDatabaseStatus();
      return sendJson(res, 200, {
        status: "ok",
        workspaceRoot,
        examplesPath: path.join(workspaceRoot, "examples"),
        benchmarksPath: path.join(workspaceRoot, "benchmarks"),
        database,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/scan") {
      const body = await parseBody(req);
      const root = resolveWorkspacePath(body.target || "examples");
      const baseline = await loadBaseline(root, body.baseline);
      const result = await scanProject({
        root,
        configPath: body.config,
        baseline,
        compileArtifacts: Boolean(body.compileArtifacts),
        useCircomspect: body.useCircomspect,
      });
      const shouldPersist = body.persist !== false;
      const dbId = shouldPersist ? await saveScanResult(result, body.target || "examples") : undefined;
      return sendJson(res, 200, { ...result, dbId, persisted: Boolean(dbId) });
    }

    if (req.method === "POST" && url.pathname === "/api/baseline/create") {
      const body = await parseBody(req);
      const root = resolveWorkspacePath(body.target || "examples");
      const ref = body.ref || "audited-v1.0.0";
      const result = await scanProject({
        root,
        configPath: body.config,
        compileArtifacts: Boolean(body.compileArtifacts),
        useCircomspect: body.useCircomspect,
      });
      const savedPath = await saveBaseline(root, toBaselineSnapshot(result, ref));
      const dbId = await saveBaselineRecord(result, ref, savedPath);
      return sendJson(res, 200, { savedPath, ref, dbId, result });
    }

    if (req.method === "POST" && url.pathname === "/api/benchmark") {
      const body = await parseBody(req);
      const root = resolveWorkspacePath(body.target || "benchmarks");
      const report = await runBenchmarks(root, { compileArtifacts: Boolean(body.compileArtifacts) });
      const dbId = await saveBenchmarkReport(report);
      return sendJson(res, 200, { ...report, dbId });
    }

    if (req.method === "POST" && url.pathname === "/api/demo/baseline-drift") {
      const body = await parseBody(req);
      const root = resolveWorkspacePath(body.target || "demos/baseline-drift");
      const report = await runBaselineDriftDemo(root);
      return sendJson(res, 200, report);
    }

    if (req.method === "GET" && url.pathname === "/api/history") {
      const limit = Number(url.searchParams.get("limit") ?? 30);
      const rows = await listScanHistory(limit);
      return sendJson(res, 200, { rows });
    }

    if (req.method === "POST" && url.pathname === "/api/db/migrate") {
      await ensureDatabase();
      const database = await getDatabaseStatus();
      return sendJson(res, 200, { database });
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/file")) {
      const file = url.searchParams.get("path");
      if (!file) return sendJson(res, 400, { error: "Missing path" });
      const absolute = resolveWorkspacePath(file);
      const content = await fs.readFile(absolute, "utf8");
      return sendJson(res, 200, { path: absolute, content });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return sendJson(res, 500, { error: message });
  }
});

await startServer();

async function startServer(): Promise<void> {
  await ensureDatabase();
  server.listen(port, "127.0.0.1", () => {
    console.log(`CircuitShield API listening on http://127.0.0.1:${port}`);
  });
}

async function parseBody(req: http.IncomingMessage): Promise<RequestBody> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw) as RequestBody;
}

function resolveWorkspacePath(inputPath: string): string {
  const resolved = path.isAbsolute(inputPath) ? path.resolve(inputPath) : path.resolve(workspaceRoot, inputPath);
  const relative = path.relative(workspaceRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path is outside workspace: ${inputPath}`);
  }
  return resolved;
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}
