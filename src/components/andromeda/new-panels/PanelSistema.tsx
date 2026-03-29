'use client'

import { Terminal, Activity, Box, TrendingUp } from 'lucide-react'
import { sistemaContent } from '@/data/sistema'
import { siteConfig } from '@/data/config'

export default function PanelSistema() {
  return (
    <section id="sistema" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">{sistemaContent.title}</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full mb-4">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-green-300 font-mono text-sm">{sistemaContent.status}</span>
          </div>
          <p className="text-slate-400 font-mono">{sistemaContent.date}</p>
        </div>

        <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-8 mb-12 text-center">
          <p className="text-2xl text-slate-200 mb-4">{sistemaContent.hero.tagline}</p>
          <div className="space-y-2">
            {sistemaContent.hero.statement.map((line, idx) => (
              <p key={idx} className="text-xl text-slate-300 font-medium">{line}</p>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold">{sistemaContent.systemInfo.title}</h2>
            </div>
            <p className="text-slate-400 font-mono text-sm mb-6">{sistemaContent.systemInfo.snapshot}</p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {sistemaContent.systemInfo.components.map((component) => (
                <div key={component.id} className="bg-slate-950/50 border border-slate-700 rounded-lg p-4">
                  <h3 className="font-bold text-blue-300 mb-1">{component.name}</h3>
                  <p className="text-slate-400 text-sm mb-2">{component.description}</p>
                  <span className="inline-block px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                    {component.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-4">
              <h3 className="font-bold text-slate-200 mb-2">{sistemaContent.systemInfo.state.title}</h3>
              <p className="text-slate-300 mb-1">{sistemaContent.systemInfo.state.status}</p>
              <p className="text-slate-400 text-sm">{sistemaContent.systemInfo.state.type}: <span className="text-green-400 font-mono">{sistemaContent.systemInfo.state.value}</span></p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Box className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold">{sistemaContent.architecture.title}</h2>
          </div>
          <p className="text-slate-400 text-sm mb-2">{sistemaContent.architecture.subtitle}</p>
          <p className="text-slate-500 font-mono text-xs mb-6">{sistemaContent.architecture.id}</p>
          
          <ul className="space-y-2 mb-6">
            {sistemaContent.architecture.principles.map((principle, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span className="text-slate-300">{principle}</span>
              </li>
            ))}
          </ul>

          <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-4 mb-4">
            <p className="text-lg text-slate-200 italic mb-1">{sistemaContent.architecture.quote.text}</p>
            <p className="text-sm text-slate-400">{sistemaContent.architecture.quote.type}</p>
          </div>

          <p className="text-slate-500 text-sm">{sistemaContent.architecture.footer}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold mb-4">{sistemaContent.philosophy.title}</h2>
          <h3 className="text-xl font-semibold mb-2 text-slate-300">{sistemaContent.philosophy.subtitle}</h3>
          <p className="text-slate-500 text-sm mb-6">{sistemaContent.philosophy.note}</p>
          
          <div className="space-y-4 mb-6">
            {sistemaContent.philosophy.principles.map((principle) => (
              <div key={principle.number} className="bg-slate-950/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center font-bold flex-shrink-0">
                    {principle.number}
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-200 font-medium mb-1">{principle.title}</p>
                    <p className="text-slate-400 text-sm">{principle.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-6 text-center">
            <p className="text-xl text-slate-200 italic mb-2">{sistemaContent.philosophy.quote.text}</p>
            <p className="text-slate-500 text-sm">{sistemaContent.philosophy.quote.date}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-8 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold">{sistemaContent.governance.title}</h2>
          </div>
          <p className="text-slate-300 mb-4">{sistemaContent.governance.description}</p>
          <p className="text-slate-400 text-sm mb-2">{sistemaContent.governance.status}</p>
          <p className="text-slate-300 font-medium mb-2">{sistemaContent.governance.note}</p>
          <p className="text-slate-500 text-sm">{sistemaContent.governance.horizon}</p>
        </div>

        <div className="text-center bg-slate-950/50 border border-slate-700 rounded-xl p-8">
          <h3 className="text-2xl font-bold mb-2">{sistemaContent.footer.title}</h3>
          <p className="text-slate-400 mb-4">{sistemaContent.footer.date}</p>
          <p className="text-slate-300 mb-4">{sistemaContent.footer.message}</p>
          <p className="text-slate-500 font-mono text-sm">{sistemaContent.footer.sessionEnd}</p>
        </div>
      </div>
    </section>
  )
}
