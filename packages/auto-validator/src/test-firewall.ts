import { autoValidate } from './engine';
import { RegistrySnapshot } from './types/registry';

// Scorecard con múltiples errores intencionales
const problematicScorecard = {
  "A. Problema": { 
    clarity: 11,  // > 10 - viola F-001 (clarity fuera de rango)
    coherence: 7, 
    completeness: 9, 
    content: {} 
  },
  "B. Límites": { 
    clarity: 7, 
    coherence: 8, 
    completeness: 6, 
    content: {} 
  },
  "C. Especificación Técnica": { 
    clarity: 1,  // Muy bajo vs A.Problema=11 - viola C-001 (inconsistencia)
    coherence: 8, 
    completeness: 8, 
    content: {} 
  },
  "D. Esfuerzo": { 
    clarity: 8, 
    coherence: 7, 
    completeness: 7, 
    content: {} 
  },
  metadata: {
    version: '1.0.0',
    created: '2027-01-01T00:00:00.000Z', // Fecha futura - viola T-002
    updated: '',  // String vacía - viola E-002 (metadata.updated required)
    authorDid: 'did:andromeda:eth:0x123'
  }
};

// Snapshot con hash inválido para probar R-001
const registrySnapshot: RegistrySnapshot = {
  version: 'v1',
  entries: [
    {
      scorecard_id: 'duplicate-test',
      canonical_hash: '0x1234567890abcdef',
      published_at: '2025-01-01T00:00:00.000Z',
      state: 'PUBLISHED'
    }
  ],
  snapshot_hash: 'hash-incorrecto-propositalmente' // Esto activará R-001
};

console.log('=== PRUEBA DE FUEGO - MÚLTIPLES ERRORES ===');
console.log('Scorecard diseñado para fallar en:');
console.log('1. Campo "updated" vacío (E-002)');
console.log('2. Fecha futura (T-002)');
console.log('3. Clarity fuera de rango 0-10 (F-001)');
console.log('4. Inconsistencia de scores (C-001)');
console.log('5. Hash de snapshot inválido (R-001)');
console.log('');

const result = autoValidate(problematicScorecard, registrySnapshot);

console.log('RESULTADO DE VALIDACIÓN:');
console.log(JSON.stringify(result, null, 2));
console.log('');

if (result.failure_codes && result.failure_codes.length >= 4) {
  console.log('✅ PRUEBA EXITOSA: El motor detectó', result.failure_codes.length, 'errores:');
  result.failure_codes.forEach((code: string, i: number) => console.log(`  ${i+1}. ${code}`));
  
  // Verificar que incluye los códigos esperados
  const expectedCodes = ['ANDR-IFC-E-002', 'ANDR-IFC-T-002', 'ANDR-IFC-F-001', 'ANDR-IFC-C-001', 'ANDR-IFC-R-001'];
  const matchedCodes = result.failure_codes.filter((code: string) => expectedCodes.includes(code));
  
  if (matchedCodes.length >= 4) {
    console.log('\n✅ SE DETECTARON LOS ERRORES ESPERADOS');
  } else {
    console.log('\n⚠️  ALGUNOS ERRORES NO FUERON DETECTADOS');
    console.log('Esperados:', expectedCodes);
    console.log('Encontrados:', result.failure_codes);
  }
} else {
  console.log('❌ PRUEBA FALLIDA: Se esperaban al menos 4 errores, se encontraron', result.failure_codes?.length || 0);
  console.log('Resultado completo:', result);
}
