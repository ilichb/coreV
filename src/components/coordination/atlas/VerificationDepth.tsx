'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Shield,
  Users,
  Cpu,
  Brain,
  TrendingUp,
  FileCheck,
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { VerificationLevel } from '@/types/coordination/atlas';
import { useTranslations } from 'next-intl';
import { logger } from '../../../lib/utils/logger';

interface VerificationStats {
  totalMilestones: number;
  distributionByLevel: Record<number, number>;
  averageVerificationLevel: number;
  maxAttestations: number;
  minAttestations: number;
  levelBreakdown: Array<{
    level: number;
    name: string;
    count: number;
    percentage: number;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
  }>;
}

interface MilestoneSample {
  atlasId: string;
  verificationLevel: number;
  attestationCount: number;
  status: string;
  action: {
    type: string;
    descriptionKey: string;
  };
}

const getVerificationLevelInfo = (t: any) => [
  {
    level: 0,
    name: t('Levels.0.name'),
    icon: <FileCheck className="w-4 h-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    description: t('Levels.0.description')
  },
  {
    level: 1,
    name: t('Levels.1.name'),
    icon: <Users className="w-4 h-4" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    description: t('Levels.1.description')
  },
  {
    level: 2,
    name: t('Levels.2.name'),
    icon: <Cpu className="w-4 h-4" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    description: t('Levels.2.description')
  },
  {
    level: 3,
    name: t('Levels.3.name'),
    icon: <Brain className="w-4 h-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    description: t('Levels.3.description')
  }
];

const demoMilestones: MilestoneSample[] = [
  {
    atlasId: 'atlas:milestone:0xa3b8c7d9e2f1a4b5c6d7e8f9a0b1c2d3e4f5a6b',
    verificationLevel: 3,
    attestationCount: 6,
    status: 'VERIFIED',
    action: {
      type: 'CODE_CONTRIBUTION',
      descriptionKey: 'implementAction'
    }
  },
  {
    atlasId: 'atlas:milestone:0xb4c9d8e3f2a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9',
    verificationLevel: 2,
    attestationCount: 3,
    status: 'VERIFIED',
    action: {
      type: 'PROTOCOL_DESIGN',
      descriptionKey: 'designAction'
    }
  },
  {
    atlasId: 'atlas:milestone:0xc5dae9f4b3c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
    verificationLevel: 1,
    attestationCount: 2,
    status: 'VERIFIED',
    action: {
      type: 'SECURITY_AUDIT',
      descriptionKey: 'auditAction'
    }
  },
  {
    atlasId: 'atlas:milestone:0xd6ebf0c5d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3',
    verificationLevel: 0,
    attestationCount: 1,
    status: 'PENDING',
    action: {
      type: 'RESEARCH_PAPER',
      descriptionKey: 'researchAction'
    }
  },
  {
    atlasId: 'atlas:milestone:0xe7fc1d6e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
    verificationLevel: 2,
    attestationCount: 4,
    status: 'IMMUTABLE',
    action: {
      type: 'TECHNICAL_SPECIFICATION',
      descriptionKey: 'specAction'
    }
  },
  {
    atlasId: 'atlas:milestone:0xf8ed2e7f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5',
    verificationLevel: 1,
    attestationCount: 3,
    status: 'VERIFIED',
    action: {
      type: 'UI_UX_DESIGN',
      descriptionKey: 'uiuxAction'
    }
  }
];

function calculateStats(milestones: MilestoneSample[], t: any): VerificationStats {
  const total = milestones.length;
  const distribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

  milestones.forEach(m => {
    distribution[m.verificationLevel] = (distribution[m.verificationLevel] || 0) + 1;
  });

  const averageLevel = total > 0 ? milestones.reduce((sum, m) => sum + m.verificationLevel, 0) / total : 0;
  const attestationCounts = milestones.map(m => m.attestationCount);

  const levelBreakdown = getVerificationLevelInfo(t).map(info => ({
    ...info,
    count: distribution[info.level] || 0,
    percentage: total > 0 ? (distribution[info.level] || 0) / total * 100 : 0
  }));

  return {
    totalMilestones: total,
    distributionByLevel: distribution,
    averageVerificationLevel: averageLevel,
    maxAttestations: attestationCounts.length > 0 ? Math.max(...attestationCounts) : 0,
    minAttestations: attestationCounts.length > 0 ? Math.min(...attestationCounts) : 0,
    levelBreakdown
  };
}

