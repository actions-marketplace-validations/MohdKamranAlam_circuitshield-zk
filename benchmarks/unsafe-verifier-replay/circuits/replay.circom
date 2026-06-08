pragma circom 2.1.6;

template Replay() {
    signal input root;
    signal input nullifierHash;
    signal output out;
    out <== root + nullifierHash;
}

component main { public [root, nullifierHash] } = Replay();
