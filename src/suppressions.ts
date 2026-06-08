import { promises as fs } from "node:fs";
import path from "node:path";
import type { Finding, ProjectConfig, SuppressedFinding, SuppressionConfig } from "./types.js";
import { normalizePath, toAbsolute } from "./utils.js";

interface InlineSuppression {
  file: string;
  line?: number;
  id?: string;
  reason: string;
}

export async function applySuppressions(root: string, config: ProjectConfig, findings: Finding[]): Promise<{ active: Finding[]; suppressed: SuppressedFinding[] }> {
  const configSuppressions = config.suppressions ?? [];
  const inlineSuppressions = await loadInlineSuppressions(root, findings);
  const active: Finding[] = [];
  const suppressed: SuppressedFinding[] = [];

  for (const finding of findings) {
    const configMatch = findConfigSuppression(configSuppressions, finding);
    if (configMatch) {
      suppressed.push({ finding, reason: configMatch.reason, source: "config" });
      continue;
    }
    const inlineMatch = findInlineSuppression(inlineSuppressions, finding);
    if (inlineMatch) {
      suppressed.push({ finding, reason: inlineMatch.reason, source: "inline" });
      continue;
    }
    active.push(finding);
  }

  return { active, suppressed };
}

function findConfigSuppression(suppressions: SuppressionConfig[], finding: Finding): SuppressionConfig | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return suppressions.find((suppression) => {
    if (suppression.expires && suppression.expires < today) return false;
    if (suppression.id && suppression.id !== finding.id) return false;
    if (suppression.category && suppression.category !== finding.category) return false;
    if (suppression.file && normalizePath(suppression.file) !== normalizePath(finding.file ?? "")) return false;
    return true;
  });
}

async function loadInlineSuppressions(root: string, findings: Finding[]): Promise<InlineSuppression[]> {
  const files = Array.from(new Set(findings.map((finding) => finding.file).filter(Boolean))) as string[];
  const suppressions: InlineSuppression[] = [];
  for (const file of files) {
    const absolute = toAbsolute(root, file);
    const raw = await fs.readFile(absolute, "utf8").catch(() => "");
    if (!raw) continue;
    const lines = raw.split(/\r?\n/);
    lines.forEach((line, index) => {
      const fileMatch = line.match(/circuitshield-ignore-file\s+([A-Za-z0-9_*,.-]+)(?:\s+reason=["']?([^"']+)["']?)?/);
      if (fileMatch) {
        for (const id of expandIds(fileMatch[1])) {
          suppressions.push({ file: normalizePath(file), id, reason: fileMatch[2] || "File-level suppression" });
        }
      }
      const lineMatch = line.match(/circuitshield-ignore\s+([A-Za-z0-9_*,.-]+)(?:\s+reason=["']?([^"']+)["']?)?/);
      if (lineMatch) {
        for (const id of expandIds(lineMatch[1])) {
          suppressions.push({ file: normalizePath(file), line: index + 2, id, reason: lineMatch[2] || "Inline suppression" });
          suppressions.push({ file: normalizePath(file), line: index + 1, id, reason: lineMatch[2] || "Inline suppression" });
        }
      }
    });
  }
  return suppressions;
}

function findInlineSuppression(suppressions: InlineSuppression[], finding: Finding): InlineSuppression | undefined {
  if (!finding.file) return undefined;
  const file = normalizePath(finding.file);
  return suppressions.find((suppression) => {
    if (suppression.file !== file) return false;
    if (suppression.id && suppression.id !== "*" && suppression.id !== finding.id) return false;
    if (suppression.line && finding.line && suppression.line !== finding.line) return false;
    if (suppression.line && !finding.line) return false;
    return true;
  });
}

function expandIds(raw: string): string[] {
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}
