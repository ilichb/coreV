import type { ProfileType } from './types'

export interface ValidationStep {
  id: number
  question: string
  type: 'single' | 'multiple' | 'text' | 'email'
  options?: Array<{ id: string; text: string }>
  placeholder?: string
  required: boolean
}

export interface ProfileValidation {
  id: ProfileType
  title: string
  subtitle: string
  steps: ValidationStep[]
}

export const strategicValidations: ProfileValidation[] = [
  {
    id: 'investor',
    title: 'Validación para Inversionistas',
    subtitle: 'Capital con visión de impacto. Invertir en Andromeda implica aceptar gobernanza progresiva y crecimiento controlado.',
    steps: [
      { id: 1, question: '¿Cuál es tu horizonte real de inversión cuando entras a un sistema tecnológico profundo?', type: 'single', options: [{ id: 'short', text: 'Corto plazo (1-2 años)' }, { id: 'medium', text: 'Medio plazo (3-5 años)' }, { id: 'long', text: 'Largo plazo (5+ años)' }], required: true },
      { id: 2, question: 'Describe una inversión pasada donde no tuviste control inmediato y aun así apostaste a largo plazo.', type: 'text', placeholder: 'Describe la situación, tu razonamiento y el resultado...', required: true },
      { id: 3, question: '¿Qué entiendes por impacto más allá del retorno financiero?', type: 'multiple', options: [{ id: 'systemic', text: 'Impacto sistémico' }, { id: 'architectural', text: 'Fortalecimiento arquitectónico' }, { id: 'governance', text: 'Mejora en gobernanza' }, { id: 'community', text: 'Desarrollo comunitario' }], required: true },
      { id: 4, question: '¿Cómo reaccionas cuando un sistema dice no a una propuesta que consideras rentable?', type: 'single', options: [{ id: 'respect', text: 'Respeto las reglas del sistema' }, { id: 'discuss', text: 'Busco entender el razonamiento' }, { id: 'insist', text: 'Insisto en mi perspectiva' }, { id: 'withdraw', text: 'Retiro mi participación' }], required: true },
      { id: 5, question: 'Contacto para reunión', type: 'email', placeholder: 'Email profesional', required: true }
    ]
  },
  {
    id: 'ally',
    title: 'Validación para Aliados',
    subtitle: 'Sinergias tecnológicas y operativas. Solo nos conectamos con sistemas que respetan reglas, límites y jerarquía.',
    steps: [
      { id: 1, question: '¿Qué problema estructural resuelve tu tecnología dentro de un sistema mayor?', type: 'text', placeholder: 'Describe el problema y cómo tu solución se integra sistémicamente...', required: true },
      { id: 2, question: '¿Tu stack permite control de permisos y validación previa?', type: 'single', options: [{ id: 'yes', text: 'Sí, de forma nativa' }, { id: 'partial', text: 'Parcialmente, requiere adaptación' }, { id: 'no', text: 'No, es abierto por diseño' }], required: true },
      { id: 3, question: 'Describe una integración donde tu tecnología se subordinó a un sistema superior.', type: 'text', placeholder: 'Explica el contexto y cómo manejaste las restricciones...', required: true },
      { id: 4, question: '¿Qué perdería Andromeda si no se integra con ustedes?', type: 'multiple', options: [{ id: 'tech', text: 'Capacidad tecnológica específica' }, { id: 'network', text: 'Acceso a redes especializadas' }, { id: 'speed', text: 'Velocidad de implementación' }, { id: 'nothing', text: 'Nada crítico, hay alternativas' }], required: true },
      { id: 5, question: 'Contacto para reunión', type: 'email', placeholder: 'Email profesional', required: true }
    ]
  },
  {
    id: 'talent',
    title: 'Validación para Colaboradores',
    subtitle: 'Talento quirúrgico para misiones concretas. Operar bajo reglas explícitas y aceptar revisión, validación y control.',
    steps: [
      { id: 1, question: '¿En qué tipo de problemas no deberías ser involucrado?', type: 'text', placeholder: 'Describe tus límites profesionales y áreas de no expertise...', required: true },
      { id: 2, question: 'Describe un proyecto donde tu trabajo pasó por revisión estricta antes de ejecutarse.', type: 'text', placeholder: 'Explica el proceso de revisión y cómo lo manejaste...', required: true },
      { id: 3, question: '¿Cómo reaccionas ante especificaciones cerradas y poco margen creativo?', type: 'single', options: [{ id: 'excel', text: 'Excelo en ejecución precisa' }, { id: 'adapt', text: 'Me adapto aunque prefiero flexibilidad' }, { id: 'struggle', text: 'Lucho con la rigidez' }, { id: 'reject', text: 'Rechazo este tipo de trabajo' }], required: true },
      { id: 4, question: '¿Qué te hace valioso en una fase de endurecimiento, no de exploración?', type: 'multiple', options: [{ id: 'discipline', text: 'Disciplina de ejecución' }, { id: 'attention', text: 'Atención al detalle' }, { id: 'process', text: 'Respeto por procesos' }, { id: 'patience', text: 'Paciencia con iteraciones' }], required: true },
      { id: 5, question: 'Contacto para reunión', type: 'email', placeholder: 'Email profesional', required: true }
    ]
  },
  {
    id: 'institution',
    title: 'Validación para Instituciones',
    subtitle: 'Colaboración institucional formal. Requiere alineación estructural, no solo interés estratégico.',
    steps: [
      { id: 1, question: '¿Qué tipo de decisiones requieren aprobación institucional en su organización?', type: 'multiple', options: [{ id: 'budget', text: 'Decisiones presupuestarias' }, { id: 'partnerships', text: 'Alianzas estratégicas' }, { id: 'public', text: 'Comunicaciones públicas' }, { id: 'legal', text: 'Compromisos legales' }], required: true },
      { id: 2, question: '¿Cómo gestionan proyectos con autonomía operativa externa?', type: 'single', options: [{ id: 'frameworks', text: 'Con marcos de trabajo claros' }, { id: 'supervision', text: 'Con supervisión periódica' }, { id: 'trust', text: 'Con autonomía total y rendición de cuentas' }, { id: 'avoid', text: 'Evitamos esta modalidad' }], required: true },
      { id: 3, question: 'Describe una colaboración donde las reglas estaban por encima de las personas.', type: 'text', placeholder: 'Explica cómo se establecieron y respetaron las reglas...', required: true },
      { id: 4, question: '¿Qué riesgos institucionales reconocen al operar con un sistema no convencional?', type: 'multiple', options: [{ id: 'reputation', text: 'Riesgo reputacional' }, { id: 'compliance', text: 'Cumplimiento normativo' }, { id: 'control', text: 'Pérdida de control' }, { id: 'stability', text: 'Estabilidad operativa' }], required: true },
      { id: 5, question: 'Contacto para reunión', type: 'email', placeholder: 'Email profesional', required: true }
    ]
  }
]

export const getValidationByProfile = (profileType: ProfileType): ProfileValidation | undefined => {
  return strategicValidations.find(v => v.id === profileType)
}
