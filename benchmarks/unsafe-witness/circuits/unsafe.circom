pragma circom 2.1.6;

template Unsafe() {
    signal input secret;
    signal output out;

    out <-- secret + 1;
}

component main { public [out] } = Unsafe();
