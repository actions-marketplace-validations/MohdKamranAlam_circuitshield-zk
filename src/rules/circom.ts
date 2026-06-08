import path from "node:path";
import type { CircuitConfig, Finding, InvariantConfig } from "../types.js";
import { normalizePath, readText, toAbsolute } from "../utils.js";
import { hasSignal, occurrenceCount, parseCircomMetadata } from "../circom/metadata.js";

function lineNumber(lines: string[], index: number): number {
  return Math.max(1, index + 1);
}

function hasRangeEvidence(content: string, invariant: InvariantConfig): boolean {
  const signal = String(invariant.signal ?? "");
  const bits = invariant.bits ? String(invariant.bits) : "";
  const lower = content.toLowerCase();
  if (!signal || !hasSignal(content, signal)) return false;
  return (
    lower.includes(`num2bits(${bits}`.toLowerCase()) ||
    lower.includes(`lessthan(${bits}`.toLowerCase()) ||
    lower.includes("rangecheck") ||
    lower.includes("range_check") ||
    lower.includes(`${signal.toLowerCase()}_bits`)
  );
}

function hasBooleanEvidence(content: string, signal: string): boolean {
  const compact = content.replace(/\s+/g, "");
  return compact.includes(`${signal}*(${signal}-1)===0`) || compact.includes(`${signal}===0`) || compact.includes(`${signal}===1`);
}

function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function invariantId(invariant: InvariantConfig, index: number): string {
  return invariant.id ?? `${invariant.type}_${index + 1}`;
}

