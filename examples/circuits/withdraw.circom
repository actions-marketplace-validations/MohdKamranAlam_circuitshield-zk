pragma circom 2.1.6;

template Withdraw() {
    signal input secret;
    signal input pathElement;
    signal input amount;
    signal input merkleRoot;
    signal input nullifierHash;
    signal input recipient;
    signal input chainId;
    signal input assetId;

    signal output out;

    // Intentionally weak example for scanner demo:
    // `out` is assigned as witness data but not constrained.
    out <-- secret + amount;

    // Merkle root is mentioned, but membership is not fully constrained.
    signal computedRoot;
    computedRoot <== pathElement + secret;
    computedRoot === merkleRoot;

    // Nullifier exists but this example does not model uniqueness at contract level.
    nullifierHash === secret + 1;

    // Domain fields are present but not bound into a constrained hash preimage.
    chainId === chainId;
    assetId === assetId;

    // Missing range bound for amount.
    recipient === recipient;
}

component main { public [merkleRoot, nullifierHash, recipient, amount, chainId, assetId] } = Withdraw();
