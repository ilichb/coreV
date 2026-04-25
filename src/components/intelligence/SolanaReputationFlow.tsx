'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';

interface PipelineData {
  timestamp: string;
  nodes: {
    solana:      { label: string; status: string; slot: number | null; balance: number | null; program: string };
    yellowstone: { label: string; status: string; processed: number; errors: number; endpoint: string };
    avip:        { label: string; status: string; queueSize: number; dlqSize: number; network: string; contract: string };
    arbitrum:    { label: string; status: string; contract: string; chainId: number };
    atlas:       { label: string; status: string; milestones: number; network: string };
  };
  flow: Array<{ from: string; to: string; active: boolean }>;
}

const STATUS_COLOR: Record<string, string> = {
  active:   '#00f0ff',
  idle:     '#facc15',
  error:    '#f97316',
  degraded: '#f97316',
  pending:  '#6b7280',
};

function NodeCard({ label, status, children }: {
  label: string; status: string; children?: React.ReactNode;
}) {
  const color = STATUS_COLOR[status] || '#6b7280';
  const isPulsing = status === 'active' || status === 'error';
  return (
    <div
      className="relative flex flex-col gap-1 p-3 rounded-[3px] border bg-black/40 backdrop-blur-sm w-full"
      style={{ borderColor: `${color}40` }}
    >
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: color }} />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{ borderColor: color }} />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{ borderColor: color }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: color }} />
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPulsing ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: color }} />
        <span className="text-[9px] font-mono uppercase tracking-widest truncate" style={{ color }}>{label}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-[9px] text-gray-600 font-mono truncate">{label}</span>
      <span className="text-[10px] font-mono font-bold flex-shrink-0" style={{ color: accent || '#e5e7eb' }}>{value}</span>
    </div>
  );
}

function FlowArrow({ active, vertical }: { active: boolean; vertical?: boolean }) {
  const color = active ? '#00f0ff' : '#1f2937';
  if (vertical) {
    return (
      <div className="flex flex-col items-center justify-center h-6 w-full">
        <div className={`w-px flex-1 ${active ? 'animate-pulse' : ''}`} style={{ backgroundColor: color }} />
        <div className="w-0 h-0" style={{
          borderLeft: '3px solid transparent',
          borderRight: '3px solid transparent',
          borderTop: `5px solid ${color}`,
        }} />
      </div>
    );
  }
  return (
    <div className="flex flex-row items-center justify-center w-8 flex-shrink-0 h-full min-h-[40px]">
      <div className={`h-px flex-1 ${active ? 'animate-pulse' : ''}`} style={{ backgroundColor: color }} />
      <div className="w-0 h-0" style={{
        borderTop: '3px solid transparent',
        borderBottom: '3px solid transparent',
        borderLeft: `5px solid ${color}`,
      }} />
    </div>
  );
}

