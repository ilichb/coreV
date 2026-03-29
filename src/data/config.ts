export const siteConfig = {
  name: "Andromeda Computer",
  tagline: "Andromeda Coordination Layer",
  description: "Coordinación inter-ecosistema para construir proyectos Web3 reales",
  url: "https://andromedacomputer.net",
  features: {
    showContactEmail: false,
    showPublicPhone: false,
    showCalendlyLinks: false,
    enableDirectContact: false,
    enableValidacionEstrategica: true,
    enableConstructSystem: true,
    enableDAOModule: true,
    enableEcosystemPanel: true,
    enableDeveloperMode: true,
    showProjectDetails: true,
    showLegalDocuments: true,
    showSystemStatus: true,
    showBitacora: true,
    showOfficialComms: true,
  },
  contact: {
    internalEmail: "contacto@andromedacomputer.net",
    publicEmail: null,
    publicPhone: null,
    calendlyUrl: "https://calendly.com/andromedacomputerca/talk-business",
    social: { twitter: null, linkedin: null, github: "https://github.com/ilichb/andromeda-computer" }
  },
  validation: {
    calendlyAfterValidation: "https://calendly.com/andromedacomputerca/talk-business",
    minimumScore: 14,
    requiredStages: 4,
  },
  system: {
    version: "v0.1",
    status: "OPERATIVO",
    mode: "ANDROMEDA COORDINATION LAYER",
    lastUpdate: "2025-12-30",
    buildNumber: "20251230"
  },
  modes: { defaultMode: "andromeda", allowModeSwitch: true }
}

export const isFeatureEnabled = (feature: keyof typeof siteConfig.features): boolean => siteConfig.features[feature] === true
export const getPublicEmail = () => siteConfig.features.showContactEmail ? siteConfig.contact.publicEmail : null
export const getCalendlyUrl = () => siteConfig.features.showCalendlyLinks ? siteConfig.contact.calendlyUrl : null
export const getValidationCalendly = () => siteConfig.validation.calendlyAfterValidation

export default siteConfig
