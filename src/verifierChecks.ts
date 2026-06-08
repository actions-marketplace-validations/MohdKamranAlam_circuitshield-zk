import type { Finding, ProjectConfig, VerifierBindingCheck, VerifierSnapshot } from "./types.js";

export function buildVerifierChecks(config: ProjectConfig, snapshots: VerifierSnapshot[], findings: Finding[]): VerifierBindingCheck[] {
  const verifiers = config.verifiers ?? [];
  return verifiers.flatMap((verifier) => {
    const snapshot = snapshots.find((item) => item.id === verifier.id || item.path === verifier.contract);
    const verifierFindings = findings.filter((finding) => (
      finding.category === "verifier" &&
      (finding.file === verifier.contract || finding.file === snapshot?.path)
    ));
    const missingContract = verifierFindings.filter((finding) => finding.id === "verifier_contract_missing");
    const proofMissing = verifierFindings.filter((finding) => finding.id === "verify_proof_missing");
    const proofWeak = verifierFindings.filter((finding) => finding.id === "verify_proof_result_weakly_enforced");
    const inputMissing = verifierFindings.filter((finding) => finding.id === "verifier_public_input_missing");
    const nullifierReplay = verifierFindings.filter((finding) => finding.id === "nullifier_reuse_not_rejected");
    const orderConfigured = verifier.public_input_order ?? [];
    const hasDomainInputs = orderConfigured.some((input) => ["chainid", "assetid", "domain", "domainseparator"].includes(input.toLowerCase()));
    const hasNullifierInput = orderConfigured.some((input) => input.toLowerCase().includes("nullifier"));

    return [
      check({
        id: "verifier_contract_detected",
        verifierId: verifier.id,
        contract: verifier.contract,
        label: "Verifier contract detected",
        status: missingContract.length ? "missing" : snapshot?.sha256 ? "pass" : "unknown",
        detail: missingContract.length ? "Configured verifier contract was not found." : snapshot?.sha256 ? "Verifier contract is present and hash-tracked." : "Verifier contract detection is inconclusive.",
        findingIds: missingContract.map((finding) => finding.id),
      }),
      check({
        id: "proof_call_enforced",
        verifierId: verifier.id,
        contract: verifier.contract,
        label: "Proof verification enforced",
        status: proofMissing.length ? "missing" : proofWeak.length ? "weak" : "pass",
        detail: proofMissing.length
          ? "No verifyProof call was found."
          : proofWeak.length
            ? "verifyProof was found, but enforcement evidence is weak."
            : "Proof verification appears to be enforced by configured checks.",
        findingIds: [...proofMissing, ...proofWeak].map((finding) => finding.id),
      }),
      check({
        id: "public_input_order_configured",
        verifierId: verifier.id,
        contract: verifier.contract,
        label: "Public input order configured",
        status: orderConfigured.length ? "pass" : "missing",
        detail: orderConfigured.length ? `${orderConfigured.length} public input(s) configured.` : "No verifier public input order is configured.",
        findingIds: [],
      }),
      check({
        id: "public_input_order_matched",
        verifierId: verifier.id,
        contract: verifier.contract,
        label: "Public input order matched",
        status: !orderConfigured.length ? "unknown" : inputMissing.length ? "weak" : "pass",
        detail: !orderConfigured.length
          ? "Cannot check matching without configured public input order."
          : inputMissing.length
            ? "Some configured public inputs were not found in verifier contract text."
            : "Configured public inputs were found in verifier contract text.",
        findingIds: inputMissing.map((finding) => finding.id),
      }),
      check({
        id: "verifier_contract_hash_tracked",
        verifierId: verifier.id,
        contract: verifier.contract,
        label: "Verifier contract hash tracked",
        status: snapshot?.sha256 ? "pass" : "missing",
        detail: snapshot?.sha256 ? "Verifier contract hash is included in baseline snapshots." : "Verifier contract hash is not available for drift tracking.",
        findingIds: [],
      }),
      check({
        id: "domain_binding_inputs",
        verifierId: verifier.id,
        contract: verifier.contract,
        label: "Domain/chain binding configured",
        status: hasDomainInputs ? "pass" : "weak",
        detail: hasDomainInputs ? "Domain-like public input is configured for verifier binding." : "No chainId, assetId, domain, or domainSeparator input is configured.",
        findingIds: [],
      }),
      check({
        id: "nullifier_binding_inputs",
        verifierId: verifier.id,
        contract: verifier.contract,
        label: "Nullifier binding configured",
        status: hasNullifierInput ? "pass" : "unknown",
        detail: hasNullifierInput ? "Nullifier-like public input is configured." : "No nullifier-like public input is configured; on-chain uniqueness is unknown.",
        findingIds: [],
      }),
      check({
        id: "nullifier_reuse_rejected",
        verifierId: verifier.id,
        contract: verifier.contract,
        label: "Nullifier reuse rejected",
        status: !hasNullifierInput ? "unknown" : nullifierReplay.length ? "weak" : "pass",
        detail: !hasNullifierInput
          ? "Cannot assess nullifier replay without a nullifier-like verifier input."
          : nullifierReplay.length
            ? "Nullifier storage exists, but no obvious replay rejection guard was found."
            : "A nullifier-like verifier input is configured and no replay-guard issue was detected.",
        findingIds: nullifierReplay.map((finding) => finding.id),
      }),
    ];
  });
}

function check(input: VerifierBindingCheck): VerifierBindingCheck {
  return input;
}
