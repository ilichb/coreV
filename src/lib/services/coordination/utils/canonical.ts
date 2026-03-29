import { createHash } from 'crypto';

/**
 * Ordena recursivamente las llaves de cualquier objeto para garantizar 
 * una serialización JSON idéntica independientemente del orden de inserción.
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  
  return Object.keys(obj)
    .sort()
    .reduce((acc: any, key: string) => {
      acc[key] = sortObjectKeys(obj[key]);
      return acc;
    }, {});
}

export function generateCanonicalHash(data: any): string {
  const sortedData = sortObjectKeys(data);
  const canonicalString = JSON.stringify(sortedData);
  return createHash('sha256').update(canonicalString).digest('hex');
}

export function generateSnapshotHash(entries: any[]): string {
  // R-004: El hash del snapshot es el hash canónico del array de entries
  return generateCanonicalHash(entries);
}

export function verifyRegistrySnapshotIntegrity(snapshot: any): boolean {
  if (!snapshot || !Array.isArray(snapshot.entries)) return false;
  const computedHash = generateSnapshotHash(snapshot.entries);
  return snapshot.snapshot_hash === computedHash;
}
