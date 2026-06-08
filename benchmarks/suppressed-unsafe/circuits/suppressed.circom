pragma circom 2.1.6;

template Suppressed() {
    signal input secret;
    signal output out;

    // circuitshield-ignore unsafe_witness_assignment reason="benchmark suppression"
    out <-- secret + 1;
}

component main { public [out] } = Suppressed();
