import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BarChart3,
  Blocks,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Code2,
  Database,
  Download,
  FileJson,
  Gauge,
  GitCompare,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  History,
  Terminal,
  XCircle,
  Workflow,
} from "lucide-react";
import "./styles.css";

const DEFAULT_FORM = {
  target: "examples",
  config: "examples/circuitshield.yml",
  baseline: "",
  ref: "audited-v1.0.0",
  compileArtifacts: false,
  useCircomspect: true,
};

const tabs = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "findings", label: "Findings", icon: ClipboardList },
  { id: "baseline", label: "Baseline", icon: GitCompare },
  { id: "verifier", label: "Verifier", icon: Code2 },
  { id: "history", label: "History", icon: History },
  { id: "demo", label: "Demo", icon: Workflow },
  { id: "benchmarks", label: "Benchmarks", icon: BarChart3 },
  { id: "artifacts", label: "Artifacts", icon: Database },
];

function App() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState("overview");
  const [scan, setScan] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [demo, setDemo] = useState(null);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ severity: "all", category: "all", search: "" });

  useEffect(() => {
    fetchJson("/api/health").then(setHealth).catch((error) => setMessage(error.message));
    loadHistory();
    runScan(DEFAULT_FORM, { persist: false, label: "Preview scan" });
  }, []);

  const findings = scan?.findings || [];
  const filteredFindings = useMemo(() => {
    return findings.filter((finding) => {
      const severityOk = filters.severity === "all" || finding.severity === filters.severity;
      const categoryOk = filters.category === "all" || finding.category === filters.category;
      const search = filters.search.trim().toLowerCase();
      const searchOk =
        !search ||
        [finding.title, finding.message, finding.file, finding.source, finding.id]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      return severityOk && categoryOk && searchOk;
    });
  }, [findings, filters]);

  async function runScan(nextForm = form, options = {}) {
    setBusy(true);
    setMessage(options.label || "Running scan");
    try {
      const result = await postJson("/api/scan", {
        target: nextForm.target,
        config: nextForm.config,
        baseline: nextForm.baseline || undefined,
        compileArtifacts: nextForm.compileArtifacts,
        useCircomspect: nextForm.useCircomspect,
        persist: options.persist !== false,
      });
      setScan(result);
      if (result.persisted) loadHistory();
      setMessage(`Audit Gate: ${result.auditGate.state}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function createBaseline() {
    setBusy(true);
    setMessage("Creating baseline");
    try {
      const payload = await postJson("/api/baseline/create", {
        target: form.target,
        config: form.config,
        ref: form.ref,
        compileArtifacts: form.compileArtifacts,
        useCircomspect: form.useCircomspect,
      });
      setScan(payload.result);
      setForm((current) => ({ ...current, baseline: payload.ref }));
      loadHistory();
      setMessage(`Baseline created: ${payload.ref}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runBenchmark() {
    setBusy(true);
    setMessage("Running benchmark");
    try {
      const report = await postJson("/api/benchmark", {
        target: "benchmarks",
        compileArtifacts: form.compileArtifacts,
      });
      setBenchmark(report);
      setActiveTab("benchmarks");
      setMessage(`Benchmark: ${report.summary.passed}/${report.summary.total} passed`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runDemo() {
    setBusy(true);
    setMessage("Running baseline drift demo");
    try {
      const report = await postJson("/api/demo/baseline-drift", {
        target: "demos/baseline-drift",
      });
      setDemo(report);
      setScan(report.current);
      setActiveTab("demo");
      setMessage(`Demo current gate: ${report.summary.currentGate}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory() {
    try {
      const data = await fetchJson("/api/history?limit=40");
      setHistory(data.rows || []);
    } catch {
      setHistory([]);
    }
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={22} /></div>
          <div>
            <strong>CircuitShield</strong>
            <span>ZK audit gate</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="runtime-card">
          <span>Workspace</span>
          <strong title={health?.workspaceRoot || ""}>{compactPath(health?.workspaceRoot || "D:/project/zcash/workspace")}</strong>
        </div>
        <div className="runtime-card db-card">
          <span>Database</span>
          <strong>{dbLabel(health?.database)}</strong>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">Post-audit drift monitor</span>
            <h1>{scan?.projectName || "CircuitShield"}</h1>
          </div>
          <div className="top-actions">
            <StatusPill state={scan?.auditGate?.state || "WARN"} />
            <button className="icon-button" title="Export scan JSON" onClick={() => downloadJson("circuitshield-scan.json", scan)} disabled={!scan}>
              <Download size={18} />
            </button>
          </div>
        </header>

        <section className="control-panel">
          <label>
            <span>Target</span>
            <input value={form.target} onChange={(event) => updateForm("target", event.target.value)} />
          </label>
          <label>
            <span>Config</span>
            <input value={form.config} onChange={(event) => updateForm("config", event.target.value)} />
          </label>
          <label>
            <span>Baseline</span>
            <input placeholder="optional ref" value={form.baseline} onChange={(event) => updateForm("baseline", event.target.value)} />
          </label>
          <label>
            <span>New baseline</span>
            <input value={form.ref} onChange={(event) => updateForm("ref", event.target.value)} />
          </label>
          <div className="toggle-row">
            <label className="check">
              <input type="checkbox" checked={form.compileArtifacts} onChange={(event) => updateForm("compileArtifacts", event.target.checked)} />
              <span>Compile</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={form.useCircomspect} onChange={(event) => updateForm("useCircomspect", event.target.checked)} />
              <span>Circomspect</span>
            </label>
          </div>
          <div className="button-row">
            <button className="primary" onClick={() => runScan()} disabled={busy} title="Run scan">
              {busy ? <RefreshCw className="spin" size={17} /> : <Play size={17} />}
              <span>Scan</span>
            </button>
            <button onClick={createBaseline} disabled={busy} title="Create baseline">
              <GitCompare size={17} />
              <span>Baseline</span>
            </button>
            <button onClick={runBenchmark} disabled={busy} title="Run benchmark">
              <BarChart3 size={17} />
              <span>Benchmark</span>
            </button>
            <button onClick={runDemo} disabled={busy} title="Run baseline drift demo">
              <Workflow size={17} />
              <span>Demo</span>
            </button>
          </div>
        </section>

        {message && <div className={`message ${busy ? "loading" : ""}`}>{message}</div>}

        {activeTab === "overview" && <Overview scan={scan} findings={findings} />}
        {activeTab === "findings" && <Findings findings={filteredFindings} suppressed={scan?.suppressedFindings || []} filters={filters} setFilters={setFilters} />}
        {activeTab === "baseline" && <BaselineView scan={scan} />}
        {activeTab === "verifier" && <VerifierView scan={scan} />}
        {activeTab === "history" && <HistoryView rows={history} refresh={loadHistory} database={health?.database} />}
        {activeTab === "demo" && <DemoView demo={demo} runDemo={runDemo} busy={busy} />}
        {activeTab === "benchmarks" && <BenchmarkView benchmark={benchmark} runBenchmark={runBenchmark} busy={busy} />}
        {activeTab === "artifacts" && <ArtifactsView scan={scan} />}
      </main>
    </div>
  );
}

function Overview({ scan, findings }) {
  const metrics = scan?.metrics || {};
  const high = findings.filter((finding) => ["critical", "high"].includes(finding.severity)).length;
  return (
    <div className="stack">
      <section className="summary-grid">
        <GatePanel scan={scan} />
        <MetricCard title="Protocol Drift Risk" value={metrics.protocolDriftIndex} unknown={metrics.protocolDriftStatus === "unknown"} intent="drift" icon={GitCompare} />
        <MetricCard title="Integrity Risk" value={metrics.circuitIntegrityRisk} intent="risk" icon={ShieldAlert} />
        <MetricCard title="Invariant Coverage" value={metrics.invariantCoverageScore} suffix="%" intent="coverage" icon={CheckCircle2} />
      </section>

      <section className="metrics-grid">
        <MetricCard title="Verifier Binding Risk" value={metrics.verifierBindingRisk} intent="risk" icon={Code2} compact />
        <MetricCard title="Static Finding Risk" value={metrics.staticFindingRisk} intent="risk" icon={Blocks} compact />
        <MetricCard title="Scan Confidence" value={metrics.scanConfidence} suffix="%" intent="coverage" icon={ShieldCheck} compact />
        <MetricCard title="Overall Posture Risk" value={metrics.securityPostureRisk} intent="risk" icon={Gauge} compact />
      </section>

      <section className="split">
        <Panel title="Gate reasons" icon={ShieldAlert}>
          <GateReasonGroups scan={scan} findings={findings} />
        </Panel>
        <Panel title="Finding mix" icon={BarChart3}>
          <FindingBars findings={findings} />
          <div className="inline-stats">
            <SummaryTile label="Total" value={findings.length} />
            <SummaryTile label="High+" value={high} />
            <SummaryTile label="Suppressed" value={scan?.suppressedFindings?.length || 0} />
            <SummaryTile label="Artifacts" value={Object.keys(scan?.snapshots?.artifactHashes || {}).length} />
          </div>
        </Panel>
      </section>
    </div>
  );
}

function GatePanel({ scan }) {
  const state = scan?.auditGate?.state || "WARN";
  const Icon = state === "PASS" ? CheckCircle2 : state === "BLOCK_CI" ? XCircle : AlertTriangle;
  return (
    <section className={`gate-panel ${toneForGate(state)}`}>
      <div className="gate-top">
        <Icon size={26} />
        <StatusPill state={state} />
      </div>
      <strong>{state.replaceAll("_", " ")}</strong>
      <span>{scan?.baselineRef ? `Baseline ${scan.baselineRef}` : "No baseline loaded"}</span>
    </section>
  );
}

function MetricCard({ title, value = 0, suffix = "/100", unknown = false, intent, icon: Icon, compact = false }) {
  const numeric = unknown ? 0 : Number(value || 0);
  return (
    <section className={`metric-card ${compact ? "compact" : ""}`}>
      <div className="metric-head">
        <Icon size={18} />
        <span>{title}</span>
      </div>
      <div className="metric-value">
        <strong>{unknown ? "N/A" : Math.round(numeric)}</strong>
        {!unknown && <span>{suffix}</span>}
      </div>
      <div className="bar-track">
        <div className={intent === "coverage" ? "bar-fill coverage" : "bar-fill risk"} style={{ width: `${Math.max(0, Math.min(100, numeric))}%` }} />
      </div>
    </section>
  );
}

function Findings({ findings, suppressed, filters, setFilters }) {
  const severities = ["all", "critical", "high", "medium", "low", "info"];
  const categories = ["all", "static", "invariant", "verifier", "baseline_drift", "configuration", "tooling"];
  return (
    <section className="panel">
      <div className="panel-title">
        <div><ClipboardList size={18} /><h2>Findings</h2></div>
        <span>{findings.length} visible</span>
      </div>
      <div className="filter-row">
        <Select value={filters.severity} onChange={(value) => setFilters((current) => ({ ...current, severity: value }))} options={severities} />
        <Select value={filters.category} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} options={categories} />
        <input className="search" value={filters.search} placeholder="Search findings" onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Category</th>
          <th>Finding</th>
          <th>Confidence</th>
          <th>Invariant</th>
          <th>Gate</th>
          <th>Location</th>
          <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding, index) => (
              <tr key={`${finding.id}-${index}`}>
                <td><SeverityBadge severity={finding.severity} /></td>
                <td>{formatLabel(finding.category)}</td>
                <td>
                  <strong>{finding.title}</strong>
                  <span>{finding.message}</span>
                  {finding.recommendation && <em>{finding.recommendation}</em>}
                  <details className="finding-detail">
                    <summary>Details</summary>
                    <dl>
                      <div>
                        <dt>Why it matters</dt>
                        <dd>{whyFindingMatters(finding)}</dd>
                      </div>
                      <div>
                        <dt>Suggested fix</dt>
                        <dd>{finding.recommendation || "Review this finding with a ZK auditor before suppressing it."}</dd>
                      </div>
                      <div>
                        <dt>Suppress template</dt>
                        <dd><code>{suppressionSnippet(finding)}</code></dd>
                      </div>
                    </dl>
                  </details>
                </td>
                <td>{Math.round(Number(finding.confidence ?? 0) * 100)}%</td>
                <td className="mono">{finding.invariantId || "-"}</td>
                <td>{finding.gateImpact ? <StatusPill state={finding.gateImpact} /> : "-"}</td>
                <td className="mono">{finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ""}` : "-"}</td>
                <td>{finding.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="suppressed-box">
        <summary>Suppressed findings ({suppressed.length})</summary>
        {suppressed.length ? (
          <ul>
            {suppressed.map((item, index) => (
              <li key={`${item.finding.id}-${index}`}>
                <strong>{item.finding.id}</strong>
                <span>{item.source}: {item.reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span>No findings were suppressed.</span>
        )}
      </details>
    </section>
  );
}

function BaselineView({ scan }) {
  const circuits = scan?.snapshots?.circuits || [];
  const invariants = scan?.invariantStatuses || [];
  const tools = scan?.toolStatus?.tools || [];
  return (
    <div className="stack">
      <section className="split">
        <Panel title="Tool status" icon={Terminal}>
          <KeyValueGrid
            rows={[
              ["Config", yesNo(scan?.toolStatus?.configLoaded)],
              ["Baseline", yesNo(scan?.toolStatus?.baselineLoaded)],
              ["Circomspect requested", yesNo(scan?.toolStatus?.circomspectRequested)],
              ["Circomspect available", yesNo(scan?.toolStatus?.circomspectAvailable)],
              ["Circomspect executed", yesNo(scan?.toolStatus?.circomspectExecuted)],
              ["Circomspect reason", scan?.toolStatus?.circomspectReason || "-"],
              ["Compile requested", yesNo(scan?.toolStatus?.compilerArtifactsRequested)],
              ["Circom compiler available", yesNo(scan?.toolStatus?.circomAvailable)],
              ["Circom compiler executed", yesNo(scan?.toolStatus?.circomCompilerExecuted)],
              ["Compiler reason", scan?.toolStatus?.circomCompilerReason || "-"],
              ["Native R1CS inspector", yesNo(scan?.toolStatus?.nativeR1csInspectorExecuted)],
              ["snarkjs available", yesNo(scan?.toolStatus?.snarkjsAvailable)],
              ["snarkjs executed", yesNo(scan?.toolStatus?.snarkjsExecuted)],
              ["snarkjs reason", scan?.toolStatus?.snarkjsReason || "-"],
            ]}
          />
        </Panel>
        <Panel title="Snapshot counts" icon={Database}>
          <KeyValueGrid
            rows={[
              ["Circuits", circuits.length],
              ["Verifiers", scan?.snapshots?.verifiers?.length || 0],
              ["Repo artifacts", Object.keys(scan?.snapshots?.artifactHashes || {}).length],
              ["Compiled artifacts", Object.keys(scan?.snapshots?.compilerArtifactHashes || {}).length],
              ["Dependencies", Object.keys(scan?.snapshots?.dependencyHashes || {}).length],
            ]}
          />
        </Panel>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div><Terminal size={18} /><h2>Tool Execution</h2></div>
          <span>{tools.length} tools</span>
        </div>
        {tools.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Requested</th>
                  <th>Available</th>
                  <th>Executed</th>
                  <th>Succeeded</th>
                  <th>Version</th>
                  <th>Reason</th>
                  <th>Setup</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.name}>
                    <td><strong>{tool.name}</strong></td>
                    <td>{yesNo(tool.requested)}</td>
                    <td><CheckStatus status={tool.available ? "pass" : "missing"} /></td>
                    <td>{yesNo(tool.executed)}</td>
                    <td><CheckStatus status={tool.succeeded ? "pass" : tool.requested ? "weak" : "unknown"} /></td>
                    <td className="mono">{tool.version || "-"}</td>
                    <td>{tool.reason}</td>
                    <td>{tool.available ? "-" : tool.installHint || "-"}</td>
                    <td>{tool.confidenceImpact ? `-${tool.confidenceImpact}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Terminal} text="No tool execution status available." />
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <div><ShieldCheck size={18} /><h2>Invariant Coverage</h2></div>
          <span>{invariants.length} declared</span>
        </div>
        {invariants.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invariant</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Circuit</th>
                  <th>Findings</th>
                </tr>
              </thead>
              <tbody>
                {invariants.map((item) => (
                  <tr key={`${item.circuitId}-${item.id}`}>
                    <td><strong>{item.id}</strong></td>
                    <td>{item.type}</td>
                    <td><SeverityBadge severity={item.severity} /></td>
                    <td><span className={`invariant-status ${item.status}`}>{item.status}</span></td>
                    <td className="mono">{item.circuitPath}</td>
                    <td>{item.findingIds.length ? item.findingIds.join(", ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ShieldCheck} text="No invariants declared in config." />
        )}
      </section>

      {circuits.map((circuit) => (
        <section className="panel" key={circuit.id}>
          <div className="panel-title">
            <div><Code2 size={18} /><h2>{circuit.id}</h2></div>
            <span className="mono">{circuit.path}</span>
          </div>
          <div className="snapshot-grid">
            <SummaryTile label="Constraints" value={circuit.constraintLikeCount} />
            <SummaryTile label="Unsafe assigns" value={circuit.unsafeAssignmentCount} />
            <SummaryTile label="Coverage" value={`${circuit.invariantCoverageScore}/100`} />
            <SummaryTile label="Inputs" value={circuit.signalCounts?.input || 0} />
          </div>
          <div className="dual-list">
            <MiniList title="Configured public inputs" items={circuit.publicInputs || []} />
            <MiniList title="Actual public inputs" items={circuit.actualPublicInputs || []} />
          </div>
        </section>
      ))}
    </div>
  );
}

function VerifierView({ scan }) {
  const checks = scan?.verifierChecks || [];
  const verifierFindings = (scan?.findings || []).filter((finding) => finding.category === "verifier");
  return (
    <div className="stack">
      <section className="split">
        <Panel title="Verifier binding score" icon={Code2}>
          <KeyValueGrid
            rows={[
              ["Verifier Binding Risk", `${scan?.metrics?.verifierBindingRisk ?? 0}/100`],
              ["Verifier snapshots", scan?.snapshots?.verifiers?.length || 0],
              ["Verifier findings", verifierFindings.length],
              ["High verifier findings", verifierFindings.filter((finding) => ["critical", "high"].includes(finding.severity)).length],
            ]}
          />
        </Panel>
        <Panel title="Verifier confidence notes" icon={ShieldAlert}>
          <StatusList items={verifierNotes(scan)} />
        </Panel>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div><Code2 size={18} /><h2>Verifier Binding Checks</h2></div>
          <span>{checks.length} checks</span>
        </div>
        {checks.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Status</th>
                  <th>Verifier</th>
                  <th>Detail</th>
                  <th>Findings</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={`${check.verifierId}-${check.id}`}>
                    <td><strong>{check.label}</strong><span className="mono">{check.id}</span></td>
                    <td><CheckStatus status={check.status} /></td>
                    <td><strong>{check.verifierId}</strong><span className="mono">{check.contract}</span></td>
                    <td>{check.detail}</td>
                    <td>{check.findingIds.length ? check.findingIds.join(", ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Code2} text="No verifier checks available. Configure verifiers in circuitshield.yml." />
        )}
      </section>
    </div>
  );
}

function HistoryView({ rows, refresh, database }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <div><History size={18} /><h2>Scan History</h2></div>
        <button onClick={refresh}><RefreshCw size={16} /><span>Refresh</span></button>
      </div>
      <div className="db-status-line">
        <Database size={16} />
        <span>{dbLabel(database)}</span>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Project</th>
                <th>Gate</th>
                <th>Risk</th>
                <th>Drift</th>
                <th>Findings</th>
                <th>Baseline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.createdAt)}</td>
                  <td><strong>{row.projectName}</strong><span>{row.target}</span></td>
                  <td><StatusPill state={row.auditGate} /></td>
                  <td>{row.securityPostureRisk}/100</td>
                  <td>{row.protocolDriftIndex == null ? "N/A" : `${row.protocolDriftIndex}/100`}</td>
                  <td>{row.findingsCount} <span>({row.highFindingsCount} high+)</span></td>
                  <td>{row.baselineRef || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={History} text={database?.enabled ? "No persisted scans yet." : "Database is disabled. Set DB_ENGINE=postgresql and DATABASE_URL."} />
      )}
    </section>
  );
}

function DemoView({ demo, runDemo, busy }) {
  const steps = demo ? [
    ["Audited source", demo.audited],
    ["Audited source with baseline", demo.auditedWithBaseline],
    ["Current risky source vs baseline", demo.current],
  ] : [];
  const driftFindings = demo?.current?.findings?.filter((finding) => finding.category === "baseline_drift") || [];
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-title">
          <div><Workflow size={18} /><h2>Baseline Drift Demo</h2></div>
          <button onClick={runDemo} disabled={busy}><Play size={16} /><span>Run</span></button>
        </div>
        {demo ? (
          <>
            <div className="benchmark-summary">
              <SummaryTile label="Baseline" value={demo.baselineRef} />
              <SummaryTile label="Audited Gate" value={demo.summary.auditedWithBaselineGate} />
              <SummaryTile label="Current Gate" value={demo.summary.currentGate} />
              <SummaryTile label="Current Drift" value={demo.summary.currentDrift == null ? "N/A" : `${demo.summary.currentDrift}/100`} />
            </div>
            <div className="table-wrap demo-table">
              <table>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Gate</th>
                    <th>Drift</th>
                    <th>Findings</th>
                    <th>High+</th>
                    <th>Coverage</th>
                    <th>Verifier Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map(([label, result]) => (
                    <tr key={label}>
                      <td><strong>{label}</strong><span>{compactPath(result.root)}</span></td>
                      <td><StatusPill state={result.auditGate.state} /></td>
                      <td>{result.metrics.protocolDriftIndex == null ? "N/A" : `${result.metrics.protocolDriftIndex}/100`}</td>
                      <td>{result.findings.length}</td>
                      <td>{result.findings.filter((finding) => ["critical", "high"].includes(finding.severity)).length}</td>
                      <td>{result.metrics.invariantCoverageScore}%</td>
                      <td>{result.metrics.verifierBindingRisk}/100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState icon={Workflow} text="Run the demo to see audited baseline vs risky current code." />
        )}
      </section>

      <Panel title="Current drift findings" icon={GitCompare}>
        {driftFindings.length ? (
          <ul className="status-list">
            {driftFindings.map((finding, index) => (
              <li key={`${finding.id}-${index}`}>
                <strong>{finding.id}</strong>
                <span>{finding.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={GitCompare} text="No drift findings loaded." />
        )}
      </Panel>
    </div>
  );
}

function BenchmarkView({ benchmark, runBenchmark, busy }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <div><BarChart3 size={18} /><h2>Benchmarks</h2></div>
        <button onClick={runBenchmark} disabled={busy}><Play size={16} /><span>Run</span></button>
      </div>
      {benchmark ? (
        <>
          <div className="benchmark-summary">
            <SummaryTile label="Total" value={benchmark.summary.total} />
            <SummaryTile label="Passed" value={benchmark.summary.passed} />
            <SummaryTile label="Failed" value={benchmark.summary.failed} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Findings</th>
                  <th>High+</th>
                  <th>Risk</th>
                  <th>Expected Findings</th>
                  <th>Expectation Gaps</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {benchmark.cases.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.id}</strong><span>{item.path}</span></td>
                    <td>{item.expectedGate || "-"}</td>
                    <td><StatusPill state={item.actualGate} /></td>
                    <td>{item.findings}</td>
                    <td>{item.highFindings}</td>
                    <td>{item.securityPostureRisk}/100</td>
                    <td>{item.expectedFindingIds?.length ? item.expectedFindingIds.join(", ") : "-"}</td>
                    <td>
                      {[...(item.missingExpectedFindingIds || []), ...(item.presentForbiddenFindingIds || [])].length
                        ? `missing: ${(item.missingExpectedFindingIds || []).join(", ") || "-"}; forbidden: ${(item.presentForbiddenFindingIds || []).join(", ") || "-"}`
                        : "-"}
                    </td>
                    <td>{item.passedExpectation ? <span className="pass">PASS</span> : <span className="fail">FAIL</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <EmptyState icon={BarChart3} text="No benchmark report loaded." />
      )}
    </section>
  );
}

function ArtifactsView({ scan }) {
  const repoArtifacts = scan?.snapshots?.artifactHashes || {};
  const compiledArtifacts = scan?.snapshots?.compilerArtifactHashes || {};
  const dependencyHashes = scan?.snapshots?.dependencyHashes || {};
  const inspections = scan?.snapshots?.artifactInspections || [];
  const drift = scan?.snapshots?.artifactDrift || [];
  const toolVersions = scan?.snapshots?.toolVersions || {};
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-title">
          <div><GitCompare size={18} /><h2>Artifact Drift</h2></div>
          <span>{drift.length} rows</span>
        </div>
        {drift.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Gate</th>
                  <th>Current Hash</th>
                  <th>Baseline Hash</th>
                </tr>
              </thead>
              <tbody>
                {drift.map((item) => (
                  <tr key={`${item.kind}-${item.path}`}>
                    <td><strong>{item.path}</strong></td>
                    <td>{item.kind}</td>
                    <td><span className={`check-status ${driftStatusTone(item.status)}`}>{item.status}</span></td>
                    <td>{item.riskImpact}</td>
                    <td>{item.gateImpact ? <StatusPill state={item.gateImpact} /> : "-"}</td>
                    <td className="mono">{shortHash(item.currentHash)}</td>
                    <td className="mono">{shortHash(item.baselineHash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={GitCompare} text="No artifact drift rows. Load or create a baseline to compare hashes." />
        )}
      </section>
      <section className="panel">
        <div className="panel-title">
          <div><ShieldCheck size={18} /><h2>Artifact Inspections</h2></div>
          <span>{inspections.length} inspected</span>
        </div>
        {inspections.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Detail</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((item) => (
                  <tr key={item.path}>
                    <td><strong>{item.path}</strong></td>
                    <td>{item.kind}</td>
                    <td><span className={`check-status ${artifactStatusTone(item.status)}`}>{item.status}</span></td>
                    <td>{item.detail}</td>
                    <td className="mono">{item.sha256 || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Database} text="No proof artifacts inspected." />
        )}
      </section>
      <HashPanel title="Tool versions" icon={Terminal} hashes={toolVersions} />
      <HashPanel title="Repository artifacts" icon={Database} hashes={repoArtifacts} />
      <HashPanel title="Compiled artifacts" icon={Blocks} hashes={compiledArtifacts} />
      <HashPanel title="Dependency manifests" icon={FileJson} hashes={dependencyHashes} />
    </div>
  );
}

function HashPanel({ title, icon, hashes }) {
  const entries = Object.entries(hashes);
  return (
    <Panel title={title} icon={icon}>
      {entries.length ? (
        <div className="hash-list">
          {entries.map(([file, hash]) => (
            <div key={file}>
              <strong>{file}</strong>
              <span className="mono">{hash}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Database} text="No hashes tracked." />
      )}
    </Panel>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <div><Icon size={18} /><h2>{title}</h2></div>
      </div>
      {children}
    </section>
  );
}

function StatusList({ items }) {
  if (!items.length) return <EmptyState icon={CheckCircle2} text="No gate reasons." />;
  return (
    <ul className="status-list">
      {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
    </ul>
  );
}

function GateReasonGroups({ scan, findings }) {
  if (!scan?.auditGate?.reasons?.length) return <EmptyState icon={CheckCircle2} text="No gate reasons." />;
  const groups = groupedGateReasons(scan, findings);
  return (
    <div className="reason-groups">
      <ReasonGroup title="Primary blockers" items={groups.primary} />
      <ReasonGroup title="Secondary risks" items={groups.secondary} />
      <ReasonGroup title="Confidence/tooling" items={groups.confidence} />
    </div>
  );
}

function ReasonGroup({ title, items }) {
  return (
    <div>
      <h3>{title}</h3>
      {items.length ? <StatusList items={items} /> : <span className="muted-line">none</span>}
    </div>
  );
}

function groupedGateReasons(scan, findings) {
  const reasons = scan?.auditGate?.reasons || [];
  const primary = [];
  const secondary = [];
  const confidence = [];
  for (const reason of reasons) {
    const lower = reason.toLowerCase();
    if (
      lower.includes("baseline") ||
      lower.includes("protocol drift is unknown") ||
      lower.includes("public input") ||
      lower.includes("range-bound") ||
      lower.includes("nullifier") ||
      lower.includes("value-conservation") ||
      lower.includes("verifier")
    ) {
      primary.push(reason);
    } else if (lower.includes("confidence") || lower.includes("circomspect") || lower.includes("compiler") || lower.includes("tool")) {
      confidence.push(reason);
    } else {
      secondary.push(reason);
    }
  }
  if (scan?.toolStatus && !scan.toolStatus.circomspectExecuted) {
    confidence.push(`Circomspect was not executed: ${scan.toolStatus.circomspectReason || "unknown reason"}. Static risk is based on built-in checks only.`);
  }
  if (scan?.toolStatus?.compilerArtifactsRequested && !scan.toolStatus.circomCompilerExecuted) {
    confidence.push(`Circom compiler was not executed: ${scan.toolStatus.circomCompilerReason || "unknown reason"}. Compiled artifact drift is incomplete.`);
  }
  if (!primary.length && findings.some((finding) => ["critical", "high"].includes(finding.severity))) {
    primary.push("High-priority findings require manual review.");
  }
  return {
    primary: unique(primary).slice(0, 8),
    secondary: unique(secondary).slice(0, 8),
    confidence: unique(confidence).slice(0, 8),
  };
}

function verifierNotes(scan) {
  const notes = [];
  if (!scan?.snapshots?.verifiers?.length) notes.push("No verifier snapshot was created.");
  if ((scan?.verifierChecks || []).some((check) => ["missing", "weak", "unknown"].includes(check.status))) {
    notes.push("Some verifier binding checks are weak, missing, or unknown.");
  }
  if ((scan?.findings || []).some((finding) => finding.id === "verify_proof_result_weakly_enforced")) {
    notes.push("Proof verification result enforcement needs manual review.");
  }
  if (!notes.length) notes.push("No verifier binding issues were detected by configured checks.");
  return notes;
}

function CheckStatus({ status }) {
  return <span className={`check-status ${status}`}>{status}</span>;
}

function artifactStatusTone(status) {
  if (status === "valid") return "pass";
  if (status === "invalid") return "missing";
  if (status === "weak") return "weak";
  return "unknown";
}

function driftStatusTone(status) {
  if (status === "unchanged") return "pass";
  if (status === "changed" || status === "removed") return "missing";
  if (status === "new" || status === "not_tracked") return "weak";
  return "unknown";
}

function shortHash(value) {
  if (!value) return "-";
  return String(value).length > 18 ? `${String(value).slice(0, 14)}...` : value;
}

function whyFindingMatters(finding) {
  if (finding.category === "baseline_drift") return "This can invalidate assumptions from the last reviewed or audited code state.";
  if (finding.category === "invariant") return "This touches a declared protocol invariant, so the circuit may not enforce the business rule the protocol relies on.";
  if (finding.category === "verifier") return "Verifier binding mistakes can let a valid proof prove the wrong statement or allow an invalid flow to continue.";
  if (finding.category === "static") return "This is a known ZK implementation risk pattern that can leave witness values or public inputs under-constrained.";
  if (finding.category === "tooling") return "Missing tooling lowers scan coverage and makes the result less audit-ready.";
  return "This finding affects scan confidence or project configuration.";
}

function suppressionSnippet(finding) {
  const file = finding.file ? `\n    file: ${finding.file}` : "";
  return `- id: ${finding.id}${file}\n    reason: Reviewed and accepted in audit note <ID>\n    expires: \"2026-12-31\"`;
}

function unique(items) {
  return Array.from(new Set(items));
}

function FindingBars({ findings }) {
  const counts = ["critical", "high", "medium", "low", "info"].map((severity) => ({
    severity,
    count: findings.filter((finding) => finding.severity === severity).length,
  }));
  const max = Math.max(1, ...counts.map((item) => item.count));
  return (
    <div className="finding-bars">
      {counts.map((item) => (
        <div key={item.severity}>
          <span>{item.severity}</span>
          <div><b className={item.severity} style={{ width: `${(item.count / max) * 100}%` }} /></div>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniList({ title, items }) {
  return (
    <div className="mini-list">
      <span>{title}</span>
      <div>{items.length ? items.map((item) => <code key={item}>{item}</code>) : <em>none</em>}</div>
    </div>
  );
}

function KeyValueGrid({ rows }) {
  return (
    <div className="kv-grid">
      {rows.map(([key, value]) => (
        <div key={key}>
          <span>{key}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <label className="select-wrap">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
      </select>
      <ChevronDown size={16} />
    </label>
  );
}

function SeverityBadge({ severity }) {
  return <span className={`severity ${severity}`}>{severity}</span>;
}

function StatusPill({ state }) {
  return <span className={`status-pill ${toneForGate(state)}`}>{String(state).replaceAll("_", " ")}</span>;
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="empty-state">
      <Icon size={22} />
      <span>{text}</span>
    </div>
  );
}

function toneForGate(state) {
  if (state === "PASS") return "pass";
  if (state === "BLOCK_CI") return "block";
  if (state === "REBASELINE_REQUIRED") return "rebaseline";
  if (state === "MANUAL_REVIEW") return "manual";
  return "warn";
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function formatLabel(value) {
  return String(value).replaceAll("_", " ");
}

function compactPath(value) {
  if (!value) return "-";
  const parts = String(value).replaceAll("\\", "/").split("/");
  return parts.length > 4 ? `${parts.slice(0, 2).join("/")}/.../${parts.slice(-2).join("/")}` : value;
}

function dbLabel(database) {
  if (!database?.enabled) return "disabled";
  if (database.connected) return "PostgreSQL connected";
  return "PostgreSQL not connected";
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function downloadJson(filename, data) {
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

createRoot(document.getElementById("root")).render(<App />);
