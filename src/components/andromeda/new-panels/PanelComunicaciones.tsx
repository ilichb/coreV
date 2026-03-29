/**
 * PANEL COMUNICACIONES - Sistema de Bitácora
 * 
 * Muestra actividad del sistema en 3 pestañas:
 * 1. Actividad Construye (proyectos validados)
 * 2. Actividad Validaciones (perfiles estratégicos)
 * 3. Notificaciones Sistema (eventos oficiales)
 */

'use client'

import { useState } from 'react'
import { 
  Bell, 
  Wrench, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronRight,
  X
} from 'lucide-react'
import { comunicacionesContent, galleries } from '@/data/comunicaciones'
import { useBitacora } from '@/hooks/useBitacora'
import type { BitacoraEvent } from '@/data/types'

type TabType = 'construye' | 'validaciones' | 'sistema'

export default function PanelComunicaciones() {
  const [activeTab, setActiveTab] = useState<TabType>('construye')
  const [selectedEvent, setSelectedEvent] = useState<BitacoraEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  const { events, getByType, getStats } = useBitacora()
  const stats = getStats()

  const getFilteredEvents = () => {
    switch (activeTab) {
      case 'construye':
        return getByType('construye')
      case 'validaciones':
        return getByType('validacion')
      case 'sistema':
        return getByType('sistema')
      default:
        return []
    }
  }

  const filteredEvents = getFilteredEvents()

  const handleEventClick = (event: BitacoraEvent) => {
    setSelectedEvent(event)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setTimeout(() => setSelectedEvent(null), 300)
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'Hace menos de 1 hora'
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const ResultIcon = ({ result }: { result?: string }) => {
    switch (result) {
      case 'aprobado':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'rechazado':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'completado':
        return <CheckCircle2 className="w-5 h-5 text-blue-400" />
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />
    }
  }

  const ResultBadge = ({ result }: { result?: string }) => {
    const styles = {
      aprobado: 'bg-green-500/20 text-green-400 border-green-500/30',
      rechazado: 'bg-red-500/20 text-red-400 border-red-500/30',
      completado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      en_revision: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }

    const labels = {
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      completado: 'Completado',
      en_revision: 'En Revisión'
    }

    if (!result) return null

    return (
      <span className={`px-2 py-1 text-xs font-medium border rounded-full whitespace-nowrap ${styles[result as keyof typeof styles] || styles.completado}`}>
        {labels[result as keyof typeof labels] || result}
      </span>
    )
  }

  return (
    <div id="comunicaciones" className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold">{comunicacionesContent.title}</h1>
          </div>
          <p className="text-slate-400 text-lg">{comunicacionesContent.subtitle}</p>
          <p className="text-slate-500 text-sm mt-2">{comunicacionesContent.tagline}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Wrench className="w-6 h-6 text-blue-400" />
              <span className="text-2xl font-bold text-white">{stats.construye.total}</span>
            </div>
            <p className="text-slate-400 text-sm">Proyectos Analizados</p>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-green-400">✓ {stats.construye.aprobados} aprobados</span>
              <span className="text-red-400">✗ {stats.construye.rechazados} rechazados</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-purple-400" />
              <span className="text-2xl font-bold text-white">{stats.validaciones.total}</span>
            </div>
            <p className="text-slate-400 text-sm">Perfiles Validados</p>
            <div className="flex gap-2 mt-3 text-xs text-slate-500">
              <span>{stats.validaciones.inversionistas} inv</span>
              <span>{stats.validaciones.aliados} aliados</span>
              <span>{stats.validaciones.colaboradores} colabs</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Bell className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-white">{stats.sistema}</span>
            </div>
            <p className="text-slate-400 text-sm">Eventos del Sistema</p>
            <p className="text-xs text-slate-500 mt-3">Últimos 30 días</p>
          </div>
        </div>

        {/* Tabs - Verticales en móvil, horizontales en desktop */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-2 md:gap-0 md:border-b md:border-slate-800">
            <button
              onClick={() => setActiveTab('construye')}
              className={`w-full md:w-auto px-6 py-3 font-medium transition-all rounded-lg md:rounded-none border md:border-0 ${
                activeTab === 'construye'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 md:border-b-2 md:border-blue-400 md:bg-transparent'
                  : 'text-slate-400 hover:text-white border-slate-800 md:border-0'
              }`}
            >
              <div className="flex items-center justify-between md:justify-start gap-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  <span>Construye</span>
                </div>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">
                  {stats.construye.total}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('validaciones')}
              className={`w-full md:w-auto px-6 py-3 font-medium transition-all rounded-lg md:rounded-none border md:border-0 ${
                activeTab === 'validaciones'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 md:border-b-2 md:border-blue-400 md:bg-transparent'
                  : 'text-slate-400 hover:text-white border-slate-800 md:border-0'
              }`}
            >
              <div className="flex items-center justify-between md:justify-start gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Validaciones</span>
                </div>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">
                  {stats.validaciones.total}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('sistema')}
              className={`w-full md:w-auto px-6 py-3 font-medium transition-all rounded-lg md:rounded-none border md:border-0 ${
                activeTab === 'sistema'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 md:border-b-2 md:border-blue-400 md:bg-transparent'
                  : 'text-slate-400 hover:text-white border-slate-800 md:border-0'
              }`}
            >
              <div className="flex items-center justify-between md:justify-start gap-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span>Sistema</span>
                </div>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">
                  {stats.sistema}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Lista de Eventos */}
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay eventos registrados en esta categoría</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-4 transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <ResultIcon result={event.result} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors break-words">
                          {event.title}
                        </h3>
                        <ResultBadge result={event.result} />
                      </div>
                      <p className="text-slate-400 text-sm line-clamp-2">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span>{formatDate(event.timestamp)}</span>
                        {event.score && (
                          <span className="text-blue-400">
                            Puntaje: {event.score}/100
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Galerías */}
        {galleries.length > 0 && activeTab === 'sistema' && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-6">Galerías Visuales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {galleries.filter(g => g.visible).map((gallery) => (
                <div key={gallery.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                  <div className="aspect-video bg-slate-800 flex items-center justify-center text-slate-600">
                    <span className="text-sm">📸 {gallery.images.length} imágenes</span>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-white mb-1">{gallery.title}</h4>
                    <p className="text-sm text-slate-400 mb-2">{gallery.description}</p>
                    <p className="text-xs text-slate-500">{gallery.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <ResultIcon result={selectedEvent.result} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2 break-words">
                    {selectedEvent.title}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <ResultBadge result={selectedEvent.result} />
                    <span className="text-sm text-slate-500">
                      {formatDate(selectedEvent.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Descripción
                </h3>
                <p className="text-white">{selectedEvent.description}</p>
              </div>

              {selectedEvent.score && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Puntaje
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl md:text-3xl font-bold text-blue-400">
                      {selectedEvent.score}/100
                    </span>
                    <div className="flex-1 bg-slate-800 rounded-full h-3">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          selectedEvent.score >= 60 ? 'bg-green-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${selectedEvent.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Detalles Adicionales
                  </h3>
                  <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                    {Object.entries(selectedEvent.metadata).map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                        <span className="text-slate-500 text-sm capitalize sm:min-w-[120px]">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="text-white text-sm flex-1 break-words">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 break-all">
                  ID: <code className="text-slate-400">{selectedEvent.id}</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-800 bg-slate-900/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-slate-500 text-sm text-center">
            {comunicacionesContent.footer}
          </p>
        </div>
      </div>
    </div>
  )
}
