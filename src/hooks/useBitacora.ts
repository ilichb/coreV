import { useState } from 'react'
import { BitacoraEvent } from '../data/types'

export const useBitacora = () => {
  const [events, setEvents] = useState<BitacoraEvent[]>([])

  const addEvent = (event: Omit<BitacoraEvent, 'id' | 'timestamp'>) => {
    const newEvent: BitacoraEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    }
    setEvents(prev => [newEvent, ...prev])
    return newEvent
  }

  const getByType = (type: BitacoraEvent['type']) => {
    return events.filter(e => e.type === type)
  }

  const getStats = () => {
    const validEvents = events.filter(e => (e.type as string) === 'validacion')
    
    return {
      total: events.length,
      sistema: events.length,
      construye: {
        total: events.filter(e => (e.type as string) === 'construye').length,
        aprobados: events.filter(e => e.result === 'aprobado').length,
        rechazados: events.filter(e => e.result === 'rechazado').length
      },
      validaciones: {
        total: validEvents.length,
        inversionistas: validEvents.filter(e => e.metadata?.role === 'inversionista').length,
        aliados: validEvents.filter(e => e.metadata?.role === 'aliado').length,
        colaboradores: validEvents.filter(e => e.metadata?.role === 'colaborador').length
      },
      comunicaciones: {
        total: events.filter(e => (e.type as string).startsWith('comunica')).length
      }
    }
  }

  const logProjectValidation = (data: {
    projectName: string
    score: number
    sector?: string
    impact?: string
  }) => {
    return addEvent({
      type: 'construye' as any,
      category: 'proyecto',
      title: data.projectName,
      description: `Validación estratégica finalizada con score de ${data.score}`,
      result: data.score >= 14 ? 'aprobado' : 'rechazado',
      score: data.score,
      visible: true,
      metadata: {
        projectName: data.projectName,
        sector: data.sector,
        impact: data.impact
      },
      data: {}
    })
  }

  return {
    events,
    addEvent,
    getByType,
    getStats,
    logProjectValidation
  }
}
