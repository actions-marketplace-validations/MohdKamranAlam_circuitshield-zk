#!/usr/bin/env bash
set -euo pipefail

echo "Setting up CircuitShield ZK toolchain..."

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required before installing snarkjs." >&2
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required before installing circom/circomspect." >&2
  echo "Install Rust with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh" >&2
  exit 1
fi

export PATH="$HOME/.cargo/bin:$PATH"

if ! command -v snarkjs >/dev/null 2>&1; then
  npm install -g snarkjs
fi

if ! command -v circomspect >/dev/null 2>&1; then
  cargo install circomspect --locked || cargo install circomspect
fi

if ! command -v circom >/dev/null 2>&1; then
  cargo install circom --locked || cargo install circom
fi

echo "Installed tool versions:"
circom --version || true
circomspect --version || true
snarkjs --help | head -n 1 || true

echo "Done. If tools are still missing in a new shell, run:"
echo 'export PATH="$HOME/.cargo/bin:$PATH"'
