#!/bin/bash

# Script de compilación para vara-registry
# Andromeda Core - Vara Network Integration

set -e

echo "🔧 Compilando vara-registry para Vara Network..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "Cargo.toml" ]; then
    echo "❌ Error: Ejecuta este script desde contracts/vara-registry/"
    exit 1
fi

# Verificar que Rust esté instalado
if ! command -v cargo &> /dev/null; then
    echo "❌ Error: Rust no está instalado"
    echo "Instala Rust desde: https://rustup.rs/"
    exit 1
fi

# Verificar target wasm32
if ! rustup target list | grep -q "wasm32-unknown-unknown (installed)"; then
    echo "📦 Instalando target wasm32-unknown-unknown..."
    rustup target add wasm32-unknown-unknown
fi

echo "📦 Rust version: $(rustc --version)"
echo "📦 Cargo version: $(cargo --version)"
echo ""

echo "🔨 Compilando contrato..."
cargo build --release --target wasm32-unknown-unknown

echo ""
if [ -f "target/wasm32-unknown-unknown/release/vara_registry.wasm" ]; then
    echo "✅ Compilación exitosa!"
    echo ""
    echo "📦 Archivo WASM generado:"
    ls -lh target/wasm32-unknown-unknown/release/vara_registry.wasm
    echo ""
    echo "🚀 Próximo paso:"
    echo "   1. Ve a https://idea.gear-tech.io/"
    echo "   2. Upload Program → selecciona vara_registry.wasm"
    echo "   3. Deploy con gas: 10,000,000,000"
    echo "   4. Llama seed() para inicializar"
    echo "   5. Copia el Program ID"
else
    echo "❌ Error: No se generó el archivo WASM"
    exit 1
fi
