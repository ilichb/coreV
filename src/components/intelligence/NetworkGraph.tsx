'use client';

import { useState, useEffect } from 'react';
import { Network, Cpu, Users, Target, GitMerge } from 'lucide-react';
import EmbeddedDisplay from '@/components/widgets/EmbeddedDisplay';
import { logger } from '../../lib/utils/logger';

// Tipos para datos de red
interface GraphNode {
  id: string;
  type: 'builder' | 'project' | 'ecosystem';
  label: string;
  reputation: number;
  industry?: string;
  ecosystem?: string;
  x?: number;
  y?: number;
  size: number;
  color: string;
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

// Colores por tipo de nodo
const NODE_COLORS = {
  builder: '#3b82f6', // Blue
  project: '#10b981', // Green
  ecosystem: '#8b5cf6', // Purple
};

// Colores por industria (basado en IndustrySelector)
const INDUSTRY_COLORS: Record<string, string> = {
  finance: '#ef4444', // Red
  infrastructure: '#f97316', // Orange
  media: '#eab308', // Yellow
  organizations: '#8b5cf6', // Purple
  rwa: '#84cc16', // Lime
  science: '#06b6d4', // Cyan
  energy: '#22c55e', // Green
  supplychain: '#0ea5e9', // Sky
  education: '#14b8a6', // Teal
  security: '#ec4899', // Pink
  ai: '#6366f1', // Indigo
};

// Generar datos demo para la red (solo como fallback)
function generateDemoGraph(maxNodes: number = 15): { nodes: GraphNode[], edges: GraphEdge[] } {
  const industries = Object.keys(INDUSTRY_COLORS);
  const ecosystems = ['ethereum', 'rootstock', 'solana', 'arbitrum', 'polkadot'];
  
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Generar nodos de builders (60%)
  const builderCount = Math.floor(maxNodes * 0.6);
  for (let i = 0; i < builderCount; i++) {
    const industry = industries[i % industries.length];
    const ecosystem = ecosystems[i % ecosystems.length];
    
    nodes.push({
      id: `builder-${i}`,
      type: 'builder',
      label: `Builder ${String.fromCharCode(65 + (i % 26))}`,
      reputation: 30 + Math.floor(Math.random() * 70),
      industry,
      ecosystem,
      size: 8 + Math.random() * 12,
      color: INDUSTRY_COLORS[industry],
    });
  }
  
  // Generar nodos de proyectos (30%)
  const projectCount = Math.floor(maxNodes * 0.3);
  for (let i = 0; i < projectCount; i++) {
    const industry = industries[(i + 2) % industries.length];
    const ecosystem = ecosystems[(i + 1) % ecosystems.length];
    
    nodes.push({
      id: `project-${i}`,
      type: 'project',
      label: `Project ${i + 1}`,
      reputation: 40 + Math.floor(Math.random() * 60),
      industry,
      ecosystem,
      size: 12 + Math.random() * 16,
      color: INDUSTRY_COLORS[industry],
    });
  }
  
  // Generar nodos de ecosistemas (10%)
  const ecosystemCount = Math.floor(maxNodes * 0.1);
  for (let i = 0; i < ecosystemCount; i++) {
    const ecosystem = ecosystems[i % ecosystems.length];
    
    nodes.push({
      id: `ecosystem-${ecosystem}`,
      type: 'ecosystem',
      label: ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1),
      reputation: 80 + Math.floor(Math.random() * 20),
      ecosystem,
      size: 20 + Math.random() * 10,
      color: NODE_COLORS.ecosystem,
    });
  }
  
  // Generar conexiones (edges)
  const maxEdges = Math.min(nodes.length * 3, 50);
  for (let i = 0; i < maxEdges; i++) {
    const sourceIdx = Math.floor(Math.random() * nodes.length);
    const targetIdx = Math.floor(Math.random() * nodes.length);
    
    if (sourceIdx !== targetIdx) {
      const source = nodes[sourceIdx];
      const target = nodes[targetIdx];
      
      // Evitar conexiones entre ecosistemas
      if (source.type === 'ecosystem' && target.type === 'ecosystem') continue;
      
      // Determinar tipo de conexión
      let type: GraphEdge['type'] = 'contribution';
      if (source.type === 'builder' && target.type === 'builder') type = 'collaboration';
      if (source.type === 'builder' && target.type === 'project') type = 'contribution';
      if (source.type === 'project' && target.type === 'ecosystem') type = 'attestation';
      
      edges.push({
        source: source.id,
        target: target.id,
        strength: 0.2 + Math.random() * 0.8,
        type,
      });
    }
  }
  
