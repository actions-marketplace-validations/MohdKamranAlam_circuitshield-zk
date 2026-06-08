// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WithdrawVerifier {
    mapping(bytes32 => bool) public usedNullifiers;

    function verifyProof(bytes memory, uint256[] memory) public pure returns (bool) {
        return true;
    }

    function withdraw(
        bytes calldata proof,
        uint256 merkleRoot,
        uint256 nullifierHash,
        address recipient,
        uint256 amount,
        uint256 chainId,
        uint256 assetId
    ) external {
        uint256[] memory inputs = new uint256[](6);
        inputs[0] = merkleRoot;
        inputs[1] = nullifierHash;
        inputs[2] = uint256(uint160(recipient));
        inputs[3] = amount;
        inputs[4] = chainId;
        inputs[5] = assetId;

        verifyProof(proof, inputs);
        usedNullifiers[bytes32(nullifierHash)] = true;
    }
}
