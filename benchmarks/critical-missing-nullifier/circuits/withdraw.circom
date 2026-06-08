pragma circom 2.1.6;

template Withdraw() {
    signal input secret;
    signal input merkleRoot;
    signal output out;

    out <== secret + merkleRoot;
}

component main { public [merkleRoot] } = Withdraw();
