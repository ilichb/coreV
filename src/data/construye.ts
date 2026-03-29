export interface ValidationQuestion {
  id: string
  question: string
  options: ValidationOption[]
}

export interface ValidationOption {
  id: number
  text: string
  score: number
}

export interface ValidationStage {
  id: number
  name: string
  description: string
  questions: ValidationQuestion[]
  minScore: number
  maxScore: number
}

export const validationStages: ValidationStage[] = [
  {
    id: 1,
    name: "Evaluación de Propósito",
    description: "Verificación del problema y equipo",
    minScore: 0,
    maxScore: 6,
    questions: [
      {
        id: "proposito-problema",
        question: "¿Tu proyecto resuelve un problema real y medible?",
        options: [
          { id: 1, text: "Sí, con impacto social o ambiental claro", score: 3 },
          { id: 2, text: "Sí, principalmente comercial/tecnológico", score: 2 },
          { id: 3, text: "Estamos explorando el problema aún", score: 1 },
          { id: 4, text: "No hay problema específico identificado", score: 0 }
        ]
      },
      {
        id: "proposito-equipo",
        question: "¿Existe un equipo comprometido para ejecutarlo?",
        options: [
          { id: 1, text: "Equipo completo con roles definidos", score: 3 },
          { id: 2, text: "Equipo parcial, buscando complementos", score: 2 },
          { id: 3, text: "Soy individuo buscando equipo", score: 1 },
          { id: 4, text: "No hay equipo definido", score: 0 }
        ]
      }
    ]
  },
  {
    id: 2,
    name: "Impacto Social y Ambiental",
    description: "Medición de impacto real",
    minScore: 0,
    maxScore: 6,
    questions: [
      {
        id: "impacto-beneficiarios",
        question: "¿Quiénes se benefician directamente?",
        options: [
          { id: 1, text: "Comunidades vulnerables o medio ambiente", score: 3 },
          { id: 2, text: "Usuarios finales con necesidad real", score: 2 },
          { id: 3, text: "Sector empresarial específico", score: 1 },
          { id: 4, text: "No hay beneficiarios claros", score: 0 }
        ]
      },
      {
        id: "impacto-medicion",
        question: "¿Cómo medirás el impacto?",
        options: [
          { id: 1, text: "KPIs claros y verificables", score: 3 },
          { id: 2, text: "Métricas definidas pero sin sistema", score: 2 },
          { id: 3, text: "Impacto cualitativo estimado", score: 1 },
          { id: 4, text: "Sin sistema de medición", score: 0 }
        ]
      }
    ]
  },
  {
    id: 3,
    name: "Viabilidad Técnica",
    description: "Factibilidad de ejecución",
    minScore: 0,
    maxScore: 6,
    questions: [
      {
        id: "tecnica-madurez",
        question: "¿En qué etapa está el desarrollo?",
        options: [
          { id: 1, text: "MVP funcional o prueba de concepto", score: 3 },
          { id: 2, text: "Diseño técnico completo", score: 2 },
          { id: 3, text: "Idea con investigación preliminar", score: 1 },
          { id: 4, text: "Solo concepto inicial", score: 0 }
        ]
      },
      {
        id: "tecnica-recursos",
        question: "¿Cuentan con recursos para ejecutar?",
        options: [
          { id: 1, text: "Recursos confirmados y comprometidos", score: 3 },
          { id: 2, text: "Financiamiento en proceso", score: 2 },
          { id: 3, text: "Buscando financiamiento", score: 1 },
          { id: 4, text: "Sin recursos identificados", score: 0 }
        ]
      }
    ]
  },
  {
    id: 4,
    name: "Alineación Ética",
    description: "Valores y compromiso",
    minScore: 0,
    maxScore: 6,
    questions: [
      {
        id: "etica-valores",
        question: "¿El proyecto respeta principios éticos fundamentales?",
        options: [
          { id: 1, text: "Totalmente alineado con valores sociales", score: 3 },
          { id: 2, text: "Principalmente ético con consideraciones", score: 2 },
          { id: 3, text: "Neutral éticamente", score: 1 },
          { id: 4, text: "Cuestionable éticamente", score: 0 }
        ]
      },
      {
        id: "etica-compromiso",
        question: "¿Compromiso de largo plazo?",
        options: [
          { id: 1, text: "Visión de 5+ años con hitos claros", score: 3 },
          { id: 2, text: "Plan de 2-3 años definido", score: 2 },
          { id: 3, text: "Proyecto de corto plazo", score: 1 },
          { id: 4, text: "Sin compromiso temporal definido", score: 0 }
        ]
      }
    ]
  }
]

export const construyeContent = {
  title: "Construye con Andromeda",
  intro: "No todos los proyectos deben construirse. Algunos deben evolucionar. Otros, detenerse. Este proceso evalúa si tu proyecto está alineado con nuestra visión de impacto, sostenibilidad y viabilidad técnica.",
  features: [
    "Sistema guiado",
    "Evaluación en tiempo real",
    "Sin formularios tradicionales"
  ],
  warning: "Este es un sistema de validación interactivo, no un formulario de contacto. El proceso garantiza que solo proyectos alineados avanzan a reunión directa. No hay contacto disponible fuera de este sistema.",
  successMessage: "Solo los proyectos que completan el 100% del proceso acceden a una reunión directa."
}

export default validationStages
