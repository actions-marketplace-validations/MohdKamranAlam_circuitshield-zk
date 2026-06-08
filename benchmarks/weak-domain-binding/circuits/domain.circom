pragma circom 2.1.6;

template Domain() {
    signal input chainId;
    signal input assetId;
    signal output ok;

    chainId === chainId;
    assetId === assetId;
    ok <== 1;
}

component main { public [chainId, assetId] } = Domain();