export function SolanaReputationFlow() {
  const t = useTranslations('SolanaReputationFlow');
  const [data, setData] = useState<PipelineData | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/solana/pipeline');
        if (res.ok) setData(await res.json());
      } catch {}
    };
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-[10px] font-mono text-gray-600 animate-pulse tracking-widest">
        {t('initializing')}
      </div>
    );
  }

  const { nodes, flow } = data;
  const isActive = (from: string, to: string) => flow.find(f => f.from === from && f.to === to)?.active ?? false;

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-[#00f0ff] flex-shrink-0" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#00f0ff]">{t('title')}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
          <span className="text-[9px] font-mono text-gray-500">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Pipeline — layout responsivo */}
      {/* Desktop: fila horizontal con flex. Mobile: columna con scroll */}
      <div className="w-full">
        {/* Desktop layout (md+): todos los nodos en fila */}
        <div className="hidden md:flex items-stretch gap-0 w-full">
          <div className="flex-1 min-w-0">
            <NodeCard label={t('nodes.solanaDevnet')} status={nodes.solana.status}>
              <Stat label={t('labels.slot')} value={nodes.solana.slot?.toLocaleString() ?? '--'} accent="#a78bfa" />
              <Stat label={t('labels.balance')} value={nodes.solana.balance !== null ? `${nodes.solana.balance?.toFixed(3)} SOL` : '--'} accent="#4ade80" />
              <Stat label={t('labels.program')} value={`${nodes.solana.program.slice(0, 8)}…`} accent="#00f0ff" />
            </NodeCard>
          </div>

          <FlowArrow active={isActive('solana', 'yellowstone')} />

          <div className="flex-1 min-w-0">
            <NodeCard label={t('nodes.yellowstone')} status={nodes.yellowstone.status}>
              <Stat label={t('labels.status')} value={nodes.yellowstone.status.toUpperCase()} accent={STATUS_COLOR[nodes.yellowstone.status]} />
              <Stat label={t('labels.processed')} value={nodes.yellowstone.processed} accent="#4ade80" />
              <Stat label={t('labels.errors')} value={nodes.yellowstone.errors} accent={nodes.yellowstone.errors > 0 ? '#f97316' : '#6b7280'} />
            </NodeCard>
          </div>

          <FlowArrow active={isActive('yellowstone', 'avip')} />

          <div className="flex-1 min-w-0">
            <NodeCard label={t('nodes.avipEngine')} status={nodes.avip.status}>
              <Stat label={t('labels.queue')} value={nodes.avip.queueSize} accent="#facc15" />
              <Stat label={t('labels.dlq')} value={nodes.avip.dlqSize} accent={nodes.avip.dlqSize > 0 ? '#f97316' : '#6b7280'} />
              <Stat label={t('labels.network')} value="Arb Sepolia" accent="#60a5fa" />
            </NodeCard>
          </div>

          {/* Fork: dos salidas de AVIP */}
          <div className="flex flex-col justify-around flex-shrink-0">
            <FlowArrow active={isActive('avip', 'arbitrum')} />
            <FlowArrow active={isActive('avip', 'atlas')} />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <NodeCard label={t('nodes.arbitrumSepolia')} status={nodes.arbitrum.status}>
              <Stat label={t('labels.chainId')} value={nodes.arbitrum.chainId} accent="#60a5fa" />
              <Stat label={t('labels.contract')} value={`${nodes.arbitrum.contract.slice(0, 8)}…`} accent="#00f0ff" />
              <Stat label="AVIP Registry" value="✓ Live" accent="#4ade80" />
            </NodeCard>
            <NodeCard label={t('nodes.atlasIndex')} status={nodes.atlas.status}>
              <Stat label={t('labels.milestones')} value={nodes.atlas.milestones} accent="#4ade80" />
              <Stat label={t('labels.storage')} value="MongoDB" accent="#a78bfa" />
              <Stat label={t('labels.status')} value={nodes.atlas.status.toUpperCase()} accent={STATUS_COLOR[nodes.atlas.status]} />
            </NodeCard>
          </div>
        </div>

        {/* Mobile layout: columna con scrollbar personalizada */}
        <div className="flex md:hidden flex-col gap-1 max-h-[480px] overflow-y-auto solana-flow-scroll pr-1">
          <NodeCard label={t('nodes.solanaDevnet')} status={nodes.solana.status}>
            <Stat label={t('labels.slot')} value={nodes.solana.slot?.toLocaleString() ?? '--'} accent="#a78bfa" />
            <Stat label={t('labels.balance')} value={nodes.solana.balance !== null ? `${nodes.solana.balance?.toFixed(3)} SOL` : '--'} accent="#4ade80" />
            <Stat label={t('labels.program')} value={`${nodes.solana.program.slice(0, 8)}…`} accent="#00f0ff" />
          </NodeCard>
          <FlowArrow active={isActive('solana', 'yellowstone')} vertical />
          <NodeCard label={t('nodes.yellowstone')} status={nodes.yellowstone.status}>
            <Stat label={t('labels.status')} value={nodes.yellowstone.status.toUpperCase()} accent={STATUS_COLOR[nodes.yellowstone.status]} />
            <Stat label={t('labels.processed')} value={nodes.yellowstone.processed} accent="#4ade80" />
            <Stat label={t('labels.errors')} value={nodes.yellowstone.errors} accent={nodes.yellowstone.errors > 0 ? '#f97316' : '#6b7280'} />
          </NodeCard>
          <FlowArrow active={isActive('yellowstone', 'avip')} vertical />
          <NodeCard label={t('nodes.avipEngine')} status={nodes.avip.status}>
            <Stat label={t('labels.queue')} value={nodes.avip.queueSize} accent="#facc15" />
            <Stat label={t('labels.dlq')} value={nodes.avip.dlqSize} accent={nodes.avip.dlqSize > 0 ? '#f97316' : '#6b7280'} />
            <Stat label={t('labels.network')} value="Arb Sepolia" accent="#60a5fa" />
          </NodeCard>
          <FlowArrow active={isActive('avip', 'arbitrum')} vertical />
          <NodeCard label={t('nodes.arbitrumSepolia')} status={nodes.arbitrum.status}>
            <Stat label={t('labels.chainId')} value={nodes.arbitrum.chainId} accent="#60a5fa" />
            <Stat label={t('labels.contract')} value={`${nodes.arbitrum.contract.slice(0, 8)}…`} accent="#00f0ff" />
            <Stat label="AVIP Registry" value="✓ Live" accent="#4ade80" />
          </NodeCard>
          <FlowArrow active={isActive('avip', 'atlas')} vertical />
          <NodeCard label={t('nodes.atlasIndex')} status={nodes.atlas.status}>
            <Stat label={t('labels.milestones')} value={nodes.atlas.milestones} accent="#4ade80" />
            <Stat label={t('labels.storage')} value="MongoDB" accent="#a78bfa" />
            <Stat label={t('labels.status')} value={nodes.atlas.status.toUpperCase()} accent={STATUS_COLOR[nodes.atlas.status]} />
          </NodeCard>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-t border-gray-800 pt-3 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-mono font-bold text-[#00f0ff]">{nodes.yellowstone.processed}</div>
          <div className="text-[9px] text-gray-600 font-mono uppercase tracking-wider">{t('stats.milestonesDetected')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-mono font-bold text-[#4ade80]">
            {flow.filter(f => f.active).length}/{flow.length}
          </div>
          <div className="text-[9px] text-gray-600 font-mono uppercase tracking-wider">{t('stats.activeFlows')}</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-mono font-bold ${nodes.avip.dlqSize > 0 ? 'text-[#f97316]' : 'text-[#4ade80]'}`}>
            {nodes.avip.dlqSize}
          </div>
          <div className="text-[9px] text-gray-600 font-mono uppercase tracking-wider">{t('stats.dlqPending')}</div>
        </div>
      </div>

      <style jsx global>{`
        .solana-flow-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .solana-flow-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .solana-flow-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 240, 255, 0.25);
          border-radius: 2px;
        }
        .solana-flow-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 240, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
