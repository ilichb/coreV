export interface Finding {
    id: string;
    severity: 'CRITICAL' | 'MEDIUM' | 'LOW';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}

export const FINDING_IDS: Finding[] = [
    { id: 'L7-WAF', severity: 'CRITICAL', status: 'OPEN' },
    { id: 'DB-RLS', severity: 'CRITICAL', status: 'OPEN' },
    { id: 'SEC-HDR', severity: 'MEDIUM', status: 'OPEN' },
    { id: 'C-01', severity: 'CRITICAL', status: 'RESOLVED' },
    { id: 'C-02', severity: 'CRITICAL', status: 'IN_PROGRESS' },
    { id: 'M-01', severity: 'MEDIUM', status: 'IN_PROGRESS' },
    { id: 'M-02', severity: 'MEDIUM', status: 'RESOLVED' },
    { id: 'B-01', severity: 'LOW', status: 'OPEN' },
    { id: 'B-02', severity: 'LOW', status: 'RESOLVED' }
];

export const COOLDOWN_HOURS = 12;
export const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;
