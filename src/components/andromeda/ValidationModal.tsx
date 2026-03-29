'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar, CheckCircle2, CheckCircle, ArrowRight, Home } from 'lucide-react'
import { getValidationByProfile } from '@/data/validaciones-estrategicas'
import { getValidationCalendly } from '@/data/config'
import { validators } from '@/data/helpers'
import type { ProfileType } from '@/data/types'
import { logger } from '../../lib/utils/logger';

interface ValidationModalProps {
  profileType: ProfileType
  isOpen: boolean
  onClose: () => void
}

export default function ValidationModal({ profileType, isOpen, onClose }: ValidationModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [isCompleted, setIsCompleted] = useState(false)

  const validation = getValidationByProfile(profileType)
  const calendlyUrl = getValidationCalendly()

  if (!isOpen || !validation) return null

  const totalSteps = validation.steps.length
  const progress = ((currentStep - 1) / totalSteps) * 100
  const currentStepData = validation.steps.find(s => s.id === currentStep)

  const handleAnswer = (stepId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [stepId]: value }))
    setErrors(prev => ({ ...prev, [stepId]: '' }))
  }

  const handleMultipleChoice = (stepId: number, optionId: string) => {
    const current = answers[stepId] || []
    const newValue = current.includes(optionId)
      ? current.filter((id: string) => id !== optionId)
      : [...current, optionId]
    handleAnswer(stepId, newValue)
  }

  const validateCurrentStep = (): boolean => {
    if (!currentStepData) return false

    const answer = answers[currentStep]

    if (currentStepData.required) {
      if (currentStepData.type === 'email') {
        if (!email || !validators.email(email)) {
          setErrors(prev => ({ ...prev, [currentStep]: 'Email profesional válido requerido' }))
          return false
        }
      } else if (currentStepData.type === 'text') {
        if (!answer || answer.trim().length < 10) {
          setErrors(prev => ({ ...prev, [currentStep]: 'Por favor proporciona una descripción detallada (mínimo 10 caracteres)' }))
          return false
        }
      } else if (currentStepData.type === 'multiple') {
        if (!answer || answer.length === 0) {
          setErrors(prev => ({ ...prev, [currentStep]: 'Selecciona al menos una opción' }))
          return false
        }
      } else {
        if (!answer) {
          setErrors(prev => ({ ...prev, [currentStep]: 'Por favor selecciona una opción' }))
          return false
        }
      }
    }

    return true
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
      setErrors(prev => ({ ...prev, [currentStep]: '' }))
    }
  }

  const handleSubmit = () => {
    if (!validateCurrentStep()) return

    // Guardar datos (preparado para backend)
    const validationData = {
      profileType,
      answers,
      email,
      completedAt: new Date().toISOString()
    }

    logger.info('Validation completed:', validationData)

    // Redirigir a Calendly
    if (calendlyUrl) {
      window.open(calendlyUrl, '_blank')
    }

    // Mostrar pantalla de finalización
    setIsCompleted(true)
  }

  const handleCompleteClose = () => {
    onClose()
    // Reset
    setCurrentStep(1)
    setAnswers({})
    setEmail('')
    setErrors({})
    setIsCompleted(false)
  }

  const handleClose = () => {
    if (confirm('¿Seguro que deseas cancelar el proceso de validación?')) {
      handleCompleteClose()
    }
  }

  // Pantalla de finalización
  if (isCompleted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
          <div className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-green-500/10 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">¡Validación Completada!</h2>
            
            <div className="space-y-4 mb-8">
              <p className="text-slate-300">
                Gracias por completar el proceso de validación estratégica de Andromeda Computer.
              </p>
              <p className="text-slate-400 text-sm">
                Hemos recibido tus respuestas y te hemos redirigido a Calendly para agendar tu reunión de 30 minutos.
              </p>
              <p className="text-slate-400 text-sm">
                Si no se abrió la ventana de Calendly, por favor revisa tu navegador o haz clic nuevamente en el botón de agendar reunión.
              </p>
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mt-4">
                <p className="text-blue-400 text-sm font-medium">
                  Te invitamos a seguir explorando nuestro sistema mientras coordinamos la reunión.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCompleteClose}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Volver al sistema Andromeda</span>
              </button>
              
              {calendlyUrl && (
                <button
                  onClick={() => window.open(calendlyUrl, '_blank')}
                  className="w-full px-6 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Abrir Calendly nuevamente</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Pantalla normal del modal (pasos de validación)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 z-10">
          <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
          
          <h2 className="text-2xl font-bold text-slate-100 mb-2">{validation.title}</h2>
          <p className="text-slate-400 mb-4">{validation.subtitle}</p>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Progreso: {progress.toFixed(0)}%</span>
              <span className="text-slate-400">Paso {currentStep} de {totalSteps}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStepData && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-slate-100">{currentStepData.question}</h3>

              {/* Single Choice */}
              {currentStepData.type === 'single' && currentStepData.options && (
                <div className="space-y-3">
                  {currentStepData.options.map((option) => (
                    <button key={option.id} onClick={() => handleAnswer(currentStep, option.id)} className={'w-full text-left p-4 rounded-lg border transition-all ' + (answers[currentStep] === option.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600')}>
                      <div className="flex items-center gap-3">
                        <div className={'w-5 h-5 rounded-full border-2 flex items-center justify-center ' + (answers[currentStep] === option.id ? 'border-blue-500 bg-blue-500' : 'border-slate-600')}>
                          {answers[currentStep] === option.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <span className="text-slate-200">{option.text}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Multiple Choice */}
              {currentStepData.type === 'multiple' && currentStepData.options && (
                <div className="space-y-3">
                  {currentStepData.options.map((option) => {
                    const isSelected = (answers[currentStep] || []).includes(option.id)
                    return (
                      <button key={option.id} onClick={() => handleMultipleChoice(currentStep, option.id)} className={'w-full text-left p-4 rounded-lg border transition-all ' + (isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600')}>
                        <div className="flex items-center gap-3">
                          <div className={'w-5 h-5 rounded border-2 flex items-center justify-center ' + (isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600')}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                          <span className="text-slate-200">{option.text}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Text Input */}
              {currentStepData.type === 'text' && (
                <textarea value={answers[currentStep] || ''} onChange={(e) => handleAnswer(currentStep, e.target.value)} placeholder={currentStepData.placeholder} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none min-h-[120px] resize-none" />
              )}

              {/* Email Input */}
              {currentStepData.type === 'email' && (
                <div className="space-y-4">
                  <p className="text-slate-400 text-sm">Para agendar una reunión directa, ingresa tu email profesional.</p>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={currentStepData.placeholder} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                  <p className="text-slate-400 text-sm">Después de enviar, serás redirigido a Calendly para agendar una reunión de 30 minutos.</p>
                </div>
              )}

              {/* Error Message */}
              {errors[currentStep] && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{errors[currentStep]}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-6 flex justify-between gap-4">
          {currentStep > 1 ? (
            <button onClick={handlePrevious} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
          ) : (
            <button onClick={handleClose} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors">
              Cancelar
            </button>
          )}

          {currentStep < totalSteps ? (
            <button onClick={handleNext} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2">
              <span>Continuar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Enviar y agendar reunión</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
