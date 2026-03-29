'use client'

import { Rocket, ExternalLink, Zap, Target } from 'lucide-react'
import { getVisibleProjects, type ProjectStatus } from '@/data/ecosistema'
import { siteConfig } from '@/data/config'
import ValidacionEstrategica from './ValidacionEstrategica'

const statusConfig = {
  'ACTIVO': { label: 'Operativo', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  'EN_DESARROLLO': { label: 'En Desarrollo', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  'INVESTIGACION': { label: 'En Investigación', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  'PAUSADO': { label: 'Pausado', color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30' }
}

export default function PanelEcosistema() {
  const projects = getVisibleProjects()
  const showDetails = siteConfig.features.showProjectDetails

  return (
    <section id="ecosistema" className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Rocket className="w-8 h-8 text-blue-400" />
            <h2 className="text-4xl md:text-5xl font-bold">Ecosistema Andromeda</h2>
          </div>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">Un conjunto de proyectos vivos, en distintas etapas, construidos o acompañados por Andromeda Computer.</p>
        </div>

        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-8 text-center">Desarrollos destacados</h3>
          <div className="space-y-8">
            {projects.map((project) => {
              const config = statusConfig[project.status as ProjectStatus]
              return (
                <div key={project.id} className={'group bg-slate-800/50 border rounded-xl p-8 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 ' + config.borderColor}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-2xl font-bold group-hover:text-blue-400 transition-colors">{project.name}</h4>
                        {project.url && (
                          <a href={project.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors">
                            <ExternalLink className="w-5 h-5 text-blue-400" />
                          </a>
                        )}
                      </div>
                      <div className={'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ' + config.bgColor + ' ' + config.color + ' mb-4'}>
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                        <span className="font-medium">Estado: {config.label}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-300 mb-6 text-lg">{project.description}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.sector.map((sector, idx) => (
                      <span key={idx} className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">{sector}</span>
                    ))}
                  </div>
                  {showDetails && (
                    <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-slate-700">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-5 h-5 text-blue-400" />
                          <h5 className="font-semibold text-slate-200">Rol de Andromeda</h5>
                        </div>
                        <ul className="space-y-2">
                          {project.role.map((item, idx) => (
                            <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-5 h-5 text-green-400" />
                          <h5 className="font-semibold text-slate-200">Impacto</h5>
                        </div>
                        <ul className="space-y-2">
                          {project.impact.map((item, idx) => (
                            <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                              <span className="text-green-400 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <ValidacionEstrategica />
      </div>
    </section>
  )
}
