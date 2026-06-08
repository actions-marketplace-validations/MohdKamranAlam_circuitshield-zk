// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Verifier {
    function verifyProof(bytes memory, uint256[] memory) public pure returns (bool) {
        return true;
    }

    function check(bytes calldata proof, uint256[] memory inputs) external {
        verifyProof(proof, inputs);
    }
}
