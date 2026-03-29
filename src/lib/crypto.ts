// src/lib/crypto.ts
import { createHash } from 'crypto';

export function generateSnapshotHash(entries: any[]): string {
  if (!entries.length) {
    return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  }
  
  const data = JSON.stringify(entries.map(e => e.canonical_hash).sort());
  return createHash('sha256').update(data).digest('hex');
}
