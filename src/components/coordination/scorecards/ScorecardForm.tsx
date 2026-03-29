'use client';

import React, { useState } from 'react';
import { ShieldCheck, Crosshair, Cpu, Gauge, Save, ChevronRight, ChevronLeft, AlertTriangle, Activity, Lock, CheckCircle2, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import useAndromedaWallet from '@/hooks/useAndromedaWallet';
import IndustrySelector from './IndustrySelector';
import { IndustryTaxonomy } from '@/lib/industries/validator';
import { logger } from '../../../lib/utils/logger';

export default function ScorecardForm({ isUnlocked = true }: { isUnlocked?: boolean }) {
  const t = useTranslations('ScorecardForm');
  const tCommon = useTranslations('common');
  const tScorecard = useTranslations('scorecard');
  const tActions = useTranslations('actions');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    problem: {
      definition: '',
      affectedUsers: [''],
      painPoints: [''],
      currentSituation: ''
    },
    boundaries: {
      includes: [''],
      excludes: [''],
      assumptions: ['']
    },
    technicalSpec: {
      dependencies: [],
      knownRisks: [''],
      complexity: 'medium',
      teamType: 'small'
    },
    effort: {
      timeRange: { min: 1, max: 4 },
      resourceRange: { min: 1000, max: 10000 },
      milestones: ['']
    },
    notifications: {
      telegramUsername: '',
      email: ''
    }
  });
  const [taxonomy, setTaxonomy] = useState<IndustryTaxonomy | undefined>(undefined);

  const [validation, setValidation] = useState<{
    isValid: boolean;
    score: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiTest, setApiTest] = useState<any>(null);
  const wallet = useAndromedaWallet();
  const [submissionProof, setSubmissionProof] = useState<{ id: string, signature: string, hash: string } | null>(null);

  const handleNext = () => step < 6 && setStep(step + 1);
  const handlePrev = () => step > 1 && setStep(step - 1);

  const handleValidate = async () => {
    try {
      const response = await fetch('/api/coordination/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setValidation(data.validation);
        setApiTest({ type: 'validate', data });
      }
    } catch (error) {
      logger.error('Error validando:', error);
    }
  };

  const handleSubmit = async () => {
    if (!wallet.isConnected) {
      alert(t('alerts.requiredIdentity'));
      return;
    }

    setIsSubmitting(true);
    setSubmissionProof(null);

    try {
      // 1. Prepare payload with taxonomy
      const payload = {
        ...formData,
        ...(taxonomy && { taxonomy })
      };

      // 2. Generate Challenge
      const challengeMsg = `ANDROMEDA_CORE_PUBLISH_PROTOCOL_${Date.now()}\nPayload: ${JSON.stringify(payload).substring(0, 50)}...`;

      // 3. Cryptographic Signature
      const signResult = await wallet.signChallenge(challengeMsg);

      // 4. Submit to Registry
      const response = await fetch('/api/coordination/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scorecard: payload,
          signatureData: {
            signature: signResult.signature,
            address: signResult.address,
            did: signResult.did
          },
          telegramUsername: formData.notifications.telegramUsername,
          email: formData.notifications.email
        })
      });

      const data = await response.json();
      setApiTest({ type: 'publish', data });

      if (data.success) {
        setSubmissionProof({
          id: data.registrationId || data.scorecardId,
          signature: signResult.signature,
          hash: data.ipfsCid || '0x' + Math.random().toString(16).slice(2)
        });
      }
    } catch (error: any) {
      logger.error('Error en publicación:', error);
      alert(t('alerts.publishError') + (error.message || 'Unknown protocol failure'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const testChallengeAPI = async () => {
    const addr = wallet.address || '0x123';
    const response = await fetch(`/api/coordination/challenge?address=${addr}`);
    const data = await response.json();
    setApiTest({ type: 'challenge', data });
  };

  const steps = [
    { id: 1, label: t('steps.problem'), icon: Crosshair },
    { id: 2, label: t('steps.boundaries'), icon: ShieldCheck },
    { id: 3, label: t('steps.technical'), icon: Cpu },
    { id: 4, label: t('steps.effort'), icon: Gauge },
    { id: 5, label: t('steps.industry'), icon: Tag },
    { id: 6, label: t('steps.notify'), icon: Activity },
  ];

  return (
    <div className="p-8">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-10 border-b border-reactor-cyan/10 pb-6">
        <div>
          <h2 className="text-xl font-mono-display font-bold text-gray-100 tracking-[0.2em] mb-1 uppercase">
            {tScorecard('title')}
          </h2>
          <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest leading-none">
            {tScorecard('subtitle')}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={testChallengeAPI}
            className="px-4 py-2 bg-purple-500/10 border border-purple-500/40 text-[10px] font-mono-display font-bold text-gray-300 hover:text-purple-400 hover:bg-purple-500/20 transition-all uppercase tracking-widest rounded-[2px]"
          >
            {tActions('testChallenge')}
          </button>
          <button
            onClick={handleValidate}
            className="px-4 py-2 bg-reactor-cyan/10 border border-reactor-cyan/40 text-[10px] font-mono-display font-bold text-gray-300 hover:text-reactor-cyan hover:bg-reactor-cyan/20 transition-all uppercase tracking-widest rounded-[2px]"
          >
            {tActions('testValidation')}
          </button>
        </div>
      </div>

      {/* API Feedback Container */}
      {apiTest && (
        <div className="mb-8 p-4 bg-black/60 border border-reactor-cyan/20 rounded-[2px] animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan animate-pulse" />
            <h4 className="text-[10px] font-mono-display font-bold text-reactor-cyan uppercase tracking-widest">
              API_GATEWAY_RESPONSE_STAMP // {apiTest.type.toUpperCase()}
            </h4>
          </div>
          <pre className="text-[10px] text-gray-400 font-mono-display bg-black/40 p-3 overflow-auto max-h-40 custom-scrollbar border border-white/5">
            {JSON.stringify(apiTest.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Industrial Step Indicator */}
      <div className="grid grid-cols-6 gap-3 mb-12">
        {steps.map((s) => (
          <div
            key={s.id}
            className={`relative p-4 border transition-all duration-300 rounded-[2px] ${step >= s.id
              ? 'bg-reactor-cyan/5 border-reactor-cyan/30 text-reactor-cyan'
              : 'bg-black/20 border-white/5 text-gray-600'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono-display font-bold tracking-widest leading-none">{tScorecard('step').toUpperCase()}_{s.id.toString().padStart(2, '0')}</span>
              <s.icon className={`w-4 h-4 ${step >= s.id ? 'opacity-100 shadow-[0_0_8px_rgba(0,240,255,0.4)]' : 'opacity-30'}`} />
            </div>
            <span className="text-[10px] font-mono-display font-bold uppercase tracking-widest">{s.label}</span>
            {step === s.id && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-reactor-cyan shadow-[0_0_10px_rgba(0,240,255,0.6)]" />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="min-h-[300px] mb-12 bg-black/20 border border-white/5 p-6 rounded-[2px] relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        {step === 1 && (
          <div className="relative z-10 space-y-4 animate-in fade-in duration-500">
            <label className="text-[11px] font-mono-display font-bold text-gray-400 uppercase tracking-widest">{t('sections.problemLabel')}</label>
            <textarea
              className="w-full bg-black/40 border border-white/10 rounded-[2px] p-4 text-sm font-mono-display text-gray-100 placeholder:text-gray-700 focus:border-reactor-cyan/50 focus:ring-1 focus:ring-reactor-cyan/20 outline-none transition-all h-32 custom-scrollbar"
              placeholder={t('sections.problemPlaceholder')}
              value={formData.problem.definition}
              onChange={(e) => setFormData({
                ...formData,
                problem: { ...formData.problem, definition: e.target.value }
              })}
            />
          </div>
        )}

        {step === 2 && (
          <div className="relative z-10 space-y-4 animate-in fade-in duration-500">
            <label className="text-[11px] font-mono-display font-bold text-gray-400 uppercase tracking-widest">{t('sections.boundariesLabel')}</label>
            <textarea
              className="w-full bg-black/40 border border-white/10 rounded-[2px] p-4 text-sm font-mono-display text-gray-100 placeholder:text-gray-700 focus:border-reactor-cyan/50 focus:ring-1 focus:ring-reactor-cyan/20 outline-none transition-all h-32 custom-scrollbar"
              placeholder={t('sections.boundariesPlaceholder')}
              value={formData.boundaries.includes[0]}
              onChange={(e) => setFormData({
                ...formData,
                boundaries: { ...formData.boundaries, includes: [e.target.value] }
              })}
            />
          </div>
        )}

        {step === 3 && (
          <div className="relative z-10 space-y-4 animate-in fade-in duration-500">
            <label className="text-[11px] font-mono-display font-bold text-gray-400 uppercase tracking-widest">{t('sections.technicalLabel')}</label>
            <textarea
              className="w-full bg-black/40 border border-white/10 rounded-[2px] p-4 text-sm font-mono-display text-gray-100 placeholder:text-gray-700 focus:border-reactor-cyan/50 focus:ring-1 focus:ring-reactor-cyan/20 outline-none transition-all h-32 custom-scrollbar"
              placeholder={t('sections.technicalPlaceholder')}
              value={formData.technicalSpec.knownRisks[0]}
              onChange={(e) => setFormData({
                ...formData,
                technicalSpec: { ...formData.technicalSpec, knownRisks: [e.target.value] }
              })}
            />
          </div>
        )}

        {step === 4 && (
          <div className="relative z-10 space-y-6 animate-in fade-in duration-500">
            <label className="text-[11px] font-mono-display font-bold text-gray-400 uppercase tracking-widest">{t('sections.effortLabel')}</label>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest">{t('sections.minDuration')}</label>
                <input
                  type="number"
                  className="w-full bg-black/40 border border-white/10 rounded-[2px] p-3 text-sm font-mono-display text-reactor-cyan outline-none focus:border-reactor-cyan/50 tabular-nums"
                  value={formData.effort.timeRange.min}
                  onChange={(e) => setFormData({
                    ...formData,
                    effort: { ...formData.effort, timeRange: { ...formData.effort.timeRange, min: parseInt(e.target.value) } }
                  })}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest">{t('sections.maxDuration')}</label>
                <input
                  type="number"
                  className="w-full bg-black/40 border border-white/10 rounded-[2px] p-3 text-sm font-mono-display text-reactor-cyan outline-none focus:border-reactor-cyan/50 tabular-nums"
                  value={formData.effort.timeRange.max}
                  onChange={(e) => setFormData({
                    ...formData,
                    effort: { ...formData.effort, timeRange: { ...formData.effort.timeRange, max: parseInt(e.target.value) } }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="relative z-10 space-y-8 animate-in fade-in duration-500">
            {/* Sección de taxonomía */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-reactor-cyan/10 border border-reactor-cyan/20 rounded-[2px]">
                  <Tag className="w-5 h-5 text-reactor-cyan" />
                </div>
                <div>
                  <label className="text-[11px] font-mono-display font-bold text-gray-100 uppercase tracking-widest block">{t('sections.industryLabel')}</label>
                  <p className="text-[9px] text-gray-500 font-mono-display uppercase tracking-widest mt-0.5">{t('sections.industryDescription')}</p>
                </div>
              </div>

              <IndustrySelector
                value={taxonomy}
                onChange={setTaxonomy}
                showTransversalLayers={true}
                required={false}
                label={tCommon('selectIndustry')}
              />
            </div>

            {/* Sección de notificación */}
            <div className="space-y-6 pt-8 border-t border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-reactor-cyan/10 border border-reactor-cyan/20 rounded-[2px]">
                  <Activity className="w-5 h-5 text-reactor-cyan animate-pulse" />
                </div>
                <div>
                  <label className="text-[11px] font-mono-display font-bold text-gray-100 uppercase tracking-widest block">{t('sections.notifyLabel')}</label>
                  <p className="text-[9px] text-gray-500 font-mono-display uppercase tracking-widest mt-0.5">{t('sections.notifyDescription')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-400 font-mono-display uppercase tracking-widest font-bold">{t('sections.telegramLabel')}</label>
                    <span className="text-[8px] text-reactor-cyan/60 font-mono-display uppercase tracking-tighter">{t('sections.telegramRequired')}</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-reactor-cyan font-bold">@</div>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-reactor-cyan/20 rounded-[2px] p-4 pl-10 text-sm font-mono-display text-gray-100 placeholder:text-gray-700 focus:border-reactor-cyan outline-none transition-all"
                      placeholder={t('sections.usernamePlaceholder')}
                      value={formData.notifications.telegramUsername}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, telegramUsername: e.target.value.replace('@', '') }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-400 font-mono-display uppercase tracking-widest font-bold">{t('sections.emailLabel')}</label>
                    <span className="text-[8px] text-gray-600 font-mono-display uppercase tracking-tighter">{tCommon('optional')}</span>
                  </div>
                  <input
                    type="email"
                    className="w-full bg-black/40 border border-white/10 rounded-[2px] p-4 text-sm font-mono-display text-gray-100 placeholder:text-gray-700 focus:border-reactor-cyan/50 outline-none transition-all"
                    placeholder={t('sections.emailPlaceholder')}
                    value={formData.notifications.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, email: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="p-4 bg-reactor-cyan/5 border border-reactor-cyan/10 rounded-[2px]">
                <p className="text-[9px] text-reactor-cyan/80 font-mono-display leading-relaxed uppercase tracking-wider">
                  {t('sections.systemUpdates')} <br />
                  - {t('sections.update1')} <br />
                  - {t('sections.update2')} <br />
                  - {t('sections.update3')} <br />
                  - {t('sections.update4')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-8 border-t border-reactor-cyan/10">
        <button
          onClick={handlePrev}
          disabled={step === 1}
          className="group flex items-center gap-3 px-6 py-3 border border-gray-600 bg-white/5 rounded-[2px] font-mono-display text-[10px] font-bold text-gray-100 hover:text-reactor-cyan hover:border-reactor-cyan/50 hover:bg-reactor-cyan/5 transition-all uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {t('navigation.prev')}
        </button>

        <div className="flex gap-4">
          <button
            onClick={handleValidate}
            className="px-8 py-3 bg-black/60 border border-reactor-cyan/50 text-gray-100 font-mono-display text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-reactor-cyan/10 hover:text-reactor-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all rounded-[2px]"
          >
            {t('navigation.validate')}
          </button>

          {step < 6 ? (
            <button
              onClick={handleNext}
              className="group flex items-center gap-3 px-10 py-3 bg-black/80 border border-reactor-cyan text-gray-100 font-mono-display text-xs font-bold uppercase tracking-[0.2em] hover:bg-reactor-cyan hover:text-black hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-[0.98] transition-all rounded-[2px]"
            >
              {t('navigation.next')}
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isUnlocked}
              className="group flex items-center gap-3 px-10 py-3 bg-black/80 border border-green-500 text-gray-100 font-mono-display text-xs font-bold uppercase tracking-[0.2em] hover:bg-green-500 hover:text-black hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] active:scale-[0.98] transition-all rounded-[2px] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  {t('navigation.processing')}
                </>
              ) : !isUnlocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  LOCKED_BY_X402
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('navigation.submit')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Industrial Submission Proof / Certificate */}
      {submissionProof && (
        <div className="mt-8 relative animate-in zoom-in-95 duration-700">
          {/* Scanline Effect */}
          <div className="absolute inset-0 bg-scanline pointer-events-none opacity-10" />

          <div className="bg-green-500/5 border border-green-500/30 p-8 rounded-[2px] backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8 border-b border-green-500/10 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-mono-display font-bold text-gray-100 tracking-[0.2em] uppercase">{t('proof.title')}</h3>
                  <p className="text-[10px] text-green-500/60 font-mono-display uppercase tracking-widest mt-1">
                    {t('proof.settlement')} // {t('proof.locked')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-500 font-mono-display uppercase tracking-widest block mb-1">{t('proof.registrationId')}</span>
                <span className="text-lg font-mono-display font-bold text-gray-100">#{submissionProof.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] text-gray-600 font-mono-display uppercase tracking-widest block mb-2 font-bold">{t('proof.signature')}</label>
                  <div className="bg-black/60 border border-white/5 p-4 rounded-[1px]">
                    <p className="text-[10px] font-mono text-green-500/80 break-all leading-relaxed">
                      {submissionProof.signature}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-green-500/40 italic">
                  <Lock className="w-3 h-3" />
                  <span className="text-[8px] font-mono-display uppercase tracking-tighter">{t('proof.verifiedBy')}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] text-gray-600 font-mono-display uppercase tracking-widest block mb-2 font-bold">{t('proof.hash')}</label>
                  <div className="bg-black/60 border border-white/5 p-4 rounded-[1px] flex items-center justify-between">
                    <p className="text-[11px] font-mono text-reactor-cyan font-bold break-all">
                      {submissionProof.hash}
                    </p>
                    <Activity className="w-4 h-4 text-reactor-cyan animate-pulse" />
                  </div>
                </div>

                <div className="bg-white/5 p-4 border border-white/5 rounded-[1px] flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-reactor-cyan" />
                    <span className="text-[10px] font-mono-display text-gray-400 uppercase tracking-widest">{t('proof.viewIpfs')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-700" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 pt-8 border-t border-green-500/10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[9px] font-mono-display text-gray-600 uppercase tracking-[0.2em]">{t('proof.consensus')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[9px] font-mono-display text-gray-600 uppercase tracking-[0.2em]">{t('proof.metadata')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[9px] font-mono-display text-gray-600 uppercase tracking-[0.2em]">{t('proof.signatureValid')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Industrial Validation Results */}
      {validation && (
        <div className={`mt-8 p-6 rounded-[2px] border animate-in slide-in-from-bottom duration-500 ${validation.isValid
          ? 'bg-green-500/5 border-green-500/20'
          : 'bg-red-500/5 border-red-500/20'
          }`}>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-[2px] ${validation.isValid ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {validation.isValid ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>

            <div className="flex-1">
              <h3 className="text-xs font-mono-display font-bold uppercase tracking-[0.2em] mb-4">
                {t('report.title')} // STATUS: {validation.isValid ? t('report.passed') : t('report.failed')}
              </h3>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <p className="text-[9px] text-gray-500 font-mono-display uppercase tracking-widest mb-1">{t('report.score')}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono-display font-bold text-gray-100 tabular-nums">{validation.score}</span>
                    <span className={`text-xs font-mono-display font-bold ${validation.isValid ? 'text-green-500' : 'text-red-500'}`}>/100</span>
                  </div>
                </div>
                {/* Visual Progress Bar */}
                <div className="flex items-center">
                  <div className="w-full h-2 bg-black border border-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${validation.isValid ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`}
                      style={{ width: `${validation.score}%` }}
                    />
                  </div>
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div className="bg-black/40 p-4 border border-white/5 space-y-2">
                  <p className="text-[10px] font-mono-display font-bold text-red-400 uppercase tracking-widest mb-2">{t('report.errors')}[{validation.errors.length}]</p>
                  {validation.errors.map((error, index) => (
                    <div key={index} className="flex gap-2 text-[10px] font-mono-display text-gray-400 uppercase">
                      <span className="text-red-500">&gt;&gt;</span>
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