export async function analyzeCircomCircuit(root: string, circuit: CircuitConfig): Promise<Finding[]> {
  const absolute = toAbsolute(root, circuit.path);
  const relative = normalizePath(path.relative(root, absolute));
  const findings: Finding[] = [];
  let content = "";

  try {
    content = await readText(absolute);
  } catch {
    return [
      {
        id: "circuit_file_missing",
        title: "Configured circuit file is missing",
        severity: "critical",
        category: "configuration",
        source: "config",
        file: circuit.path,
        message: `Circuit '${circuit.id}' points to '${circuit.path}', but the file was not found.`,
        recommendation: "Fix circuitshield.yml or add the missing circuit file.",
        gateImpact: "BLOCK_CI",
      },
    ];
  }

  const lines = content.split(/\r?\n/);
  const metadata = parseCircomMetadata(content);

  for (const assignment of metadata.unsafeAssignments) {
    const signal = assignment.signal;
    const constrained = (metadata.meaningfulConstrainedSignals[signal] ?? 0) > 0;
    if (!constrained) {
      findings.push({
        id: "unsafe_witness_assignment",
        title: "Witness assignment may be unconstrained",
        severity: "high",
        category: "static",
        source: "custom-circom-rule",
        file: relative,
        line: assignment.line,
        message: `Signal '${signal}' is assigned with '<--' and no obvious matching constraint was found.`,
        recommendation: "Use '<==' when possible, or add an explicit '===' constraint binding the assigned witness value.",
        gateImpact: "MANUAL_REVIEW",
      });
    }
  }

  for (const constraint of metadata.constraints.filter((item) => item.tautological)) {
    findings.push({
      id: "tautological_constraint",
      title: "Tautological constraint does not bind protocol state",
      severity: "medium",
      category: "static",
      source: "custom-circom-rule",
      file: relative,
      line: constraint.line,
      message: `Constraint '${constraint.text}' appears self-referential and may not bind any external value.`,
      recommendation: "Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.",
    });
  }

  lines.forEach((line, index) => {
    if (/\bassert\s*\(/.test(line)) {
      findings.push({
        id: "suspicious_assert",
        title: "Suspicious assert usage",
        severity: "medium",
        category: "static",
        source: "custom-circom-rule",
        file: relative,
        line: lineNumber(lines, index),
        message: "Circom assert statements are easy to confuse with constraints.",
        recommendation: "Confirm the intended condition is enforced with '===' or a constrained component output.",
      });
    }
  });

  const configuredPublicInputs = circuit.public_inputs ?? [];
  const actualPublicInputs = metadata.publicInputs;

  if (configuredPublicInputs.length > 0 && actualPublicInputs.length === 0) {
    findings.push({
      id: "circom_public_list_missing",
      title: "Circom public input list could not be extracted",
      severity: "medium",
      category: "configuration",
      source: "circom-metadata",
      file: relative,
      message: "Configured public inputs exist, but no 'component main { public [...] }' block was found.",
      recommendation: "Declare public inputs in component main or confirm the circuit entrypoint is generated elsewhere.",
      gateImpact: "WARN",
    });
  }

  for (const publicInput of configuredPublicInputs) {
    if (!hasSignal(content, publicInput)) {
      findings.push({
        id: "declared_public_input_missing",
        title: "Declared public input not found in circuit",
        severity: "high",
        category: "configuration",
        source: "config",
        file: relative,
        message: `Public input '${publicInput}' is declared in circuitshield.yml but was not found in '${circuit.path}'.`,
        recommendation: "Update the config or add/bind the expected public input.",
        gateImpact: "MANUAL_REVIEW",
      });
    } else if (actualPublicInputs.length > 0 && !actualPublicInputs.includes(publicInput)) {
      findings.push({
        id: "declared_public_input_not_public",
        title: "Declared public input is not public in component main",
        severity: "high",
        category: "configuration",
        source: "circom-metadata",
        file: relative,
        message: `Public input '${publicInput}' is configured but not listed in component main public inputs.`,
        recommendation: "Update component main public inputs or correct circuitshield.yml.",
        gateImpact: "MANUAL_REVIEW",
      });
    } else if ((metadata.meaningfulConstrainedSignals[publicInput] ?? 0) === 0) {
      findings.push({
        id: "declared_public_input_unbound",
        title: "Declared public input has no meaningful constraint binding",
        severity: "high",
        category: "static",
        source: "circom-metadata",
        file: relative,
        message: `Public input '${publicInput}' exists but does not appear in a meaningful constraint.`,
        recommendation: "Bind this public input into the statement being proven.",
        gateImpact: "MANUAL_REVIEW",
      });
    } else if (occurrenceCount(content, publicInput) <= 1) {
      findings.push({
        id: "declared_public_input_weak_usage",
        title: "Declared public input has weak usage evidence",
        severity: "medium",
        category: "static",
        source: "custom-circom-rule",
        file: relative,
        message: `Public input '${publicInput}' appears only once, so binding evidence is weak.`,
        recommendation: "Confirm this public input is constrained into the statement being proven.",
      });
    }
  }

  for (const publicInput of actualPublicInputs.filter((input) => !configuredPublicInputs.includes(input))) {
    findings.push({
      id: "actual_public_input_not_configured",
      title: "Actual public input is not declared in circuitshield.yml",
      severity: "medium",
      category: "configuration",
      source: "circom-metadata",
      file: relative,
      message: `Public input '${publicInput}' appears in component main but is not declared in circuitshield.yml.`,
      recommendation: "Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.",
      gateImpact: "WARN",
    });
  }

  (circuit.invariants ?? []).forEach((invariant, index) => {
    findings.push(...checkInvariant(content, relative, invariant, index, metadata.meaningfulConstrainedSignals));
  });

  return findings;
}

function checkInvariant(content: string, relativeFile: string, invariant: InvariantConfig, index: number, meaningfulConstraints: Record<string, number>): Finding[] {
  const id = invariantId(invariant, index);
  const severity = invariant.severity ?? "high";
  const findings: Finding[] = [];

  if (invariant.type === "range_bound") {
    if (!hasRangeEvidence(content, invariant)) {
      findings.push({
        id: "invariant_range_bound_uncovered",
        title: "Range-bound invariant is not covered",
        severity,
        category: "invariant",
        source: "invariant-checker",
        file: relativeFile,
        invariantId: id,
        message: `No clear range-check evidence was found for '${String(invariant.signal ?? "unknown")}'.`,
        recommendation: "Add an explicit bit-length/range constraint, such as Num2Bits or a known range-check component.",
        gateImpact: severity === "critical" ? "BLOCK_CI" : "MANUAL_REVIEW",
      });
    }
    return findings;
  }

  if (invariant.type === "domain_binding") {
    const signals = (invariant.signals ?? []).map(String);
    const missing = signals.filter((signal) => !hasSignal(content, signal));
    if (missing.length > 0) {
      findings.push({
        id: "invariant_domain_binding_uncovered",
        title: "Domain-binding invariant is not covered",
        severity,
        category: "invariant",
        source: "invariant-checker",
        file: relativeFile,
        invariantId: id,
        message: `Domain-binding signal(s) missing from circuit: ${missing.join(", ")}.`,
        recommendation: "Bind chain, asset, or domain separator fields into public inputs or constrained hash preimages.",
        gateImpact: severity === "critical" ? "BLOCK_CI" : "MANUAL_REVIEW",
      });
    } else {
      const unbound = signals.filter((signal) => (meaningfulConstraints[signal] ?? 0) === 0);
      if (unbound.length > 0) {
        findings.push({
          id: "invariant_domain_binding_weak",
          title: "Domain-binding invariant has weak binding evidence",
          severity,
          category: "invariant",
          source: "invariant-checker",
          file: relativeFile,
          invariantId: id,
          message: `Domain signal(s) lack meaningful constraints: ${unbound.join(", ")}.`,
          recommendation: "Bind domain signals into a constrained hash/preimage rather than self-constraints.",
          gateImpact: severity === "critical" ? "BLOCK_CI" : "MANUAL_REVIEW",
        });
      }
    }
    return findings;
  }

  if (invariant.type === "nullifier_unique") {
    const signal = String(invariant.signal ?? "nullifierHash");
    if (!hasSignal(content, signal)) {
      findings.push({
        id: "invariant_nullifier_missing",
        title: "Nullifier invariant is not covered",
        severity,
        category: "invariant",
        source: "invariant-checker",
        file: relativeFile,
        invariantId: id,
        message: `Nullifier signal '${signal}' was not found.`,
        recommendation: "Expose and constrain the nullifier hash so the verifier/contract can reject reuse.",
        gateImpact: "BLOCK_CI",
      });
    } else if ((meaningfulConstraints[signal] ?? 0) === 0) {
      findings.push({
        id: "invariant_nullifier_weak_binding",
        title: "Nullifier invariant has weak binding evidence",
        severity,
        category: "invariant",
        source: "invariant-checker",
        file: relativeFile,
        invariantId: id,
        message: `Nullifier signal '${signal}' exists but does not appear in a meaningful constraint.`,
        recommendation: "Constrain the nullifier hash to a secret/preimage and ensure the verifier contract rejects reuse.",
        gateImpact: "MANUAL_REVIEW",
      });
    }
    return findings;
  }

  if (invariant.type === "merkle_membership") {
    const root = String(invariant.root ?? "root");
    const semantic = stripComments(content).toLowerCase();
    const hasRoot = hasSignal(content, root);
    const hasPathEvidence = semantic.includes("path") || semantic.includes("sibling") || semantic.includes("leaf");
    const hasHashEvidence = semantic.includes("poseidon") || semantic.includes("mimc") || semantic.includes("pedersen") || semantic.includes("sha256");
    const rootBound = (meaningfulConstraints[root] ?? 0) > 0;
    if (!hasRoot || !rootBound) {
      findings.push({
        id: "invariant_merkle_membership_uncovered",
        title: "Merkle-membership invariant is not covered",
        severity,
        category: "invariant",
        source: "invariant-checker",
        file: relativeFile,
        invariantId: id,
        message: `Merkle membership evidence is weak for root '${root}'.`,
        recommendation: "Confirm the circuit constrains a valid Merkle path to the declared public root.",
        gateImpact: severity === "critical" ? "BLOCK_CI" : "MANUAL_REVIEW",
      });
    } else if (!hasPathEvidence || !hasHashEvidence) {
      findings.push({
        id: "invariant_merkle_membership_weak",
        title: "Merkle-membership invariant has weak evidence",
        severity,
        category: "invariant",
        source: "invariant-checker",
        file: relativeFile,
        invariantId: id,
        message: `Root '${root}' is constrained, but no clear Merkle path and hash evidence was found outside comments.`,
        recommendation: "Use an audited Merkle path/hash component and constrain the computed root to the declared public root.",
        gateImpact: severity === "critical" ? "BLOCK_CI" : "MANUAL_REVIEW",
      });
    }
    return findings;
  }

  if (invariant.type === "value_conservation") {
    const declaredSignals = [
      ...(Array.isArray(invariant.signals) ? invariant.signals : []),
      ...(Array.isArray(invariant.inputs) ? invariant.inputs : []),
      ...(Array.isArray(invariant.outputs) ? invariant.outputs : []),
    ].map(String);
    if (declaredSignals.length === 0) {
      findings.push({
        id: "invariant_value_conservation_unspecified",
        title: "Value-conservation invariant is underspecified",
        severity: "medium",
        category: "invariant",
        source: "invariant-checker",
        file: relativeFile,
        invariantId: id,
        message: "Value-conservation invariant is declared but no input/output value signals are specified.",
        recommendation: "Declare value input/output signals so CircuitShield can track conservation coverage and drift.",
        gateImpact: "MANUAL_REVIEW",
      });
      return findings;
    }
    const lower = content.toLowerCase();
    const hasValueEvidence = ["amount", "balance", "sum", "total", "input", "output"].some((token) => lower.includes(token));
    const hasEquality = content.includes("===");
    if (!hasValueEvidence || !hasEquality) {
      findings.push({
        id: "invariant_value_conservation_uncovered",
        title: "Value-conservation invariant needs review",
        severity,
        category: "invariant",
        source: "invariant-checker",
        file: relativeFile,
        invariantId: id,
        message: "No clear value-conservation evidence was found from the configured circuit.",
        recommendation: "Declare the value signals and add explicit conservation constraints or a review note.",
        gateImpact: severity === "critical" ? "BLOCK_CI" : "MANUAL_REVIEW",
      });
    }
    return findings;
  }

  if (invariant.type === "boolean") {
    const signal = String(invariant.signal ?? "");
    if (!signal || !hasBooleanEvidence(content, signal)) {
      findings.push({
        id: "invariant_boolean_uncovered",
        title: "Boolean invariant is not covered",
        severity,
        category: "invariant",
        source: "invariant-checker",
        file: relativeFile,
        invariantId: id,
        message: `No clear boolean constraint was found for '${signal || "unknown"}'.`,
        recommendation: "Add a boolean constraint such as x * (x - 1) === 0.",
        gateImpact: severity === "critical" ? "BLOCK_CI" : "MANUAL_REVIEW",
      });
    }
  }

  return findings;
}
