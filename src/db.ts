import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import type { BenchmarkReport, ScanResult } from "./types.js";

const { Pool } = pg;

interface DatabaseState {
  enabled: boolean;
  pool?: pg.Pool;
  initialized: boolean;
}

export interface ScanHistoryRow {
  id: string;
  projectName: string;
  target: string;
  baselineRef?: string;
  auditGate: string;
  securityPostureRisk: number;
  protocolDriftIndex: number | null;
  findingsCount: number;
  highFindingsCount: number;
  suppressedCount: number;
  createdAt: string;
}

const state: DatabaseState = {
  enabled: shouldEnableDatabase(),
  initialized: false,
};

export function databaseEnabled(): boolean {
  return state.enabled;
}

export async function ensureDatabase(): Promise<void> {
  if (!state.enabled) return;
  const pool = getPool();
  await pool.query(`
    create table if not exists cs_projects (
      id text primary key,
      name text not null unique,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists cs_scans (
      id text primary key,
      project_id text references cs_projects(id) on delete cascade,
      project_name text not null,
      target text not null,
      baseline_ref text,
      audit_gate text not null,
      security_posture_risk integer not null,
      protocol_drift_index integer not null,
      findings_count integer not null,
      high_findings_count integer not null,
      suppressed_count integer not null,
      result_json jsonb not null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists cs_baselines (
      id text primary key,
      project_id text references cs_projects(id) on delete cascade,
      project_name text not null,
      ref text not null,
      saved_path text,
      result_json jsonb not null,
      created_at timestamptz not null default now(),
      unique(project_id, ref)
    );
  `);
  await pool.query(`
    create table if not exists cs_benchmarks (
      id text primary key,
      total integer not null,
      passed integer not null,
      failed integer not null,
      report_json jsonb not null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`create index if not exists cs_scans_project_created_idx on cs_scans(project_id, created_at desc);`);
  await pool.query(`create index if not exists cs_scans_gate_idx on cs_scans(audit_gate);`);
  state.initialized = true;
}

export async function getDatabaseStatus(): Promise<{ enabled: boolean; connected: boolean; initialized: boolean; engine: string }> {
  if (!state.enabled) {
    return { enabled: false, connected: false, initialized: false, engine: process.env.DB_ENGINE || "none" };
  }
  try {
    await ensureDatabase();
    await getPool().query("select 1");
    return { enabled: true, connected: true, initialized: state.initialized, engine: "postgresql" };
  } catch {
    return { enabled: true, connected: false, initialized: state.initialized, engine: "postgresql" };
  }
}

export async function saveScanResult(result: ScanResult, target: string): Promise<string | undefined> {
  if (!state.enabled) return undefined;
  await ensureDatabase();
  const projectId = await upsertProject(result.projectName);
  const id = randomUUID();
  const highFindings = result.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
  await getPool().query(
    `
      insert into cs_scans (
        id, project_id, project_name, target, baseline_ref, audit_gate, security_posture_risk,
        protocol_drift_index, findings_count, high_findings_count, suppressed_count, result_json
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
    `,
    [
      id,
      projectId,
      result.projectName,
      target,
      result.baselineRef ?? null,
      result.auditGate.state,
      result.metrics.securityPostureRisk,
      result.metrics.protocolDriftIndex ?? -1,
      result.findings.length,
      highFindings,
      result.suppressedFindings.length,
      JSON.stringify(result),
    ]
  );
  return id;
}

export async function saveBaselineRecord(result: ScanResult, ref: string, savedPath: string): Promise<string | undefined> {
  if (!state.enabled) return undefined;
  await ensureDatabase();
  const projectId = await upsertProject(result.projectName);
  const id = randomUUID();
  await getPool().query(
    `
      insert into cs_baselines (id, project_id, project_name, ref, saved_path, result_json)
      values ($1,$2,$3,$4,$5,$6::jsonb)
      on conflict (project_id, ref)
      do update set saved_path = excluded.saved_path, result_json = excluded.result_json, created_at = now()
    `,
    [id, projectId, result.projectName, ref, savedPath, JSON.stringify(result)]
  );
  return id;
}

export async function saveBenchmarkReport(report: BenchmarkReport): Promise<string | undefined> {
  if (!state.enabled) return undefined;
  await ensureDatabase();
  const id = randomUUID();
  await getPool().query(
    `
      insert into cs_benchmarks (id, total, passed, failed, report_json)
      values ($1,$2,$3,$4,$5::jsonb)
    `,
    [id, report.summary.total, report.summary.passed, report.summary.failed, JSON.stringify(report)]
  );
  return id;
}

export async function listScanHistory(limit = 30): Promise<ScanHistoryRow[]> {
  if (!state.enabled) return [];
  await ensureDatabase();
  const result = await getPool().query(
    `
      select id, project_name, target, baseline_ref, audit_gate, security_posture_risk,
             protocol_drift_index, findings_count, high_findings_count, suppressed_count,
             created_at
      from cs_scans
      order by created_at desc
      limit $1
    `,
    [Math.max(1, Math.min(100, limit))]
  );
  return result.rows.map((row) => ({
    id: row.id,
    projectName: row.project_name,
    target: row.target,
    baselineRef: row.baseline_ref ?? undefined,
    auditGate: row.audit_gate,
    securityPostureRisk: Number(row.security_posture_risk),
    protocolDriftIndex: Number(row.protocol_drift_index) < 0 ? null : Number(row.protocol_drift_index),
    findingsCount: Number(row.findings_count),
    highFindingsCount: Number(row.high_findings_count),
    suppressedCount: Number(row.suppressed_count),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }));
}

export async function closeDatabase(): Promise<void> {
  await state.pool?.end();
}

async function upsertProject(name: string): Promise<string> {
  const pool = getPool();
  const existing = await pool.query("select id from cs_projects where name = $1", [name]);
  if (existing.rows[0]?.id) return String(existing.rows[0].id);
  const id = randomUUID();
  await pool.query(
    `
      insert into cs_projects (id, name)
      values ($1, $2)
      on conflict (name) do update set updated_at = now()
      returning id
    `,
    [id, name]
  );
  const saved = await pool.query("select id from cs_projects where name = $1", [name]);
  return String(saved.rows[0].id);
}

function getPool(): pg.Pool {
  if (!state.pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required when DB_ENGINE=postgresql.");
    state.pool = new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX ?? 5),
      ssl: shouldUseSsl(connectionString),
    });
  }
  return state.pool;
}

function shouldEnableDatabase(): boolean {
  return process.env.DB_ENGINE === "postgresql" || Boolean(process.env.DATABASE_URL);
}

function shouldUseSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  if (connectionString.includes("sslmode=disable")) return false;
  if (connectionString.includes("sslmode=require") || connectionString.includes("neon.tech")) {
    return { rejectUnauthorized: false };
  }
  return false;
}
