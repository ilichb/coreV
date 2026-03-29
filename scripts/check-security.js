#!/usr/bin/env node

/**
 * Script de verificación de seguridad para Andromeda Core
 * Busca API keys, tokens y credenciales hardcodeadas en el código fuente
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patrones para detectar credenciales hardcodeadas
const SECRET_PATTERNS = [
    // API keys (32+ caracteres alfanuméricos)
    { pattern: /['"][a-zA-Z0-9]{32,}['"]/, name: 'API Key' },
    // JWT tokens
    { pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/, name: 'JWT Token' },
    // Private keys (comienzan con 0x y tienen 64 caracteres)
    { pattern: /['"]0x[a-fA-F0-9]{64}['"]/, name: 'Private Key' },
    // MongoDB URIs
    { pattern: /mongodb(\+srv)?:\/\/[^'"\s]+/, name: 'MongoDB URI' },
    // Redis URLs
    { pattern: /redis:\/\/[^'"\s]+/, name: 'Redis URL' },
    // Supabase URLs y keys
    { pattern: /https:\/\/[a-zA-Z0-9]+\.supabase\.co/, name: 'Supabase URL' },
    { pattern: /sbp_[a-zA-Z0-9]{40,}/, name: 'Supabase Key' },
    // TheGraph API keys en URLs
    { pattern: /gateway\.thegraph\.com\/api\/[a-zA-Z0-9]+\//, name: 'TheGraph API Key' },
    // WalletConnect project IDs
    { pattern: /['"][a-f0-9]{64}['"]/, name: 'WalletConnect Project ID' },
    // Tally API keys
    { pattern: /tally\.xyz\/api\/[a-zA-Z0-9]+/, name: 'Tally API Key' },
];

// Archivos a excluir de la búsqueda
const EXCLUDED_FILES = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    'coverage',
    '.env',
    '.env.local',
    '.env.production',
    'package-lock.json',
    'yarn.lock',
    '*.log',
    '*.min.js',
    '*.min.css',
];

// Extensiones de archivo a incluir
const INCLUDED_EXTENSIONS = [
    '.js', '.ts', '.jsx', '.tsx', '.json', '.env.example'
];

function shouldExcludeFile(filePath) {
    const fileName = path.basename(filePath);

    // Excluir por nombre de archivo/patrón
    for (const pattern of EXCLUDED_FILES) {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            if (regex.test(fileName)) return true;
        } else if (fileName === pattern || filePath.includes(pattern)) {
            return true;
        }
    }

    // Incluir solo extensiones específicas
    const ext = path.extname(fileName);
    return !INCLUDED_EXTENSIONS.includes(ext);
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const findings = [];

    lines.forEach((line, lineNumber) => {
        SECRET_PATTERNS.forEach(({ pattern, name }) => {
            const matches = line.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    // Excluir valores que son claramente placeholders
                    if (match.includes('0x0000000000000000000000000000000000000000')) return;
                    if (match.includes('***REMOVED***')) return;
                    if (match.includes('YOUR_')) return;
                    if (match.includes('example.com')) return;
                    if (match.includes('placeholder')) return;

                    findings.push({
                        file: filePath,
                        line: lineNumber + 1,
                        pattern: name,
                        match: match.substring(0, 50) + (match.length > 50 ? '...' : ''),
                        context: line.trim().substring(0, 100)
                    });
                });
            }
        });
    });

    return findings;
}

function scanDirectory(dirPath) {
    const findings = [];

    try {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (!shouldExcludeFile(fullPath)) {
                    findings.push(...scanDirectory(fullPath));
                }
            } else if (!shouldExcludeFile(fullPath)) {
                findings.push(...scanFile(fullPath));
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error.message);
    }

    return findings;
}

function generateReport(findings) {
    console.log('='.repeat(80));
    console.log('INFORME DE SEGURIDAD - CREDENCIALES HARDCODEADAS');
    console.log('='.repeat(80));
    console.log(`Fecha: ${new Date().toISOString()}`);
    console.log(`Total de hallazgos: ${findings.length}`);
    console.log('='.repeat(80));

    if (findings.length === 0) {
        console.log('✅ No se encontraron credenciales hardcodeadas.');
        return;
    }

    // Agrupar hallazgos por tipo
    const byPattern = {};
    findings.forEach(finding => {
        if (!byPattern[finding.pattern]) {
            byPattern[finding.pattern] = [];
        }
        byPattern[finding.pattern].push(finding);
    });

    // Mostrar por categoría
    Object.entries(byPattern).forEach(([pattern, patternFindings]) => {
        console.log(`\n🔴 ${pattern} (${patternFindings.length} hallazgos):`);
        patternFindings.forEach(finding => {
            console.log(`   📄 ${finding.file}:${finding.line}`);
            console.log(`      ${finding.context}`);
            console.log(`      → ${finding.match}`);
        });
    });

    console.log('\n' + '='.repeat(80));
    console.log('RECOMENDACIONES:');
    console.log('='.repeat(80));
    console.log('1. Mover todas las credenciales a variables de entorno');
    console.log('2. Usar .env.example como template para las variables requeridas');
    console.log('3. Nunca commitear archivos .env con credenciales reales');
    console.log('4. Usar servicios de gestión de secretos en producción');
    console.log('5. Rotar las credenciales periódicamente');
    console.log('='.repeat(80));
}

function checkEnvExample() {
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICACIÓN DE .env.example');
    console.log('='.repeat(80));

    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (!fs.existsSync(envExamplePath)) {
        console.log('❌ No se encontró .env.example');
        return;
    }

    const content = fs.readFileSync(envExamplePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    const variables = lines.map(line => line.split('=')[0].trim());

    console.log(`✅ .env.example encontrado con ${variables.length} variables definidas:`);
    variables.forEach(variable => {
        console.log(`   - ${variable}`);
    });

    // Verificar variables críticas
    const criticalVars = [
        'MONGODB_URI',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
        'THEGRAPH_API_KEY',
        'TALLY_API_KEY'
    ];

    console.log('\nVariables críticas verificadas:');
    criticalVars.forEach(variable => {
        if (variables.includes(variable)) {
            console.log(`   ✅ ${variable}`);
        } else {
            console.log(`   ⚠️  ${variable} (FALTANTE)`);
        }
    });
}

function main() {
    console.log('🔍 Iniciando escaneo de seguridad...\n');

    const startTime = Date.now();
    const findings = scanDirectory(process.cwd());
    const endTime = Date.now();

    generateReport(findings);
    checkEnvExample();

    console.log(`\n⏱️  Escaneo completado en ${(endTime - startTime) / 1000} segundos`);

    // Retornar código de salida basado en hallazgos
    if (findings.length > 0) {
        console.log('\n❌ Se encontraron credenciales hardcodeadas. Revisar el informe.');
        process.exit(1);
    } else {
        console.log('\n✅ No se encontraron credenciales hardcodeadas.');
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { scanDirectory, scanFile, SECRET_PATTERNS };