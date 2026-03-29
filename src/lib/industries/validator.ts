import industriesData from '../../data/industries.json';

export interface IndustryTaxonomy {
  industryId: string;
  subIndustryId: string;
  isWeb3: boolean;
  transversalLayers?: Array<'identity' | 'privacy'>;
}

export interface IndustryHierarchy {
  industryId: string;
  industryName: string;
  subIndustryId: string;
  subIndustryName: string;
  isWeb3: boolean;
  keywords: string[];
  description?: string;
}

export interface IndustryInfo {
  id: string;
  name: string;
  description: string;
  metadata: {
    hasTraditional: boolean;
    hasWeb3: boolean;
  };
}

/**
 * Validador central para la taxonomía de industrias del Índice Maestro
 */
export class IndustryValidator {
  private static industries = industriesData.industries;
  private static transversalLayers = industriesData.transversalLayers;

  /**
   * Valida si un industryId existe en el Índice Maestro
   */
  static validateIndustryId(industryId: string): boolean {
    return this.industries.some(industry => industry.id === industryId);
  }

  /**
   * Valida si un subIndustryId existe en el Índice Maestro
   */
  static validateSubIndustryId(subIndustryId: string): boolean {
    const parts = subIndustryId.split('.');
    if (parts.length < 3) return false;

    const industryId = parts[0];
    const type = parts[1]; // 'trad' o 'web3'
    const subId = parts.slice(2).join('.');

    const industry = this.industries.find(ind => ind.id === industryId);
    if (!industry) return false;

    const subIndustries = type === 'trad'
      ? industry.subIndustries.traditional
      : industry.subIndustries.web3;

    return subIndustries.some(sub => sub.id === subIndustryId);
  }

  /**
   * Obtiene la jerarquía completa de una subindustria
   */
  static getIndustryHierarchy(subIndustryId: string): IndustryHierarchy | null {
    if (!this.validateSubIndustryId(subIndustryId)) {
      return null;
    }

    const parts = subIndustryId.split('.');
    const industryId = parts[0];
    const type = parts[1];
    const subId = parts.slice(2).join('.');

    const industry = this.industries.find(ind => ind.id === industryId)!;
    const isWeb3 = type === 'web3';

    const subIndustries = isWeb3
      ? industry.subIndustries.web3
      : industry.subIndustries.traditional;

    const subIndustry = subIndustries.find(sub => sub.id === subIndustryId)!;

    return {
      industryId,
      industryName: industry.name,
      subIndustryId,
      subIndustryName: subIndustry.name,
      isWeb3,
      keywords: subIndustry.keywords,
      description: industry.description
    };
  }

  /**
   * Obtiene todas las industrias principales
   */
  static getAllIndustries(): IndustryInfo[] {
    return this.industries.map(industry => ({
      id: industry.id,
      name: industry.name,
      description: industry.description,
      metadata: industry.metadata
    }));
  }

  /**
   * Obtiene todas las subindustrias (tradicionales y web3) de una industria
   */
  static getSubIndustries(industryId: string): Array<{
    id: string;
    name: string;
    isWeb3: boolean;
    keywords: string[];
  }> {
    const industry = this.industries.find(ind => ind.id === industryId);
    if (!industry) return [];

    const traditional = industry.subIndustries.traditional.map(sub => ({
      id: sub.id,
      name: sub.name,
      isWeb3: false,
      keywords: sub.keywords
    }));

    const web3 = industry.subIndustries.web3.map(sub => ({
      id: sub.id,
      name: sub.name,
      isWeb3: true,
      keywords: sub.keywords
    }));

    return [...traditional, ...web3];
  }

  /**
   * Obtiene todas las subindustrias web3
   */
  static getAllWeb3SubIndustries(): Array<{
    id: string;
    name: string;
    industryId: string;
    industryName: string;
    keywords: string[];
  }> {
    return this.industries.flatMap(industry =>
      industry.subIndustries.web3.map(sub => ({
        id: sub.id,
        name: sub.name,
        industryId: industry.id,
        industryName: industry.name,
        keywords: sub.keywords
      }))
    );
  }

  /**
   * Obtiene todas las subindustrias tradicionales
   */
  static getAllTraditionalSubIndustries(): Array<{
    id: string;
    name: string;
    industryId: string;
    industryName: string;
    keywords: string[];
  }> {
    return this.industries.flatMap(industry =>
      industry.subIndustries.traditional.map(sub => ({
        id: sub.id,
        name: sub.name,
        industryId: industry.id,
        industryName: industry.name,
        keywords: sub.keywords
      }))
    );
  }

