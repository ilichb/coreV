'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Network, Cpu, Users, Target, GitMerge, RefreshCw } from 'lucide-react';
import EmbeddedDisplay from '@/components/widgets/EmbeddedDisplay';
import { logger } from '../../lib/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  type: 'builder' | 'project' | 'ecosystem';
  label: string;
  reputation: number;
  industry?: string;
  ecosystem?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  fixed?: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number;
  type: 'contribution' | 'collaboration' | 'attestation';
}

interface NetworkGraphProps {
  maxNodes?: number;
  animate?: boolean;
}

// ─── Color palettes ──────────────────────────────────────────────────────────

const INDUSTRY_COLORS: Record<string, string> = {
  finance: '#ef4444',
  infrastructure: '#f97316',
  media: '#eab308',
  organizations: '#8b5cf6',
  rwa: '#84cc16',
  science: '#06b6d4',
  energy: '#22c55e',
  supplychain: '#0ea5e9',
  education: '#14b8a6',
  security: '#ec4899',
  ai: '#6366f1',
};

const ECO_COLORS: Record<string, string> = {
  rootstock:  '#f97316',
  optimism:   '#ef4444',
  arbitrum:   '#3b82f6',
  polkadot:   '#e040fb',
  solana:     '#9945ff',
  thegraph:   '#6747ed',
  algorand:   '#00b4d8',
  snapshot:   '#8b5cf6',
};

// ─── Demo data generator ─────────────────────────────────────────────────────

function generateDemoGraph(maxNodes: number = 15): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const industries = Object.keys(INDUSTRY_COLORS);
  const ecosystems = ['rootstock', 'solana', 'arbitrum', 'polkadot', 'thegraph'];

  const W = 900;
  const H = 400;
  const CX = W / 2;
  const CY = H / 2;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Hub central
  nodes.push({
    id: 'atlas-root',
    type: 'ecosystem',
    label: 'ATLAS',
    reputation: 100,
    x: CX, y: CY,
    vx: 0, vy: 0,
    size: 22,
    color: '#00f0ff',
    fixed: true,
  });

  const ecoCount = Math.min(ecosystems.length, Math.floor(maxNodes * 0.15));
  for (let i = 0; i < ecoCount; i++) {
    const eco = ecosystems[i];
    const angle = (i / ecoCount) * Math.PI * 2;
    nodes.push({
      id: `eco-${eco}`,
      type: 'ecosystem',
      label: eco.charAt(0).toUpperCase() + eco.slice(1),
      reputation: 75 + Math.floor(Math.random() * 25),
      ecosystem: eco,
      x: CX + 130 * Math.cos(angle),
      y: CY + 130 * Math.sin(angle),
      vx: 0, vy: 0,
      size: 14,
      color: ECO_COLORS[eco] ?? '#8b5cf6',
    });
    edges.push({ source: 'atlas-root', target: `eco-${eco}`, strength: 0.8, type: 'attestation' });
  }

  const builderCount = maxNodes - nodes.length;
  for (let i = 0; i < builderCount; i++) {
    const industry = industries[i % industries.length];
    const eco = ecosystems[i % ecosystems.length];
    const angle = (i / builderCount) * Math.PI * 2;
    const r = 200 + Math.random() * 80;
    nodes.push({
      id: `builder-${i}`,
      type: 'builder',
      label: `B${String.fromCharCode(65 + (i % 26))}`,
      reputation: 30 + Math.floor(Math.random() * 70),
      industry,
      ecosystem: eco,
      x: CX + r * Math.cos(angle),
      y: CY + r * Math.sin(angle),
      vx: 0, vy: 0,
      size: 7 + Math.random() * 6,
      color: INDUSTRY_COLORS[industry],
    });
    if (nodes.find(n => n.id === `eco-${eco}`)) {
      edges.push({ source: `eco-${eco}`, target: `builder-${i}`, strength: 0.4, type: 'contribution' });
    }
  }

  return { nodes, edges };
}

// ─── Real data fetcher ────────────────────────────────────────────────────────

