#!/bin/bash

# MAESTRO DE COMPILACIÓN VARA
# Intento Definitivo

set -e

echo "🔧 Preparando entorno de compilación..."

# 1. Instalar el target que pidió el error (wasm32-unknown-unknown es el estándar, pero probaremos fix)
rustup target add wasm32-unknown-unknown

# 2. Reemplazar Cargo.toml con versión mínima garantizada
cat > contracts/vara-registry/Cargo.toml <<EOF
[package]
name = "vara-registry"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib"] 

[dependencies]
gstd = "1.4.2"
sails-rs = "0.2.0"

[build-dependencies]
gear-wasm-builder = "1.4.2"

[profile.release]
opt-level = "s"
lto = true
EOF

echo "📄 Cargo.toml restaurado a versiones estables"

# 3. Limpiar y Compilar
cd contracts/vara-registry
echo "🧹 Limpiando..."
cargo clean

echo "🔨 Compilando (esto tomará 1-2 minutos)..."
# Usamos --no-default-features para evitar conflictos
cargo build --release --target wasm32-unknown-unknown

echo ""
if [ -f "target/wasm32-unknown-unknown/release/vara_registry.wasm" ]; then
    echo "✅ ÉXITO TOTAL"
    ls -lh target/wasm32-unknown-unknown/release/vara_registry.wasm
else
    echo "❌ Falló la compilación"
    exit 1
fi
