pragma circom 2.1.6;

template Simple() {
    signal input secret;
    signal output out;
    out <== secret + 1;
}

component main { public [out] } = Simple();