async function fetchRealGraphData(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[]; isLive?: boolean }> {
  try {
    const response = await fetch('/api/intelligence/telemetry');
    if (!response.ok) throw new Error(`Telemetry API: ${response.statusText}`);

    const data = await response.json();
    if (!data.success || !data.telemetry?.ecosystems) {
      return { ...generateDemoGraph(12), isLive: false };
    }

    const ecosystems: Record<string, { builders: number; proposals: number; status: string }> = data.telemetry.ecosystems;
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const W = 900;
    const H = 400;
    const CX = W / 2;
    const CY = H / 2;

    // Central hub
    nodes.push({
      id: 'atlas-root',
      type: 'ecosystem',
      label: 'ATLAS',
      reputation: 100,
      x: CX, y: CY,
      vx: 0, vy: 0,
      size: 22,
      color: '#00f0ff',
      fixed: true,
    });

    const activeEcos = Object.entries(ecosystems)
      .filter(([, eco]) => eco.status === 'synced' || eco.status === 'configured' || eco.proposals > 0);

    const ecoR = 120;
    activeEcos.forEach(([name, eco], idx) => {
      const angle = (idx / activeEcos.length) * Math.PI * 2;
      const ecoNodeId = `eco-${name}`;
      nodes.push({
        id: ecoNodeId,
        type: 'ecosystem',
        label: name.charAt(0).toUpperCase() + name.slice(1),
        reputation: Math.min(100, 50 + (eco.proposals ?? 0) * 2),
        ecosystem: name,
        x: CX + ecoR * Math.cos(angle),
        y: CY + ecoR * Math.sin(angle),
        vx: 0, vy: 0,
        size: 14 + Math.min((eco.proposals ?? 0) / 4, 10),
        color: ECO_COLORS[name] ?? '#8b5cf6',
      });
      edges.push({ source: 'atlas-root', target: ecoNodeId, strength: 0.8, type: 'attestation' });

      const builderCount = Math.min(eco.builders || 0, 4);
      for (let b = 0; b < builderCount; b++) {
        const bAngle = angle + (b - builderCount / 2) * 0.5;
        const bId = `builder-${name}-${b}`;
        nodes.push({
          id: bId,
          type: 'builder',
          label: `${name.slice(0, 3).toUpperCase()}-B${b + 1}`,
          reputation: 40 + Math.floor(Math.random() * 50),
          ecosystem: name,
          x: CX + (ecoR + 80) * Math.cos(bAngle),
          y: CY + (ecoR + 80) * Math.sin(bAngle),
          vx: 0, vy: 0,
          size: 7 + Math.random() * 5,
          color: ECO_COLORS[name] ?? '#3b82f6',
        });
        edges.push({ source: ecoNodeId, target: bId, strength: 0.4, type: 'contribution' });
      }
    });

    if (activeEcos.length === 0) return { ...generateDemoGraph(12), isLive: false };
    return { nodes, edges, isLive: true };
  } catch (error: any) {
    logger.error('NetworkGraph fetchRealGraphData:', error.message);
    return { ...generateDemoGraph(12), isLive: false };
  }
}

// ─── Physics simulation ───────────────────────────────────────────────────────