export default function VerificationDepth() {
  const t = useTranslations('VerificationDepth');
  const [milestones, setMilestones] = useState<MilestoneSample[]>(demoMilestones);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<VerificationStats>(() => calculateStats(demoMilestones, t));
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Simular carga de datos reales
  useEffect(() => {
    const loadRealData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/atlas/search?limit=20');
        const data = await response.json();

        if (data.success && data.results.length > 0) {
          const realMilestones: MilestoneSample[] = data.results.map((item: any) => ({
            atlasId: item.atlasId,
            verificationLevel: item.verificationLevel || 0,
            attestationCount: item.attestationCount || 0,
            status: item.status || 'PENDING',
            action: {
              type: item.action?.type || 'UNKNOWN',
              descriptionKey: item.action?.descriptionKey || 'researchAction' // Fallback
            }
          }));

          setMilestones(realMilestones);
        }
      } catch (error) {
        logger.error('Error loading verification data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const hasMongoDB = true;
    if (!hasMongoDB) {
      loadRealData();
    }
  }, []);

  useEffect(() => {
    setStats(calculateStats(milestones, t));
  }, [milestones, t]);

  const filteredMilestones = selectedLevel !== null
    ? milestones.filter(m => m.verificationLevel === selectedLevel)
    : milestones.slice(0, 4);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 1: return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 2: return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 3: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IMMUTABLE': return 'text-green-500 bg-green-500/10';
      case 'VERIFIED': return 'text-blue-500 bg-blue-500/10';
      case 'PENDING': return 'text-yellow-500 bg-yellow-500/10';
      case 'CHALLENGED': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-reactor-cyan/10 border border-reactor-cyan/20 rounded-[2px]">
            <Layers className="w-5 h-5 text-reactor-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-mono-display font-bold text-gray-300 uppercase tracking-[0.2em]">
              {t('Header.title')}
            </h3>
            <p className="text-[9px] text-gray-600 font-mono-display uppercase tracking-[0.1em] mt-1">
              {t('Header.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[9px] text-gray-500 font-mono-display">
            <Shield className="w-3 h-3" />
            <span>{t('Header.total')}: {stats.totalMilestones}</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-reactor-cyan font-mono-display">
            <TrendingUp className="w-3 h-3" />
            <span>{t('Header.avg')}: {stats.averageVerificationLevel.toFixed(1)}/3</span>
          </div>
        </div>
      </div>

      {/* Verification Level Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.levelBreakdown.map(level => (
          <div
            key={level.level}
            className={`p-4 border rounded-[2px] cursor-pointer transition-all hover:opacity-90 ${level.bgColor} ${level.borderColor} ${selectedLevel === level.level ? 'ring-1 ring-white/20' : ''
              }`}
            onClick={() => setSelectedLevel(selectedLevel === level.level ? null : level.level)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-[2px] ${level.bgColor}`}>
                {level.icon}
              </div>
              <span className="text-[10px] font-mono-display text-gray-500 uppercase">
                LEVEL {level.level}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-lg font-mono-display font-bold text-white">
                {level.count}
                <span className={`text-sm ml-1 ${level.color}`}>
                  ({level.percentage.toFixed(0)}%)
                </span>
              </p>
              <p className="text-xs font-mono-display font-bold text-gray-300">
                {level.name}
              </p>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                {level.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Visualization */}
      <div className="bg-black/40 border border-white/5 p-5 rounded-[2px]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-mono-display font-bold text-gray-300 uppercase tracking-[0.1em]">
            {t('Distribution.title')}
          </h4>
          <div className="text-[9px] text-gray-500 font-mono-display">
            {selectedLevel !== null ? `${t('Distribution.filtered')} ${selectedLevel}` : t('Distribution.allLevels')}
          </div>
        </div>

        <div className="space-y-3">
          {stats.levelBreakdown.map(level => (
            <div key={level.level} className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono-display">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${level.color.replace('text-', 'bg-')}`} />
                  <span className="text-gray-400">{level.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-300">{level.count} {t('Distribution.milestones')}</span>
                  <span className={`${level.color}`}>{level.percentage.toFixed(0)}%</span>
                </div>
              </div>

              <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full ${level.color.replace('text-', 'bg-')} transition-all duration-1000`}
                  style={{ width: `${level.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Statistics Row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="text-center">
            <div className="text-2xl font-mono-display font-bold text-white">
              {stats.totalMilestones}
            </div>
            <div className="text-[10px] text-gray-500 font-mono-display mt-1">
              {t('Stats.totalMilestones')}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-mono-display font-bold text-reactor-cyan">
              {stats.averageVerificationLevel.toFixed(1)}
            </div>
            <div className="text-[10px] text-gray-500 font-mono-display mt-1">
              {t('Stats.averageLevel')}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-mono-display font-bold text-green-400">
              {stats.maxAttestations}
            </div>
            <div className="text-[10px] text-gray-500 font-mono-display mt-1">
              {t('Stats.maxAttestations')}
            </div>
          </div>
        </div>
      </div>

      {/* Sample Milestones */}
      <div className="bg-black/40 border border-white/5 rounded-[2px] overflow-hidden">
        <div className="bg-reactor-cyan/5 border-b border-reactor-cyan/10 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-4 h-4 text-reactor-cyan" />
              <span className="text-[10px] font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                {selectedLevel !== null ? t('Table.levelMilestones', { level: selectedLevel }) : t('Table.recentMilestones')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-500 font-mono-display">
                {filteredMilestones.length} {t('Table.of')} {milestones.length}
              </span>
              {isLoading && (
                <div className="w-3 h-3 border-t-2 border-reactor-cyan rounded-full animate-spin" />
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {filteredMilestones.map((milestone, index) => (
            <div key={milestone.atlasId} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[9px] font-mono-display px-2 py-0.5 rounded-[2px] ${getLevelColor(milestone.verificationLevel)}`}>
                      LEVEL {milestone.verificationLevel}
                    </span>
                    <span className={`text-[9px] font-mono-display px-2 py-0.5 rounded-[2px] ${getStatusColor(milestone.status)}`}>
                      {milestone.status}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono-display">
                      {milestone.attestationCount} {t('Table.attestations')}
                    </span>
                  </div>

                  <h5 className="text-[11px] font-mono-display font-bold text-gray-200 mb-1 uppercase tracking-wide truncate">
                    {milestone.action.type.replace('_', ' ')}
                  </h5>

                  <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">
                    {t(`DemoData.${milestone.action.descriptionKey}`)}
                  </p>

                  <div className="mt-2">
                    <p className="text-[9px] text-gray-600 font-mono-display truncate">
                      ID: {milestone.atlasId.substring(0, 32)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {milestone.verificationLevel >= 2 && (
                    <div className="p-1.5 bg-purple-500/10 border border-purple-500/20 rounded-[2px]">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                  )}
                  {milestone.verificationLevel >= 1 && (
                    <div className="p-1.5 bg-green-500/10 border border-green-500/20 rounded-[2px]">
                      <Users className="w-3.5 h-3.5 text-green-400" />
                    </div>
                  )}
                  <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-[2px]">
                    <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMilestones.length === 0 && (
          <div className="py-10 text-center">
            <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-mono-display">
              {t('Table.noResults')}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="bg-black/60 border-t border-white/5 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-[9px] text-gray-600 font-mono-display">
              <span className="text-reactor-cyan">{t('Footer.paper')}</span> — {t('Footer.protocol')}
            </div>
            <div className="flex items-center gap-4">
              {selectedLevel !== null && (
                <button
                  onClick={() => setSelectedLevel(null)}
                  className="text-[9px] font-mono-display text-gray-500 hover:text-gray-300 transition-colors uppercase"
                >
                  {t('Footer.clearFilter')}
                </button>
              )}
              <button
                onClick={() => setMilestones([...demoMilestones])}
                className="text-[9px] font-mono-display text-reactor-cyan hover:text-reactor-cyan/80 transition-colors uppercase"
              >
                {t('Footer.refreshData')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-black/40 border border-reactor-cyan/10 p-4 rounded-[2px]">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-reactor-cyan mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="text-[10px] font-mono-display font-bold text-gray-300 uppercase mb-1">
              {t('About.title')}
            </h5>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              {t('About.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}