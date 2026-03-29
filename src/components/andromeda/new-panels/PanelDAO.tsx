'use client'

import { Users, CheckCircle2, X, Workflow, Vote, Shield } from 'lucide-react'
import { daoContent } from '@/data/dao'

export default function PanelDAO() {
  return (
    <section id="dao" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Users className="w-8 h-8 text-blue-400" />
            <h2 className="text-4xl md:text-5xl font-bold">{daoContent.title}</h2>
          </div>
          <p className="text-xl text-slate-300 mb-4">{daoContent.subtitle}</p>
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-amber-300 font-medium">{daoContent.status}</span>
          </div>
          <p className="text-slate-400 mt-3">{daoContent.phase}</p>
        </div>

        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center mb-8">{daoContent.notConventional.title}</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {daoContent.notConventional.items.map((item, idx) => (
              <div key={idx} className={'border rounded-xl p-6 ' + (item.isNot ? 'border-red-500/30 bg-red-500/5' : 'border-green-500/30 bg-green-500/5')}>
                <div className="flex items-start gap-3 mb-3">
                  {item.isNot ? (
                    <X className="w-6 h-6 text-red-400 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                  )}
                  <h4 className={'font-bold ' + (item.isNot ? 'text-red-300' : 'text-green-300')}>{item.title}</h4>
                </div>
                <p className="text-slate-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-16">
          <h3 className="text-2xl font-bold mb-6">{daoContent.whatIsIt.title}</h3>
          <ul className="space-y-3 mb-6">
            {daoContent.whatIsIt.points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">•</span>
                <span className="text-slate-300">{point}</span>
              </li>
            ))}
          </ul>
          <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-6 italic">
            <p className="text-lg text-slate-200 mb-2">{daoContent.whatIsIt.principle.quote}</p>
            <p className="text-sm text-slate-400">— {daoContent.whatIsIt.principle.author}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-red-300">{daoContent.whyExists.title}</h3>
            <h4 className="font-semibold mb-4 text-slate-300">Problemas actuales en Web3</h4>
            <ul className="space-y-2 mb-6">
              {daoContent.whyExists.problems.map((problem, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-400 text-sm">
                  <span className="text-red-400">•</span>
                  <span>{problem}</span>
                </li>
              ))}
            </ul>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-blue-300">Solución</h4>
              <p className="text-slate-300 text-sm">{daoContent.whyExists.solution}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-6">{daoContent.howItWorks.title}</h3>
            <div className="space-y-4 mb-6">
              {daoContent.howItWorks.steps.map((step) => (
                <div key={step.number} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold flex-shrink-0">
                    {step.number}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">{step.title}</h4>
                    <p className="text-sm text-slate-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-3">
              <strong>Nota:</strong> {daoContent.howItWorks.note}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-8 mb-16">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <h4 className="text-xl font-bold text-green-300">Comunidades e Individuos</h4>
              </div>
              <ul className="space-y-2">
                {daoContent.whoCanParticipate.eligible.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <X className="w-6 h-6 text-red-400" />
                <h4 className="text-xl font-bold text-red-300">No es para</h4>
              </div>
              <ul className="space-y-2">
                {daoContent.whoCanParticipate.notFor.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                    <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-16">
          <h3 className="text-2xl font-bold mb-6">{daoContent.benefits.title}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {daoContent.benefits.items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-8 mb-8">
          <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg transition-colors mb-4">
            {daoContent.cta.button}
          </button>
          <p className="text-sm text-slate-400 mb-1">{daoContent.cta.note}</p>
          <p className="text-xs text-slate-500">{daoContent.cta.future}</p>
        </div>

        <div className="text-center bg-slate-950/50 border border-slate-700 rounded-xl p-8">
          <p className="text-xl text-slate-300 mb-2 italic">{daoContent.closingQuote.line1}</p>
          <p className="text-2xl font-bold text-blue-400">{daoContent.closingQuote.line2}</p>
        </div>
      </div>
    </section>
  )
}
