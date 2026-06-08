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

    signal poseidonHash;
    signal computedRoot;
    signal statementHash;
    signal amount_bits;

    poseidonHash <== pathElement + secret;
    computedRoot <== poseidonHash + pathElement;
    computedRoot === merkleRoot;
    nullifierHash === secret + chainId + assetId;
    amount_bits <== amount;
    balance === amount + change;
    statementHash <== merkleRoot + nullifierHash + recipient + amount + chainId + assetId + balance + change;
}

component main { public [merkleRoot, nullifierHash, recipient, amount, chainId, assetId] } = Withdraw();
