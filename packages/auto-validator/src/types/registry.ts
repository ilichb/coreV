export interface RegistryEntry {
  scorecard_id: string;
  canonical_hash: string;
  published_at: string;
  state: 'PUBLISHED' | 'ARCHIVED';
}

export interface RegistrySnapshot {
  version: 'v1';
  entries: RegistryEntry[];
  snapshot_hash: string;
}