  // Posicionar nodos en un layout circular
  const centerX = 300;
  const centerY = 200;
  const radius = 180;
  
  nodes.forEach((node, index) => {
    const angle = (index * 2 * Math.PI) / nodes.length;
    const distance = radius * (0.3 + 0.7 * Math.random());
    
    node.x = centerX + distance * Math.cos(angle);
    node.y = centerY + distance * Math.sin(angle);
  });
  
  return { nodes, edges };
}

// Función para obtener datos reales de la API
async function fetchRealGraphData(): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }> {
  try {
    const response = await fetch('/api/intelligence/ecosystem?name=rootstock');
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transformar datos de la API a formato de grafo
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    
    // Ejemplo: Crear nodos basados en datos reales
    // Aquí deberíamos transformar los datos de la API en nodos y edges
    // Por ahora, retornamos datos demo si la API no tiene el formato esperado
    
    if (data.recent_projects && data.recent_projects.length > 0) {
      // Crear nodos para proyectos recientes
      data.recent_projects.forEach((project: any, index: number) => {
        nodes.push({
          id: `project-real-${project.id || index}`,
          type: 'project',
          label: project.name || `Project ${index + 1}`,
          reputation: project.trustScore || 50 + Math.floor(Math.random() * 50),
          industry: project.industry || 'infrastructure',
          ecosystem: 'rootstock',
          size: 12 + Math.random() * 16,
          color: INDUSTRY_COLORS[project.industry || 'infrastructure'] || NODE_COLORS.project,
        });
      });
    }
    
    if (data.top_builders && data.top_builders.length > 0) {
      // Crear nodos para builders top
      data.top_builders.forEach((builder: any, index: number) => {
        nodes.push({
          id: `builder-real-${builder.did || builder.id || index}`,
          type: 'builder',
          label: builder.name || `Builder ${String.fromCharCode(65 + index)}`,
          reputation: builder.reputation || 40 + Math.floor(Math.random() * 60),
          industry: builder.primary_industry || 'infrastructure',
          ecosystem: 'rootstock',
          size: 8 + Math.random() * 12,
          color: INDUSTRY_COLORS[builder.primary_industry || 'infrastructure'] || NODE_COLORS.builder,
        });
      });
    }
    
    // Si no hay datos reales, generar algunos mínimos
    if (nodes.length === 0) {
      return generateDemoGraph(8);
    }
    
    // Crear conexiones entre builders y proyectos
    const builderNodes = nodes.filter(n => n.type === 'builder');
    const projectNodes = nodes.filter(n => n.type === 'project');
    
    // Crear hasta 10 conexiones
    const maxConnections = Math.min(10, builderNodes.length * projectNodes.length);
    for (let i = 0; i < maxConnections; i++) {
      const builder = builderNodes[i % builderNodes.length];
      const project = projectNodes[i % projectNodes.length];
      
      edges.push({
        source: builder.id,
        target: project.id,
        strength: 0.5 + Math.random() * 0.5,
        type: 'contribution'
      });
    }
    
    // Posicionar nodos en un layout circular
    const centerX = 300;
    const centerY = 200;
    const radius = 180;
    
    nodes.forEach((node, index) => {
      const angle = (index * 2 * Math.PI) / nodes.length;
      const distance = radius * (0.3 + 0.7 * Math.random());
      
      node.x = centerX + distance * Math.cos(angle);
      node.y = centerY + distance * Math.sin(angle);
    });
    
    return { nodes, edges };
    
  } catch (error: any) {
    logger.error('Error fetching real graph data:', error.message);
    // Retornar datos demo como fallback
    return generateDemoGraph(8);
  }
}

