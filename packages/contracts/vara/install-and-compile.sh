#!/bin/bash

# Script de instalación de Rust y compilación de vara-registry
# Andromeda Core - Vara Network Integration

set -e

echo "🚀 Instalación de Rust y Compilación de vara-registry"
echo "======================================================"
echo ""

# Paso 1: Instalar Rust
echo "📦 Paso 1/4: Instalando Rust..."
echo ""

if command -v cargo &> /dev/null; then
    echo "✅ Rust ya está instalado: $(rustc --version)"
else
    echo "⏳ Descargando e instalando Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # Cargar Rust en la sesión actual
    source "$HOME/.cargo/env"
    
    echo "✅ Rust instalado: $(rustc --version)"
fi

echo ""
echo "📦 Paso 2/4: Agregando target wasm32..."
rustup target add wasm32-unknown-unknown

echo ""
echo "📦 Paso 3/4: Compilando vara-registry..."
cd "$(dirname "$0")"
cargo build --release --target wasm32-unknown-unknown

echo ""
echo "📦 Paso 4/4: Verificando archivo WASM..."

if [ -f "target/wasm32-unknown-unknown/release/vara_registry.wasm" ]; then
    echo ""
    echo "✅ ¡COMPILACIÓN EXITOSA!"
    echo ""
    echo "📦 Archivo generado:"
    ls -lh target/wasm32-unknown-unknown/release/vara_registry.wasm
    echo ""
    echo "📍 Ubicación completa:"
    realpath target/wasm32-unknown-unknown/release/vara_registry.wasm
    echo ""
    echo "🎯 PRÓXIMO PASO:"
    echo "   1. Ve a https://idea.gear-tech.io/"
    echo "   2. Upload Program → Select File"
    echo "   3. Selecciona: $(realpath target/wasm32-unknown-unknown/release/vara_registry.wasm)"
    echo "   4. Gas: 10000000000, Value: 0"
    echo "   5. Upload y luego llama seed()"
    echo ""
else
    echo "❌ Error: No se generó el archivo WASM"
    exit 1
fi
