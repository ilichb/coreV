'use client'

import { useState, useEffect } from 'react'
import { Scale, FileText, Shield, AlertTriangle, X, Send, CheckCircle, Paperclip, Calculator } from 'lucide-react'
import { legalDocuments } from '@/data/legal'

export default function PanelLegal() {
  const [showCanalSerioModal, setShowCanalSerioModal] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Anti-spam state
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, userAnswer: '' })
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    institucion: '',
    email: '',
    mensaje: ''
  })

  // Generar nuevo desafío al abrir el modal
  const generateCaptcha = () => {
    setCaptcha({
      num1: Math.floor(Math.random() * 10) + 1,
      num2: Math.floor(Math.random() * 10) + 1,
      userAnswer: ''
    })
  }

  useEffect(() => {
    if (showCanalSerioModal) generateCaptcha()
  }, [showCanalSerioModal])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const isCaptchaValid = parseInt(captcha.userAnswer) === (captcha.num1 + captcha.num2)
  const isFormValid = formData.nombre && formData.email && formData.mensaje && isCaptchaValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isCaptchaValid) return
    
    setIsSubmitting(true)
    // Simulación de envío (Preparado para backend futuro)
    setTimeout(() => {
      setIsSubmitting(false)
      setShowConfirmation(true)
      setFormData({ nombre: '', apellido: '', institucion: '', email: '', mensaje: '' })
      setSelectedFile(null)
    }, 1500)
  }

  const closeAllModals = () => {
    setShowCanalSerioModal(false)
    setShowConfirmation(false)
  }

  const documentFileNames: Record<string, string> = {
    'terms': 'TÉRMINOS DEL SISTEMA (EL _CONTRATO MADRE_).pdf',
    'guidelines': 'LINEAMIENTOS DE USO (REGLAS OPERATIVAS).pdf',
    'ethics': 'MARCO ÉTICO (BLINDAJE REPUTACIONAL Y MORAL).pdf',
    'privacy': 'POLÍTICA DE PRIVACIDAD Y TRATAMIENTO DE DATOS ESTRATÉGICOS.pdf'
  }

  return (
    <div id="legal" className="min-h-screen bg-slate-950 text-white">
      {/* Header Section */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-3">
            <Scale className="w-10 h-10 text-blue-400" />
            <h1 className="text-5xl font-bold text-white">Marco Legal</h1>
          </div>
          <p className="text-slate-400 text-xl">Documentación oficial y canal de comunicación formal protegido</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Documents Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-400" />
            Documentos Oficiales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {legalDocuments.filter(doc => doc.visible).map((doc) => (
              <a 
                key={doc.id}
                href={'/legal/es/' + encodeURIComponent(documentFileNames[doc.id] || doc.id + '.pdf')}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-6 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-blue-500/10 p-3 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{doc.title}</h3>
                    <p className="text-slate-400 text-sm">{doc.description}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Canal Serio Banner */}
        <div className="bg-gradient-to-br from-amber-500/10 to-slate-900 border border-amber-500/30 rounded-2xl p-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-amber-400" />
              <h2 className="text-3xl font-bold">Canal Serio</h2>
            </div>
            <p className="text-slate-300 text-lg mb-6">Acceso exclusivo para notificaciones legales y requerimientos institucionales de alta sensibilidad.</p>
            <button 
              onClick={() => setShowCanalSerioModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-4 rounded-xl transition-all flex items-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Iniciar Validación de Identidad
            </button>
          </div>
        </div>
      </div>

      {/* Modal Formulario */}
      {showCanalSerioModal && !showConfirmation && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Shield className="w-5 h-5" />
                COMUNICACIÓN OFICIAL
              </div>
              <button onClick={closeAllModals} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input name="nombre" placeholder="Nombre" onChange={handleInputChange} className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 focus:border-amber-500 outline-none" required />
                <input name="apellido" placeholder="Apellido" onChange={handleInputChange} className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 focus:border-amber-500 outline-none" required />
              </div>
              <input name="email" type="email" placeholder="Email Institucional" onChange={handleInputChange} className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 focus:border-amber-500 outline-none" required />
              <textarea name="mensaje" placeholder="Describa el asunto legal o institucional..." onChange={handleInputChange} rows={4} className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 focus:border-amber-500 outline-none resize-none" required></textarea>

              {/* Campo Adjunto */}
              <div className="relative">
                <input type="file" id="legal-file" onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx" />
                <label htmlFor="legal-file" className="flex items-center gap-3 p-3 bg-slate-800 border border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                  <Paperclip className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-400 text-sm truncate">
                    {selectedFile ? selectedFile.name : 'Adjuntar poder o documento legal (PDF/Word)'}
                  </span>
                </label>
              </div>

              {/* Desafío Anti-spam */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2 text-sm text-amber-200">
                  <Calculator className="w-4 h-4" />
                  <span>Verificación Humana (Requerido)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold tracking-widest text-white">
                    {captcha.num1} + {captcha.num2} =
                  </span>
                  <input 
                    type="number" 
                    value={captcha.userAnswer}
                    onChange={(e) => setCaptcha({...captcha, userAnswer: e.target.value})}
                    placeholder="?"
                    className="w-20 p-2 bg-slate-950 border border-slate-700 rounded text-center font-bold text-amber-400"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={!isFormValid || isSubmitting}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isFormValid ? 'bg-amber-500 text-black hover:bg-amber-600' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
              >
                {isSubmitting ? 'Validando...' : <><Send className="w-5 h-5" /> Enviar Mensaje Protegido</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-8 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Envío Exitoso</h3>
            <p className="text-slate-400 mb-6">Su comunicación ha sido encriptada y enviada al equipo legal.</p>
            <button onClick={closeAllModals} className="w-full py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700">Finalizar</button>
          </div>
        </div>
      )}
    </div>
  )
}
