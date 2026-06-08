// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Verifier {
    mapping(bytes32 => bool) public usedNullifiers;

    function verifyProof(bytes memory, uint256[] memory) public pure returns (bool) {
        return true;
    }

    function withdraw(bytes calldata proof, uint256 root, uint256 nullifierHash) external {
        uint256[] memory inputs = new uint256[](2);
        inputs[0] = root;
        inputs[1] = nullifierHash;
        require(verifyProof(proof, inputs), "invalid proof");
        usedNullifiers[bytes32(nullifierHash)] = true;
    }
}