function applyPhysics(prev: GraphNode[], edges: GraphEdge[], W: number, H: number): GraphNode[] {
  const REPULSION   = 1200;
  const SPRING_K    = 0.04;
  const SPRING_LEN  = 110;
  const DAMPING     = 0.85;
  const MAX_SPEED   = 4;

  // Copy velocities
  const next = prev.map(n => ({ ...n }));

  // Repulsion (O(n²) ok for small graphs)
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const dx = next[i].x - next[j].x;
      const dy = next[i].y - next[j].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 5);
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!next[i].fixed) { next[i].vx += fx; next[i].vy += fy; }
      if (!next[j].fixed) { next[j].vx -= fx; next[j].vy -= fy; }
    }
  }

  // Spring forces (edges)
  for (const edge of edges) {
    const src = next.find(n => n.id === edge.source);
    const tgt = next.find(n => n.id === edge.target);
    if (!src || !tgt) continue;
    const dx = tgt.x - src.x;
    const dy = tgt.y - src.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const force = SPRING_K * (dist - SPRING_LEN) * edge.strength;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    if (!src.fixed) { src.vx += fx; src.vy += fy; }
    if (!tgt.fixed) { tgt.vx -= fx; tgt.vy -= fy; }
  }

  // Integrate
  const PAD = 30;
  for (const n of next) {
    if (n.fixed) continue;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    if (speed > MAX_SPEED) { n.vx = (n.vx / speed) * MAX_SPEED; n.vy = (n.vy / speed) * MAX_SPEED; }
    n.x = Math.max(PAD, Math.min(W - PAD, n.x + n.vx));
    n.y = Math.max(PAD, Math.min(H - PAD, n.y + n.vy));
  }

  return next;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NetworkGraph({ maxNodes = 15, animate = true }: NetworkGraphProps) {
  const [nodes, setNodes]           = useState<GraphNode[]>([]);
  const [edges, setEdges]           = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [isMobile, setIsMobile]     = useState(false);

  const rafRef      = useRef<number | null>(null);
  const nodesRef    = useRef<GraphNode[]>([]);
  const edgesRef    = useRef<GraphEdge[]>([]);
  const runningRef  = useRef(false);

  // Dimensions
  const W = isMobile ? 400 : 900;
  const H = isMobile ? 500 : 400;

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load graph data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const { nodes: n, edges: e, isLive } = await fetchRealGraphData();
    nodesRef.current = n;
    edgesRef.current = e;
    setNodes(n);
    setEdges(e);
    setIsLiveData(isLive ?? false);
    setSelectedNode(null);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData, maxNodes]);

  // Physics loop
  useEffect(() => {
    if (!animate || isLoading || nodes.length === 0) return;
    runningRef.current = true;

    const loop = () => {
      if (!runningRef.current) return;
      nodesRef.current = applyPhysics(nodesRef.current, edgesRef.current, W, H);
      setNodes([...nodesRef.current]);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate, isLoading, nodes.length, W, H]);

  // Sync edges ref
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // Stats
  const stats = {
    builders:    nodes.filter(n => n.type === 'builder').length,
    ecosystems:  nodes.filter(n => n.type === 'ecosystem').length,
    edges:       edges.length,
    avgRep:      nodes.length > 0
      ? Math.round(nodes.reduce((s, n) => s + n.reputation, 0) / nodes.length)
      : 0,
  };

  const nodeDetails = selectedNode ? (() => {
    const connectedEdges = edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id);
    const connectedIds = new Set<string>();
    const connectedNodes: GraphNode[] = [];
    for (const e of connectedEdges) {
      const cid = e.source === selectedNode.id ? e.target : e.source;
      const cn = nodes.find(n => n.id === cid);
      if (cn && !connectedIds.has(cn.id)) { connectedIds.add(cn.id); connectedNodes.push(cn); }
    }
    return {
      total: connectedEdges.length,
      contributions: connectedEdges.filter(e => e.type === 'contribution').length,
      collaborations: connectedEdges.filter(e => e.type === 'collaboration').length,
      connected: connectedNodes.slice(0, 3),
    };
  })() : null;

  return (
    <EmbeddedDisplay title="ATLAS NETWORK GRAPH" status="active">
      <div className="flex flex-col gap-0">

        {/* ── Stats bar ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 px-4 py-2 border-b border-gray-800/60 flex-wrap">
          {[
            { Icon: Users,    label: 'Builders',    value: stats.builders },
            { Icon: Network,  label: 'Ecosystems',  value: stats.ecosystems },
            { Icon: Target,   label: 'Edges',       value: stats.edges },
            { Icon: Cpu,      label: 'Avg Rep',     value: stats.avgRep },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </div>
              <span className="text-[11px] font-bold text-white font-mono">{value}</span>
            </div>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-[2px] flex items-center gap-1 ${
              isLiveData ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                         : 'bg-gray-800 text-gray-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLiveData ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
              {isLiveData ? 'LIVE DATA' : 'DEMO MODE'}
            </span>
            <button
              onClick={loadData}
              title="Refresh graph"
              className="p-1 rounded-[2px] hover:bg-white/5 transition-colors text-gray-600 hover:text-reactor-cyan"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── SVG Canvas ────────────────────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ height: H }}>
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-reactor-cyan/20 border-t-reactor-cyan rounded-full animate-spin" />
              <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
                LOADING NETWORK DATA...
              </span>
            </div>
          ) : (
            <svg
              width="100%"
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid background */}
              <defs>
                <pattern id="ng-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e2430" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={W} height={H} fill="url(#ng-grid)" opacity="0.4" />

              {/* Edges */}
              <g>
                {edges.map((edge, idx) => {
                  const src = nodes.find(n => n.id === edge.source);
                  const tgt = nodes.find(n => n.id === edge.target);
                  if (!src || !tgt) return null;
                  const color = edge.type === 'attestation' ? '#00f0ff'
                    : edge.type === 'collaboration' ? '#10b981'
                    : '#3b82f6';
                  return (
                    <line
                      key={`e-${idx}`}
                      x1={src.x} y1={src.y}
                      x2={tgt.x} y2={tgt.y}
                      stroke={color}
                      strokeWidth={edge.strength * 1.5}
                      strokeOpacity={0.25}
                    />
                  );
                })}
              </g>

              {/* Nodes */}
              <g>
                {nodes.map(node => {
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x},${node.y})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedNode(isSelected ? null : node)}
                      onMouseEnter={() => setSelectedNode(node)}
                      onMouseLeave={() => !isSelected && setSelectedNode(null)}
                    >
                      {/* Selection ring */}
                      {isSelected && (
                        <circle
                          r={node.size + 7}
                          fill="none"
                          stroke={node.color}
                          strokeWidth="1.5"
                          strokeOpacity="0.5"
                          strokeDasharray="4 3"
                        />
                      )}
                      {/* Glow for ecosystems */}
                      {node.type === 'ecosystem' && (
                        <circle r={node.size + 4} fill={node.color} opacity="0.08" />
                      )}
                      {/* Main circle */}
                      <circle
                        r={node.size}
                        fill={node.color}
                        fillOpacity={isSelected ? 0.95 : 0.7}
                        stroke={isSelected ? '#ffffff' : node.color}
                        strokeWidth={isSelected ? 2 : 1.5}
                        strokeOpacity={0.8}
                      />
                      {/* Inner letter */}
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={node.size > 14 ? 9 : 7}
                        fill="#ffffff"
                        fontWeight="700"
                        fontFamily="monospace"
                      >
                        {node.type === 'ecosystem' ? node.label.slice(0, 3).toUpperCase()
                          : node.type === 'builder' ? 'B' : 'P'}
                      </text>

                      {/* Ecosystem labels — always visible */}
                      {node.type === 'ecosystem' && (
                        <text
                          y={node.size + 11}
                          textAnchor="middle"
                          fontSize="8"
                          fill={node.color}
                          fontFamily="monospace"
                          fontWeight="600"
                          opacity="0.85"
                        >
                          {node.label.toUpperCase()}
                        </text>
                      )}

                      {/* Builder/project labels — only on select */}
                      {(isSelected && node.type !== 'ecosystem') && (
                        <g transform={`translate(0, ${node.size + 6})`}>
                          <rect
                            x="-22" y="-9" width="44" height="14"
                            rx="3" fill="rgba(0,0,0,0.85)"
                          />
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="8"
                            fill="#ffffff"
                            fontFamily="monospace"
                          >
                            {node.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Legend */}
              <g transform={`translate(16, ${H - 18})`}>
                {[
                  { color: '#00f0ff', label: 'Hub' },
                  { color: '#8b5cf6', label: 'Ecosystem' },
                  { color: '#3b82f6', label: 'Builder' },
                ].map(({ color, label }, i) => (
                  <g key={label} transform={`translate(${i * 80}, 0)`}>
                    <circle cx="0" cy="0" r="4" fill={color} fillOpacity="0.7" />
                    <text x="8" y="4" fontSize="8" fill="#6b7280" fontFamily="monospace">
                      {label}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          )}
        </div>

        {/* ── Info panel ────────────────────────────────────────────── */}
        <div className="border-t border-gray-800/60 px-4 py-3 min-h-[72px] flex items-start gap-6">
          {selectedNode ? (
            <>
              {/* Node identity */}
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedNode.color, boxShadow: `0 0 8px ${selectedNode.color}60` }}
                />
                <div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-0.5">
                    ENTITY
                  </div>
                  <div className="text-sm font-bold text-white font-mono tracking-wide">
                    {selectedNode.label}
                    <span className="text-[9px] text-gray-500 ml-2 font-normal">
                      ({selectedNode.type.toUpperCase()})
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-10 w-px bg-gray-800" />

              {/* Protocol */}
              <div>
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-0.5">
                  PROTOCOL
                </div>
                <div className="text-sm font-bold font-mono" style={{ color: selectedNode.color }}>
                  {selectedNode.ecosystem?.toUpperCase() ?? 'MULTI'}
                </div>
              </div>

              <div className="h-10 w-px bg-gray-800" />

              {/* Reputation */}
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">
                  REPUTATION_SCORE
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${selectedNode.reputation}%`,
                        backgroundColor: selectedNode.color,
                        boxShadow: `0 0 6px ${selectedNode.color}60`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-white font-mono w-8 text-right">
                    {selectedNode.reputation}
                  </span>
                </div>
              </div>

              <div className="h-10 w-px bg-gray-800" />

              {/* Connections */}
              {nodeDetails && (
                <div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-0.5">
                    NODE_CLASS
                  </div>
                  <div className="text-[10px] font-mono text-gray-300 space-y-0.5">
                    <div>Edges: <span className="text-white">{nodeDetails.total}</span></div>
                    <div>Contribs: <span className="text-reactor-cyan">{nodeDetails.contributions}</span></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 text-gray-600">
              <GitMerge className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase tracking-widest">
                Hover or click a node to inspect
              </span>
            </div>
          )}
        </div>

      </div>
    </EmbeddedDisplay>
  );
}