  /**
   * Busca subindustrias por keywords
   */
  static searchByKeywords(keywords: string[]): IndustryHierarchy[] {
    const results: IndustryHierarchy[] = [];

    this.industries.forEach(industry => {
      // Buscar en subindustrias tradicionales
      industry.subIndustries.traditional.forEach(sub => {
        const matches = sub.keywords.some(keyword =>
          keywords.some(k => keyword.toLowerCase().includes(k.toLowerCase()))
        );
        if (matches) {
          results.push({
            industryId: industry.id,
            industryName: industry.name,
            subIndustryId: sub.id,
            subIndustryName: sub.name,
            isWeb3: false,
            keywords: sub.keywords,
            description: industry.description
          });
        }
      });

      // Buscar en subindustrias web3
      industry.subIndustries.web3.forEach(sub => {
        const matches = sub.keywords.some(keyword =>
          keywords.some(k => keyword.toLowerCase().includes(k.toLowerCase()))
        );
        if (matches) {
          results.push({
            industryId: industry.id,
            industryName: industry.name,
            subIndustryId: sub.id,
            subIndustryName: sub.name,
            isWeb3: true,
            keywords: sub.keywords,
            description: industry.description
          });
        }
      });
    });

    return results;
  }

  /**
   * Valida si una capa transversal aplica a una industria
   */
  static validateTransversalLayer(industryId: string, layerId: 'identity' | 'privacy'): boolean {
    const layer = this.transversalLayers.find(l => l.id === layerId);
    if (!layer) return false;

    return layer.appliesTo.includes(industryId);
  }

  /**
   * Obtiene las capas transversales que aplican a una industria
   */
  static getTransversalLayersForIndustry(industryId: string): Array<{
    id: string;
    name: string;
    description: string;
  }> {
    return this.transversalLayers.filter(layer =>
      layer.appliesTo.includes(industryId)
    ).map(layer => ({
      id: layer.id,
      name: layer.name,
      description: layer.description
    }));
  }

  /**
   * Convierte una taxonomía a un formato legible para display
   */
  static formatTaxonomyDisplay(taxonomy: IndustryTaxonomy): {
    industry: string;
    subIndustry: string;
    type: 'TRADICIONAL' | 'WEB3';
    layers?: string[];
  } {
    const hierarchy = this.getIndustryHierarchy(taxonomy.subIndustryId);
    if (!hierarchy) {
      return {
        industry: 'Desconocida',
        subIndustry: 'Desconocida',
        type: taxonomy.isWeb3 ? 'WEB3' : 'TRADICIONAL'
      };
    }

    return {
      industry: hierarchy.industryName,
      subIndustry: hierarchy.subIndustryName,
      type: taxonomy.isWeb3 ? 'WEB3' : 'TRADICIONAL',
      layers: taxonomy.transversalLayers?.map(layer =>
        this.transversalLayers.find(l => l.id === layer)?.name || layer
      )
    };
  }

  /**
   * Obtiene estadísticas de uso de la taxonomía (para debugging)
   */
  static getTaxonomyStats(): {
    totalIndustries: number;
    totalTraditionalSubIndustries: number;
    totalWeb3SubIndustries: number;
    totalSubIndustries: number;
    industriesWithBothTypes: string[];
  } {
    const industriesWithBothTypes = this.industries
      .filter(ind => ind.metadata.hasTraditional && ind.metadata.hasWeb3)
      .map(ind => ind.name);

    const totalTraditional = this.industries.reduce(
      (sum, ind) => sum + ind.subIndustries.traditional.length, 0
    );

    const totalWeb3 = this.industries.reduce(
      (sum, ind) => sum + ind.subIndustries.web3.length, 0
    );

    return {
      totalIndustries: this.industries.length,
      totalTraditionalSubIndustries: totalTraditional,
      totalWeb3SubIndustries: totalWeb3,
      totalSubIndustries: totalTraditional + totalWeb3,
      industriesWithBothTypes
    };
  }
}

/**
 * Schema Zod para validación de taxonomía
 */
export const IndustryTaxonomySchema = {
  industryId: (z: any) => z.string().refine(
    (id: string) => IndustryValidator.validateIndustryId(id),
    { message: "Industria no válida" }
  ),

  subIndustryId: (z: any) => z.string().refine(
    (id: string) => IndustryValidator.validateSubIndustryId(id),
    { message: "Subindustria no válida" }
  ),

  isWeb3: (z: any) => z.boolean(),

  transversalLayers: (z: any) => z.array(
    z.enum(['identity', 'privacy'])
  ).optional()
};

/**
 * Función helper para crear un objeto de taxonomía
 */
export function createTaxonomy(
  industryId: string,
  subIndustryId: string,
  isWeb3: boolean,
  transversalLayers?: Array<'identity' | 'privacy'>
): IndustryTaxonomy {
  return {
    industryId,
    subIndustryId,
    isWeb3,
    transversalLayers
  };
}