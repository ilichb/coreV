#!/bin/bash
set -e
echo "🔧 Intentando con dependencias modernas..."

# 1. Asegurar target
rustup target add wasm32-unknown-unknown

# 2. Cargo.toml con versiones 2025 (Stable)
cat > contracts/vara-registry/Cargo.toml <<EOF
[package]
name = "vara-registry"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]
path = "src/lib.rs"

[dependencies]
gstd = "1.5.0"
sails-rs = "0.5.0"

[build-dependencies]
gear-wasm-builder = "1.5.0"

[profile.release]
opt-level = "s"
lto = true
EOF

# 3. Limpiar y Compilar
cd contracts/vara-registry
cargo clean
echo "🔨 Compilando V2..."
cargo build --release --target wasm32-unknown-unknown