export default function NetworkGraph({ maxNodes = 15, animate = true }: NetworkGraphProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  
  // Cargar datos demo o reales
  useEffect(() => {
    setIsLoading(true);
    
    // Simular carga de datos
    const timer = setTimeout(() => {
      const { nodes: demoNodes, edges: demoEdges } = generateDemoGraph(maxNodes);
      setNodes(demoNodes);
      setEdges(demoEdges);
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [maxNodes]);
  
  // Animación para nodos seleccionados
  useEffect(() => {
    if (!animate || !selectedNode) return;
    
    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => {
        if (node.id === selectedNode.id) {
          // Ligero pulso para el nodo seleccionado
          return {
            ...node,
            size: node.size * (0.95 + 0.1 * Math.sin(Date.now() / 500))
          };
        }
        return node;
      }));
    }, 50);
    
    return () => clearInterval(interval);
  }, [animate, selectedNode]);
  
  // Calcular estadísticas
  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    builderCount: nodes.filter(n => n.type === 'builder').length,
    projectCount: nodes.filter(n => n.type === 'project').length,
    ecosystemCount: nodes.filter(n => n.type === 'ecosystem').length,
    averageReputation: nodes.length > 0 
      ? Math.round(nodes.reduce((sum, n) => sum + n.reputation, 0) / nodes.length)
      : 0,
  };
  
  // Renderizar nodo
  const renderNode = (node: GraphNode) => {
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredEdge && (hoveredEdge.source === node.id || hoveredEdge.target === node.id);
    
    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        className="cursor-pointer transition-all duration-200"
        onClick={() => setSelectedNode(node)}
        onMouseEnter={() => setSelectedNode(node)}
        onMouseLeave={() => !isSelected && setSelectedNode(null)}
      >
        {/* Anillo de selección */}
        {isSelected && (
          <circle
            r={node.size + 6}
            fill="none"
            stroke={node.color}
            strokeWidth="2"
            strokeOpacity="0.4"
            className="animate-pulse"
          />
        )}
        
        {/* Nodo principal */}
        <circle
          r={node.size}
          fill={node.color}
          fillOpacity={isHovered ? 0.9 : 0.7}
          stroke={isSelected ? '#ffffff' : node.color}
          strokeWidth={isSelected ? 3 : 2}
          className="transition-all duration-200"
        />
        
        {/* Indicador de tipo */}
        {node.type === 'builder' && (
          <text
            y="-2"
            textAnchor="middle"
            fontSize="10"
            fill="#ffffff"
            fontWeight="bold"
            className="select-none"
          >
            B
          </text>
        )}
        {node.type === 'project' && (
          <text
            y="-2"
            textAnchor="middle"
            fontSize="10"
            fill="#ffffff"
            fontWeight="bold"
            className="select-none"
          >
            P
          </text>
        )}
        {node.type === 'ecosystem' && (
          <text
            y="-2"
            textAnchor="middle"
            fontSize="10"
            fill="#ffffff"
            fontWeight="bold"
            className="select-none"
          >
            E
          </text>
        )}
        
        {/* Etiqueta (solo en hover/selección) */}
        {(isSelected || isHovered) && (
          <g transform="translate(0, 20)">
            <rect
              x="-30"
              y="-12"
              width="60"
              height="16"
              rx="4"
              fill="rgba(0, 0, 0, 0.8)"
              className="transition-opacity duration-200"
            />
            <text
              y="2"
              textAnchor="middle"
              fontSize="10"
              fill="#ffffff"
              className="select-none"
            >
              {node.label}
            </text>
          </g>
        )}
      </g>
    );
  };
  
  // Renderizar conexión
  const renderEdge = (edge: GraphEdge, index: number) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode || !sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) {
      return null;
    }
    
    const isHovered = hoveredEdge === edge;
    const strokeColor = edge.type === 'contribution' 
      ? '#3b82f6' 
      : edge.type === 'collaboration' 
        ? '#10b981' 
        : '#8b5cf6';
    
    return (
      <line
        key={`edge-${index}`}
        x1={sourceNode.x}
        y1={sourceNode.y}
        x2={targetNode.x}
        y2={targetNode.y}
        stroke={strokeColor}
        strokeWidth={isHovered ? 3 : edge.strength * 2}
        strokeOpacity={isHovered ? 0.8 : 0.3}
        className="transition-all duration-200 cursor-pointer"
        onMouseEnter={() => setHoveredEdge(edge)}
        onMouseLeave={() => setHoveredEdge(null)}
      />
    );
  };
  
  // Obtener detalles del nodo seleccionado
  const getNodeDetails = (node: GraphNode) => {
    const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
    
    // Obtener nodos conectados, filtrando undefined y eliminando duplicados
    const connectedNodeIds = new Set<string>();
    const connectedNodes: GraphNode[] = [];
    
    for (const edge of connectedEdges) {
      const connectedId = edge.source === node.id ? edge.target : edge.source;
      const connectedNode = nodes.find(n => n.id === connectedId);
      
      if (connectedNode && !connectedNodeIds.has(connectedNode.id)) {
        connectedNodeIds.add(connectedNode.id);
        connectedNodes.push(connectedNode);
      }
    }
    
    return {
      node,
      connectedCount: connectedEdges.length,
      connectedNodes: connectedNodes.slice(0, 3),
      contributionCount: connectedEdges.filter(e => e.type === 'contribution').length,
      collaborationCount: connectedEdges.filter(e => e.type === 'collaboration').length,
    };
  };
  
  const nodeDetails = selectedNode ? getNodeDetails(selectedNode) : null;
  
  return (
    <EmbeddedDisplay 
      title="ATLAS NETWORK GRAPH" 
      status="active"
      className="min-h-[500px]"
    >
      <div className="p-4">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-black/20 rounded-[2px] p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-3 h-3 text-reactor-cyan" />
              <span className="text-xs text-gray-500 font-mono-display">Builders</span>
            </div>
            <div className="text-xl font-bold text-white font-mono-display">{stats.builderCount}</div>
          </div>
          <div className="bg-black/20 rounded-[2px] p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-3 h-3 text-green-400" />
              <span className="text-xs text-gray-500 font-mono-display">Projects</span>
            </div>
            <div className="text-xl font-bold text-white font-mono-display">{stats.projectCount}</div>
          </div>
          <div className="bg-black/20 rounded-[2px] p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Network className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-gray-500 font-mono-display">Edges</span>
            </div>
            <div className="text-xl font-bold text-white font-mono-display">{stats.totalEdges}</div>
          </div>
          <div className="bg-black/20 rounded-[2px] p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Cpu className="w-3 h-3 text-yellow-400" />
              <span className="text-xs text-gray-500 font-mono-display">Avg Rep</span>
            </div>
            <div className="text-xl font-bold text-white font-mono-display">{stats.averageReputation}</div>
          </div>
        </div>
        
        {/* Gráfico de red */}
        <div className="relative border border-reactor-cyan/20 rounded-[2px] bg-black/40 mb-4 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-[350px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-reactor-cyan mx-auto mb-2"></div>
                <div className="text-xs text-gray-500 font-mono-display">LOADING NETWORK DATA...</div>
              </div>
            </div>
          ) : (
            <svg width="100%" height="350" className="select-none">
              {/* Conexiones */}
              <g>
                {edges.map((edge, index) => renderEdge(edge, index))}
              </g>
              
              {/* Nodos */}
              <g>
                {nodes.map(renderNode)}
              </g>
              
              {/* Leyenda */}
              <g transform="translate(20, 320)">
                <circle cx="0" cy="0" r="4" fill="#3b82f6" />
                <text x="10" y="4" fontSize="10" fill="#9ca3af" className="font-mono-display">
                  Builder
                </text>
                
                <circle cx="70" cy="0" r="4" fill="#10b981" />
                <text x="80" y="4" fontSize="10" fill="#9ca3af" className="font-mono-display">
                  Project
                </text>
                
                <circle cx="140" cy="0" r="4" fill="#8b5cf6" />
                <text x="150" y="4" fontSize="10" fill="#9ca3af" className="font-mono-display">
                  Ecosystem
                </text>
              </g>
            </svg>
          )}
          
          {/* Indicador de modo demo */}
          <div className="absolute top-2 right-2">
            <div className="text-[10px] text-gray-500 font-mono-display bg-black/60 px-2 py-1 rounded-[2px]">
              DEMO MODE
            </div>
          </div>
        </div>
        
        {/* Panel de detalles */}
        <div className="grid grid-cols-3 gap-4">
          {/* Información del nodo seleccionado */}
          <div className="col-span-2">
            <div className="text-xs text-gray-500 font-mono-display mb-2">SELECTED NODE</div>
            {selectedNode ? (
              <div className="bg-black/20 rounded-[2px] p-3">
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: selectedNode.color }}
                  />
                  <div>
                    <div className="text-sm font-bold text-white">
                      {selectedNode.label}
                      <span className="ml-2 text-xs text-gray-500 font-mono-display">
                        ({selectedNode.type.toUpperCase()})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono-display">
                      ID: {selectedNode.id}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="text-xs">
                    <span className="text-gray-500">Reputation:</span>
                    <span className="ml-2 text-white font-bold">{selectedNode.reputation}</span>
                  </div>
                  {selectedNode.industry && (
                    <div className="text-xs">
                      <span className="text-gray-500">Industry:</span>
                      <span className="ml-2 text-white">{selectedNode.industry}</span>
                    </div>
                  )}
                  {selectedNode.ecosystem && (
                    <div className="text-xs">
                      <span className="text-gray-500">Ecosystem:</span>
                      <span className="ml-2 text-white">{selectedNode.ecosystem}</span>
                    </div>
                  )}
                </div>
                
                {nodeDetails && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-gray-500 mb-1">CONNECTIONS</div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs">
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-2 text-white font-bold">{nodeDetails.connectedCount}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Contributions:</span>
                        <span className="ml-2 text-blue-400">{nodeDetails.contributionCount}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Collaborations:</span>
                        <span className="ml-2 text-green-400">{nodeDetails.collaborationCount}</span>
                      </div>
                    </div>
                    
                    {nodeDetails.connectedNodes.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] text-gray-500 mb-1">CONNECTED TO:</div>
                        <div className="flex flex-wrap gap-1">
                          {nodeDetails.connectedNodes.map(node => (
                            <div 
                              key={node.id}
                              className="text-[10px] px-2 py-1 rounded-[2px] bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                              onClick={() => setSelectedNode(node)}
                            >
                              {node.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-black/20 rounded-[2px] p-3 text-center">
                <div className="text-sm text-gray-500 font-mono-display">
                  Select a node to view details
                </div>
                <div className="text-[10px] text-gray-600 mt-1">
                  Click or hover over any node in the graph
                </div>
              </div>
            )}
          </div>
          
          {/* Controles */}
          <div>
            <div className="text-xs text-gray-500 font-mono-display mb-2">CONTROLS</div>
            <div className="space-y-2">
              <button 
                className="w-full text-xs font-mono-display bg-reactor-cyan/10 hover:bg-reactor-cyan/20 border border-reactor-cyan/30 text-reactor-cyan px-3 py-2 rounded-[2px] transition-colors"
                onClick={() => {
                  const { nodes: newNodes, edges: newEdges } = generateDemoGraph(maxNodes);
                  setNodes(newNodes);
                  setEdges(newEdges);
                  setSelectedNode(null);
                }}
              >
                REGENERATE GRAPH
              </button>
              
              <div className="bg-black/20 rounded-[2px] p-3">
                <div className="text-[10px] text-gray-500 mb-1">FILTER BY TYPE</div>
                <div className="space-y-1">
                  {['builder', 'project', 'ecosystem'].map(type => (
                    <label key={type} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        className="w-3 h-3 accent-reactor-cyan"
                      />
                      <span className="capitalize">{type}s</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="text-[10px] text-gray-600 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <GitMerge className="w-3 h-3" />
                  <span>Network Graph v1.0</span>
                </div>
                <div>Shows builder-project relationships</div>
                <div className="mt-1 text-[9px] text-gray-700">
                  Data source: MongoDB Atlas (demo mode)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EmbeddedDisplay>
  );
}