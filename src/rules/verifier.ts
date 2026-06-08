import path from "node:path";
import type { Finding, VerifierConfig } from "../types.js";
import { normalizePath, readText, toAbsolute } from "../utils.js";

export async function analyzeVerifier(root: string, verifier: VerifierConfig): Promise<Finding[]> {
  const absolute = toAbsolute(root, verifier.contract);
  const relative = normalizePath(path.relative(root, absolute));
  let content = "";
  try {
    content = await readText(absolute);
  } catch {
    return [
      {
        id: "verifier_contract_missing",
        title: "Configured verifier contract is missing",
        severity: "high",
        category: "verifier",
        source: "verifier-checker",
        file: verifier.contract,
        message: `Verifier '${verifier.id}' points to '${verifier.contract}', but the file was not found.`,
        recommendation: "Fix circuitshield.yml or add the verifier contract.",
        gateImpact: "MANUAL_REVIEW",
      },
    ];
  }

  const findings: Finding[] = [];
  if (!/verifyProof\s*\(/.test(content)) {
    findings.push({
      id: "verify_proof_missing",
      title: "Verifier proof call not found",
      severity: "high",
      category: "verifier",
      source: "verifier-checker",
      file: relative,
      message: "No verifyProof(...) call was found in the configured verifier contract.",
      recommendation: "Confirm the proof result is called and enforced by the protocol wrapper.",
      gateImpact: "MANUAL_REVIEW",
    });
  }

  if (/verifyProof\s*\(/.test(content) && !/require\s*\([^;]*verifyProof\s*\(/s.test(content) && !/if\s*\(\s*!\s*verifyProof\s*\(/s.test(content)) {
    findings.push({
      id: "verify_proof_result_weakly_enforced",
      title: "Proof verification result may be weakly enforced",
      severity: "high",
      category: "verifier",
      source: "verifier-checker",
      file: relative,
      message: "verifyProof(...) appears in the contract, but no obvious require(...) or negative guard was found.",
      recommendation: "Make sure invalid proofs cannot continue execution.",
      gateImpact: "MANUAL_REVIEW",
    });
  }

  const nullifierStorage = /\b\w*Nullifiers\s*\[[^\]]+\]\s*=\s*true\b/is.test(content);
  const nullifierRejectGuard =
    /require\s*\(\s*!\s*\w*Nullifiers\s*\[[^\]]+\]/is.test(content) ||
    /if\s*\(\s*\w*Nullifiers\s*\[[^\]]+\]\s*\)\s*(?:revert|throw|{)/is.test(content);
  if (nullifierStorage && !nullifierRejectGuard) {
    findings.push({
      id: "nullifier_reuse_not_rejected",
      title: "Nullifier reuse may not be rejected",
      severity: "high",
      category: "verifier",
      source: "verifier-checker",
      file: relative,
      message: "A nullifier-like mapping is written, but no obvious require(!usedNullifiers[...]) or revert guard was found before use.",
      recommendation: "Reject reused nullifiers before state changes, for example require(!usedNullifiers[bytes32(nullifierHash)], 'nullifier used').",
      gateImpact: "MANUAL_REVIEW",
    });
  }

  for (const input of verifier.public_input_order ?? []) {
    if (!new RegExp(`\\b${input}\\b`).test(content)) {
      findings.push({
        id: "verifier_public_input_missing",
        title: "Verifier binding signal not found",
        severity: "medium",
        category: "verifier",
        source: "verifier-checker",
        file: relative,
        message: `Configured public input '${input}' was not found in the verifier contract text.`,
        recommendation: "Confirm public input ordering and wrapper binding match the circuit statement.",
        gateImpact: "MANUAL_REVIEW",
      });
    }
  }

  return findings;
}
