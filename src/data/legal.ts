export interface LegalDocument {
  id: string
  title: string
  description: string
  lastUpdate: string
  url?: string
  content?: string
  visible: boolean
}

export const legalDocuments: LegalDocument[] = [
  {
    id: "privacy",
    title: "Política de Privacidad",
    description: "Protección y tratamiento de datos estratégicos",
    lastUpdate: "2025-12-27",
    visible: true
  },
  {
    id: "terms",
    title: "Términos del Sistema",
    description: "El contrato madre que rige todas las interacciones",
    lastUpdate: "2025-12-27",
    visible: true
  },
  {
    id: "guidelines",
    title: "Lineamientos de Uso",
    description: "Reglas operativas y protocolos de interacción",
    lastUpdate: "2025-12-27",
    visible: true
  },
  {
    id: "ethics",
    title: "Marco Ético",
    description: "Blindaje reputacional y principios morales",
    lastUpdate: "2025-12-27",
    visible: true
  }
]

export const legalContent = {
  title: "Marco Normativo",
  subtitle: "Transparencia total en operaciones. Documentación legal completa y accesible.",
  intro: "Todo el marco normativo está disponible para consulta pública. Los documentos están actualizados a la última versión vigente.",
  seriousChannel: {
    title: "Canal Serio",
    description: "Comunicación formal protegida para asuntos críticos",
    enabled: true
  }
}

export default legalDocuments
