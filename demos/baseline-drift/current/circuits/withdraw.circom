pragma circom 2.1.6;

template Withdraw() {
    signal input secret;
    signal input pathElement;
    signal input balance;
    signal input change;
    signal input amount;
    signal input merkleRoot;
    signal input nullifierHash;
    signal input recipient;
    signal input chainId;
    signal input assetId;

    signal output out;
    signal computedRoot;

    out <-- secret + amount;
    computedRoot <== pathElement + secret;
    computedRoot === merkleRoot;
    nullifierHash === secret + 1;
    chainId === chainId;
    assetId === assetId;
    recipient === recipient;
}

component main { public [merkleRoot, nullifierHash, recipient, amount, chainId, assetId] } = Withdraw();
