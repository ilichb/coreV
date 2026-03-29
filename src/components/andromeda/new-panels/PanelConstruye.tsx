'use client'

import { useState, useEffect } from 'react'
import { Wrench, CheckCircle2, Circle, AlertTriangle, ExternalLink, XCircle } from 'lucide-react'
import { validationStages, construyeContent } from '@/data/construye'
import { siteConfig, getValidationCalendly } from '@/data/config'

export default function PanelConstruye() {
  const [currentStage, setCurrentStage] = useState(1)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [stageScores, setStageScores] = useState<Record<number, number>>({})
  const [isFinished, setIsFinished] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [isApproved, setIsApproved] = useState(false)

  const calculateProgress = () => {
    const completedStages = Object.keys(stageScores).length
    return (completedStages / validationStages.length) * 100
  }

  const getCurrentStageScore = () => {
    const stage = validationStages.find(s => s.id === currentStage)
    if (!stage) return 0
    
    let score = 0
    stage.questions.forEach(q => {
      if (answers[q.id] !== undefined) {
        const option = q.options.find(o => o.id === answers[q.id])
        if (option) score += option.score
      }
    })
    return score
  }

  const isStageComplete = () => {
    const stage = validationStages.find(s => s.id === currentStage)
    if (!stage) return false
    return stage.questions.every(q => answers[q.id] !== undefined)
  }

  const calculateTotalScore = (): number => {
    return Object.values(stageScores).reduce((sum, score) => sum + score, 0)
  }

  const handleAnswer = (questionId: string, optionId: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleNextStage = () => {
    const score = getCurrentStageScore()
    const newStageScores = { ...stageScores, [currentStage]: score }
    setStageScores(newStageScores)
    
    if (currentStage < validationStages.length) {
      setCurrentStage(prev => prev + 1)
    } else {
      // Última etapa completada
      const total = calculateTotalScore() + score // Sumamos la última etapa
      setTotalScore(total)
      const approved = total >= siteConfig.validation.minimumScore
      setIsApproved(approved)
      setIsFinished(true)
    }
  }

  const handleRestart = () => {
    setCurrentStage(1)
    setAnswers({})
    setStageScores({})
    setIsFinished(false)
    setTotalScore(0)
    setIsApproved(false)
  }

  const currentStageData = validationStages.find(s => s.id === currentStage)
  const progress = calculateProgress()
  const stageScore = getCurrentStageScore()
  const isComplete = isStageComplete()
  const calendlyUrl = getValidationCalendly()

  if (isFinished) {
    const maxScore = validationStages.length * 6 // 4 * 6 = 24
    const percentage = (totalScore / maxScore) * 100
    const isApproved = totalScore >= siteConfig.validation.minimumScore

    return (
      <section id="construye" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Wrench className="w-8 h-8 text-blue-400" />
              <h2 className="text-4xl md:text-5xl font-bold">{construyeContent.title}</h2>
            </div>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              {construyeContent.intro}
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-8 mb-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                {isApproved ? (
                  <div className="w-24 h-24 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-16 h-16 text-green-400" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center">
                    <XCircle className="w-16 h-16 text-red-400" />
                  </div>
                )}
              </div>
              <h3 className="text-3xl font-bold mb-4">
                {isApproved ? '¡Proyecto Aprobado!' : 'Proyecto No Aprobado'}
              </h3>
              <p className="text-slate-400 text-lg mb-8">
                {isApproved 
                  ? 'Tu proyecto ha alcanzado los criterios mínimos para continuar con una reunión de evaluación directa.'
                  : 'Tu proyecto no alcanza los criterios mínimos requeridos por Andromeda en esta instancia.'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-6">
                <h4 className="font-semibold text-slate-300 mb-2">Puntaje Obtenido</h4>
                <div className="text-4xl font-bold text-blue-400">{totalScore}/{maxScore}</div>
                <div className="text-sm text-slate-500 mt-2">{percentage.toFixed(1)}% del total</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-6">
                <h4 className="font-semibold text-slate-300 mb-2">Criterio de Aprobación</h4>
                <div className="text-2xl font-bold text-slate-200">{siteConfig.validation.minimumScore}+ puntos</div>
                <div className="text-sm text-slate-500 mt-2">Mínimo 60% requerido</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-xl text-slate-200">Resultado por Etapa</h4>
              {validationStages.map(stage => (
                <div key={stage.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div>
                    <div className="font-medium text-slate-200">{stage.name}</div>
                    <div className="text-sm text-slate-500">{stage.description}</div>
                  </div>
                  <div className="text-lg font-bold text-blue-400">
                    {stageScores[stage.id] || 0}/{stage.maxScore}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-4">
              {isApproved && calendlyUrl ? (
                <>
                  <a 
                    href={calendlyUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Agendar reunión en Calendly
                  </a>
                  <p className="text-center text-sm text-slate-400">
                    Serás redirigido a Calendly para agendar una reunión de 30 minutos con el equipo de Andromeda.
                  </p>
                </>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-amber-300 mb-2">Recomendación del sistema</h4>
                      <p className="text-slate-300 text-sm">
                        Tu proyecto no alcanzó el puntaje mínimo requerido. Te recomendamos revisar los criterios de evaluación y considerar fortalecer los aspectos señalados antes de reintentar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={handleRestart}
                className="w-full py-4 border border-slate-600 text-slate-300 hover:bg-slate-800 rounded-lg font-semibold transition-all"
              >
                Evaluar otro proyecto
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Vista normal (no terminada)
  return (
    <section id="construye" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Wrench className="w-8 h-8 text-blue-400" />
            <h2 className="text-4xl md:text-5xl font-bold">{construyeContent.title}</h2>
          </div>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            {construyeContent.intro}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {construyeContent.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Progreso del sistema</h3>
            <span className="text-2xl font-bold text-blue-400">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-500" style={{ width: progress + '%' }}></div>
          </div>
          <p className="text-sm text-slate-400 text-center">{construyeContent.successMessage}</p>
        </div>

        <div className="space-y-4 mb-8">
          {validationStages.map((stage) => {
            const isCurrentStage = stage.id === currentStage
            const isCompleted = stageScores[stage.id] !== undefined
            const isPending = stage.id > currentStage
            
            return (
              <div key={stage.id} className={'border rounded-lg p-4 transition-all ' + (isCurrentStage ? 'border-blue-500 bg-blue-500/10' : isCompleted ? 'border-green-500/30 bg-green-500/5' : 'border-slate-700 bg-slate-800/30')}>
                <div className="flex items-center gap-3">
                  <div className={'w-8 h-8 rounded-full flex items-center justify-center font-bold ' + (isCompleted ? 'bg-green-500 text-white' : isCurrentStage ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400')}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stage.id}
                  </div>
                  <div className="flex-1">
                    <h4 className={'font-semibold ' + (isCurrentStage ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-slate-400')}>
                      {stage.name}
                    </h4>
                    <p className="text-sm text-slate-500">{stage.description}</p>
                  </div>
                  <span className={'text-sm font-medium ' + (isCurrentStage ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-slate-500')}>
                    {isCompleted ? 'Completado' : isCurrentStage ? 'En progreso' : 'Pendiente'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {currentStageData && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-8 mb-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">{currentStageData.name}</h3>
              <p className="text-slate-400">{currentStageData.description}</p>
            </div>

            <div className="flex justify-between items-center mb-6 p-4 bg-slate-950/50 rounded-lg border border-slate-700">
              <span className="text-slate-300">Puntaje etapa</span>
              <span className="text-2xl font-bold text-blue-400">{stageScore}/{currentStageData.maxScore}</span>
            </div>

            <div className="space-y-8">
              {currentStageData.questions.map((question) => (
                <div key={question.id} className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-200">{question.question}</h4>
                  <div className="space-y-3">
                    {question.options.map((option) => (
                      <button key={option.id} onClick={() => handleAnswer(question.id, option.id)} className={'w-full text-left p-4 rounded-lg border transition-all ' + (answers[question.id] === option.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600')}>
                        <div className="flex items-center gap-3">
                          <div className={'w-6 h-6 rounded-full border-2 flex items-center justify-center ' + (answers[question.id] === option.id ? 'border-blue-500 bg-blue-500' : 'border-slate-600')}>
                            {answers[question.id] === option.id && <Circle className="w-3 h-3 text-white fill-white" />}
                          </div>
                          <span className="flex-1 text-slate-200">{option.text}</span>
                          <span className="text-sm text-slate-500">+{option.score}pts</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleNextStage} disabled={!isComplete} className={'w-full mt-8 py-4 rounded-lg font-semibold transition-all ' + (isComplete ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed')}>
              {isComplete ? (currentStage < validationStages.length ? 'Continuar a siguiente etapa' : 'Finalizar validación') : 'Responde todas las preguntas para continuar'}
            </button>
          </div>
        )}

        {siteConfig.features.enableValidacionEstrategica && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-amber-300 mb-2">Regla del sistema</h4>
                <p className="text-slate-300 text-sm">{construyeContent.warning}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
