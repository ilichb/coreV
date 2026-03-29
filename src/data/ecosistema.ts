export type ProjectStatus = "ACTIVO" | "EN_DESARROLLO" | "INVESTIGACION" | "PAUSADO"

export interface Project {
  id: string
  name: string
  status: ProjectStatus
  sector: string[]
  description: string
  url?: string
  role: string[]
  impact: string[]
  visible: boolean
}

export const projects: Project[] = [
  {
    id: "gaia-ecotrack",
    name: "Gaia Ecotrack",
    status: "ACTIVO",
    sector: ["Energía renovable", "Blockchain", "DePIN", "RWA"],
    description: "Plataforma de tokenización de energía renovable y gestión de comunidades energéticas",
    url: "https://www.gaiaecotrack.com/",
    role: [
      "Arquitectura tecnológica",
      "Tokenización de energía",
      "Diseño de modelo económico"
    ],
    impact: [
      "Generación distribuida",
      "Créditos de carbono",
      "Comunidades energéticas"
    ],
    visible: true
  },
  {
    id: "anubis-guard",
    name: "Anubis Guard",
    status: "EN_DESARROLLO",
    sector: ["IoT", "Cadena de suministro", "Logística"],
    description: "Sistema de protección de activos y validación en cadenas de suministro",
    role: [
      "Protección de activos",
      "Validación y control"
    ],
    impact: [
      "Seguridad en cadenas de suministro de ayuda humanitaria"
    ],
    visible: true
  },
  {
    id: "ikary",
    name: "Ikary",
    status: "INVESTIGACION",
    sector: ["Seguridad aérea", "Planificación", "Seguridad nacional"],
    description: "Sistema de asistencia inteligente para seguridad aérea",
    role: [
      "Sistemas de asistencia inteligente",
      "Integración con sistemas internacionales"
    ],
    impact: [
      "Disminución de fallos humanos",
      "Mejora en planificación aérea"
    ],
    visible: true
  }
]

export const getVisibleProjects = (): Project[] => {
  return projects.filter(p => p.visible)
}

export const getProjectById = (id: string): Project | undefined => {
  return projects.find(p => p.id === id)
}

export const getProjectsByStatus = (status: ProjectStatus): Project[] => {
  return projects.filter(p => p.status === status && p.visible)
}

export const ecosystemStats = {
  totalProjects: projects.length,
  activeProjects: projects.filter(p => p.status === "ACTIVO").length,
  inDevelopment: projects.filter(p => p.status === "EN_DESARROLLO").length,
  inResearch: projects.filter(p => p.status === "INVESTIGACION").length
}

export default projects
