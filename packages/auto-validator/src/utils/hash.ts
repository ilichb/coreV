// Implementación real de verificación de snapshot hash
// NOTA: En producción, usaríamos ethers.keccak256, pero para evitar dependencias
// usamos una implementación simplificada para testing

import { RegistrySnapshot } from '../types/registry';

/**
 * Calcula el hash canónico de un snapshot según RFC Registry v1
 * Orden: published_at ASC, canonical_hash ASC
 */
export function calculateSnapshotHash(snapshot: RegistrySnapshot): string {
  // Ordenar entradas según reglas canónicas
  const orderedEntries = [...snapshot.entries].sort((a, b) => {
    // 1. Por published_at
    const dateCompare = new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    if (dateCompare !== 0) return dateCompare;
    
    // 2. Por canonical_hash (tie-breaker)
    return a.canonical_hash.localeCompare(b.canonical_hash);
  });
  
  // Crear objeto canónico para hashing
  const canonicalObject = {
    version: snapshot.version,
    entries: orderedEntries.map(entry => ({
      scorecard_id: entry.scorecard_id,
      canonical_hash: entry.canonical_hash,
      published_at: entry.published_at,
      state: entry.state
    }))
  };
  
  // Serialización canónica (sin espacios, orden de claves fijo)
  const canonicalString = JSON.stringify(canonicalObject);
  
  // En producción usaríamos: ethers.keccak256(ethers.toUtf8Bytes(canonicalString))
  // Para testing, usamos un hash simple
  return simpleHash(canonicalString);
}

/**
 * Función de hash simple para testing
 * En producción reemplazar por ethers.keccak256
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32-bit integer
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Verifica que el snapshot_hash proporcionado coincida con el cálculo
 */
export function verifySnapshotHash(snapshot: RegistrySnapshot): boolean {
  const calculatedHash = calculateSnapshotHash(snapshot);
  return calculatedHash === snapshot.snapshot_hash;
}
