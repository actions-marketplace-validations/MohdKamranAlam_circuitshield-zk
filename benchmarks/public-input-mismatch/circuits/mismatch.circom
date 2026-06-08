pragma circom 2.1.6;

template Mismatch() {
    signal input root;
    signal input nullifierHash;
    signal input chainId;
    signal output out;

    out <== root + nullifierHash + chainId;
}

component main { public [root, nullifierHash] } = Mismatch();
