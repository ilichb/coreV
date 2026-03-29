'use client';

/**
 * Terminal Validator - Industrial Redesign
 * Conexión real con @andromeda/auto-validator
 */

'use client';

import React, { useState } from 'react';
import { validateForSubmission } from '../../lib/coordination/validators/functional-validator';
import {
  FileJson,
  Search,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  Activity,
  ArrowRight,
  Code,
  Zap,
  Lock
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ValidationResult {
  isValid: boolean;
  clarityDelta: number;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

interface TerminalValidatorProps {
  onValidationComplete?: (result: ValidationResult) => void;
}

export const TerminalValidator = ({ onValidationComplete }: TerminalValidatorProps) => {
  const t = useTranslations('TerminalValidator');
  const [scorecard, setScorecard] = useState<string>('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!scorecard.trim()) return;

    setLoading(true);
    // Simulate industrial scan delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const parsed = JSON.parse(scorecard);
      const validation = validateForSubmission(parsed);

      const resultWithTimestamp = {
        ...validation,
        timestamp: new Date().toISOString()
      };

      setResult(resultWithTimestamp);

      // Call the callback if provided
      if (onValidationComplete) {
        onValidationComplete(resultWithTimestamp);
      }
    } catch (error: any) {
      const errorResult = {
        isValid: false,
        clarityDelta: 0,
        errors: [`SYNTAX_ERROR: ${error.message}`],
        warnings: [],
        timestamp: new Date().toISOString()
      };

      setResult(errorResult);

      // Call the callback with error result
      if (onValidationComplete) {
        onValidationComplete(errorResult);
      }
    } finally {
      setLoading(false);
    }
  };

  const sampleScorecard = JSON.stringify({
    "A. Problema": {
      "clarity": 8, "coherence": 7, "completeness": 9,
      "content": { "descripcion": "Validación Core", "contexto": "Prueba", "impacto": "Alto" }
    },
    "B. Límites": {
      "clarity": 7, "coherence": 8, "completeness": 8,
      "content": { "presupuesto": "10k USDC", "tiempo": "30d" }
    },
    "C. Especificación": {
      "clarity": 9, "coherence": 8, "completeness": 9,
      "content": { "tecnologias": ["Next.js", "Supabase"], "seguridad": "EIP-712" }
    },
    "D. Esfuerzo": {
      "clarity": 8, "coherence": 7, "completeness": 8,
      "content": { "duracion": "3m", "equipo": "2 senior" }
    },
    metadata: {
      version: "1.0.0",
      created: new Date().toISOString(),
      authorDid: "did:andromeda:eth:0x0"
    }
  }, null, 2);

  return (
    <div className="space-y-6">
      <div className="panel p-6 bg-[#0d0f14]/80 backdrop-blur-xl group">
        <div className="panel-corner tl"></div>
        <div className="panel-corner tr"></div>
        <div className="panel-corner bl"></div>
        <div className="panel-corner br"></div>
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
          <Code className="w-24 h-24 text-reactor-cyan" />
        </div>

        <div className="flex items-center justify-between mb-8 border-b border-[#1e2430] pb-4">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-[1px] border shadow-inner transition-all duration-500 ${loading ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-reactor-cyan/5 border-[#1e2430]'}`}>
              <FileJson className={`w-5 h-5 ${loading ? 'text-amber-500 animate-pulse' : 'text-reactor-cyan opacity-80'}`} />
            </div>
            <div>
              <h3 className="title-orbitron text-xs font-bold text-gray-300 tracking-[0.3em] uppercase">
                {t('title')}
              </h3>
              <p className="text-[9px] text-mono font-bold text-gray-600 uppercase tracking-widest mt-1.5 opacity-60">
                {t('connected')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setScorecard(sampleScorecard)}
            className="text-[10px] text-mono font-bold text-reactor-cyan/50 hover:text-reactor-cyan transition-all uppercase tracking-[0.2em] border-b border-reactor-cyan/10 hover:border-reactor-cyan/40 pb-1"
          >
            {t('loadTemplate')}
          </button>
        </div>

        <div className="relative group/input">
          <div className="absolute top-4 left-4 flex items-center gap-2 opacity-30 group-focus-within/input:opacity-100 transition-opacity z-10 pointer-events-none">
            <Terminal className="w-3.5 h-3.5 text-reactor-cyan" />
            <span className="text-[9px] text-mono text-reactor-cyan uppercase tracking-[0.2em] font-bold">{t('rawCodeInjector')}</span>
          </div>
          <textarea
            value={scorecard}
            onChange={(e) => setScorecard(e.target.value)}
            className="w-full h-80 font-mono text-[11px] bg-black/40 text-gray-400 border border-[#1e2430] rounded-[1px] p-8 pt-14 focus:border-reactor-cyan/30 focus:ring-1 focus:ring-reactor-cyan/5 outline-none transition-all placeholder:text-gray-800 scrollbar-thin scrollbar-thumb-reactor-cyan/10"
            placeholder={t('placeholder')}
            spellCheck={false}
          />
        </div>

        <button
          onClick={handleValidate}
          disabled={loading || !scorecard.trim()}
          className={`w-full mt-6 flex items-center justify-center gap-3 py-4 border text-[11px] text-mono font-bold transition-all uppercase tracking-[0.4em] rounded-[1px] disabled:opacity-20 disabled:cursor-not-allowed group/btn overflow-hidden relative ${loading ? 'bg-amber-500/5 border-amber-500/20 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'bg-reactor-cyan/5 border-reactor-cyan/20 text-reactor-cyan hover:bg-reactor-cyan/10'
            }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
          {loading ? (
            <>
              <Activity className="w-4 h-4 animate-spin" />
              <span>{t('validating')}</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              {t('scrutinize')}
            </>
          )}
        </button>
      </div>

      {result && (
        <div className={`animate-in slide-in-from-bottom-4 duration-500 panel p-8 backdrop-blur-xl ${result.isValid ? 'bg-green-500/[0.02] border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.05)]' : 'bg-red-500/[0.02] border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)]'
          }`}>
          <div className="panel-corner tl"></div>
          <div className="panel-corner tr"></div>
          <div className="panel-corner bl"></div>
          <div className="panel-corner br"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-[#1e2430] pb-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-[1px] border shadow-inner ${result.isValid ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                {result.isValid ? (
                  <ShieldCheck className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                )}
              </div>
              <div>
                <h4 className={`title-orbitron text-xs font-bold uppercase tracking-[0.4em] ${result.isValid ? 'text-green-500' : 'text-red-500'}`}>
                  {result.isValid ? t('passed') : t('failed')}
                </h4>
                <p className="text-[9px] text-mono font-bold text-gray-600 uppercase tracking-widest mt-1.5 opacity-60">
                  {t('timestamp')}: {new Date(result.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-600 text-mono font-bold uppercase tracking-[0.2em] block mb-2 opacity-50">{t('clarityDelta')}</span>
              <div className="flex items-center gap-4">
                <div className="w-32 h-1.5 bg-black/60 border border-[#1e2430] rounded-[1px] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] ${result.clarityDelta > 0.8 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`}
                    style={{ width: `${result.clarityDelta * 100}%` }}
                  />
                </div>
                <span className={`title-orbitron text-2xl font-bold ${result.clarityDelta > 0.8 ? 'text-green-500' : 'text-amber-500'}`}>
                  {(result.clarityDelta * 100).toFixed(0)}<span className="text-xs opacity-40 ml-1">%</span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {result.errors.length > 0 && (
              <div className="panel p-5 bg-red-500/[0.02] border-red-500/10 rounded-[1px]">
                <h5 className="title-orbitron text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  {t('systemBlockers')} ({result.errors.length})
                </h5>
                <ul className="space-y-2.5">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-[10px] text-mono text-red-300/80 flex items-start gap-4 p-2.5 bg-red-500/[0.03] border border-red-500/5 hover:border-red-500/20 transition-all rounded-[1px]">
                      <span className="text-red-500 font-bold opacity-60 shrink-0 tracking-widest">0x{i.toString(16).padStart(2, '0')}</span>
                      <span className="leading-relaxed">{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="panel p-5 bg-amber-500/[0.02] border-amber-500/10 rounded-[1px]">
                <h5 className="title-orbitron text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  {t('anomalies')} ({result.warnings.length})
                </h5>
                <ul className="space-y-2.5">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-[10px] text-mono text-amber-300/80 flex items-start gap-4 p-2.5 bg-amber-500/[0.03] border border-amber-500/5 hover:border-amber-500/20 transition-all rounded-[1px]">
                      <span className="text-amber-600 font-bold opacity-60">{'>>'}</span>
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="panel p-5 bg-[#0d0f14] border-[#1e2430] flex items-center justify-between group hover:border-reactor-cyan/20 transition-all">
              <div className="flex items-center gap-5">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse" />
                <span className="text-[10px] text-mono font-bold text-gray-500 group-hover:text-gray-400 uppercase tracking-[0.3em] font-sans opacity-60">
                  {t('proofGenerated')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-mono font-bold text-reactor-cyan/40 uppercase tracking-widest hidden group-hover:block transition-all">SIGNING_EIP712</span>
                <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-reactor-cyan transition-all group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
