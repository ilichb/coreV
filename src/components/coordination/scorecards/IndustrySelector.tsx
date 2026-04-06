'use client';

import React, { useState, useEffect } from 'react';
import { IndustryValidator, type IndustryTaxonomy } from '@/lib/industries/validator';
import { 
  Building2, 
  Cpu, 
  Film, 
  Users, 
  Home, 
  FlaskConical, 
  Zap, 
  Truck, 
  GraduationCap, 
  Shield, 
  Brain,
  ChevronDown,
  Search,
  Check,
  X,
  Tag,
  Layers
} from 'lucide-react';

interface IndustrySelectorProps {
  value?: IndustryTaxonomy;
  onChange: (taxonomy: IndustryTaxonomy | undefined) => void;
  showTransversalLayers?: boolean;
  required?: boolean;
  label?: string;
}

// Mapeo de iconos por industria
const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  finance: <Building2 className="w-4 h-4" />,
  infrastructure: <Cpu className="w-4 h-4" />,
  media: <Film className="w-4 h-4" />,
  organizations: <Users className="w-4 h-4" />,
  rwa: <Home className="w-4 h-4" />,
  science: <FlaskConical className="w-4 h-4" />,
  energy: <Zap className="w-4 h-4" />,
  supplychain: <Truck className="w-4 h-4" />,
  education: <GraduationCap className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  ai: <Brain className="w-4 h-4" />
};

// Colores por industria (Hard-Tech Industrial palette)
const INDUSTRY_COLORS: Record<string, string> = {
  finance: 'border-reactor-cyan text-reactor-cyan bg-reactor-cyan/5',
  infrastructure: 'border-steel-gray text-steel-gray bg-steel-gray/5',
  media: 'border-warning-orange text-warning-orange bg-warning-orange/5',
  organizations: 'border-emerald-green text-emerald-green bg-emerald-green/5',
  rwa: 'border-bronze text-bronze bg-bronze/5',
  science: 'border-lab-purple text-lab-purple bg-lab-purple/5',
  energy: 'border-solar-yellow text-solar-yellow bg-solar-yellow/5',
  supplychain: 'border-logistics-blue text-logistics-blue bg-logistics-blue/5',
  education: 'border-knowledge-teal text-knowledge-teal bg-knowledge-teal/5',
  security: 'border-security-red text-security-red bg-security-red/5',
  ai: 'border-ai-magenta text-ai-magenta bg-ai-magenta/5'
};

export default function IndustrySelector({
  value,
  onChange,
  showTransversalLayers = true,
  required = false,
  label = 'INDUSTRY_TAXONOMY'
}: IndustrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(value?.industryId || null);
  const [selectedSubIndustry, setSelectedSubIndustry] = useState<string | null>(value?.subIndustryId || null);
  const [selectedTransversalLayers, setSelectedTransversalLayers] = useState<Array<'identity' | 'privacy'>>(
    value?.transversalLayers || []
  );

  const industries = IndustryValidator.getAllIndustries();
  const filteredIndustries = industries.filter(industry => 
    industry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subIndustries = selectedIndustry 
    ? IndustryValidator.getSubIndustries(selectedIndustry)
    : [];

  const filteredSubIndustries = subIndustries.filter(sub => 
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const availableTransversalLayers = selectedIndustry
    ? IndustryValidator.getTransversalLayersForIndustry(selectedIndustry)
    : [];

  // Efecto para actualizar el valor cuando cambian las selecciones
  useEffect(() => {
    if (selectedIndustry && selectedSubIndustry) {
      const hierarchy = IndustryValidator.getIndustryHierarchy(selectedSubIndustry);
      if (hierarchy) {
        const taxonomy: IndustryTaxonomy = {
          industryId: selectedIndustry,
          subIndustryId: selectedSubIndustry,
          isWeb3: hierarchy.isWeb3,
          transversalLayers: selectedTransversalLayers.length > 0 ? selectedTransversalLayers : undefined
        };
        onChange(taxonomy);
      }
    } else if (!required) {
      onChange(undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndustry, selectedSubIndustry, selectedTransversalLayers, required]);

  // Efecto para inicializar desde el valor proporcionado (solo en mount)
  useEffect(() => {
    if (value) {
      setSelectedIndustry(value.industryId);
      setSelectedSubIndustry(value.subIndustryId);
      setSelectedTransversalLayers(value.transversalLayers || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo en mount — evita loop con onChange

  const handleIndustrySelect = (industryId: string) => {
    setSelectedIndustry(industryId);
    setSelectedSubIndustry(null);
    setSearchTerm('');
  };

  const handleSubIndustrySelect = (subIndustryId: string) => {
    setSelectedSubIndustry(subIndustryId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleTransversalLayerToggle = (layerId: 'identity' | 'privacy') => {
    setSelectedTransversalLayers(prev => 
      prev.includes(layerId)
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  const handleClear = () => {
    setSelectedIndustry(null);
    setSelectedSubIndustry(null);
    setSelectedTransversalLayers([]);
    setSearchTerm('');
    onChange(undefined);
  };

  const getDisplayText = () => {
    if (selectedIndustry && selectedSubIndustry) {
      const hierarchy = IndustryValidator.getIndustryHierarchy(selectedSubIndustry);
      if (hierarchy) {
        return `${hierarchy.industryName} • ${hierarchy.subIndustryName} • ${hierarchy.isWeb3 ? 'WEB3' : 'TRADICIONAL'}`;
      }
    }
    return 'SELECT_INDUSTRY_CATEGORY';
  };

  const getHierarchyInfo = () => {
    if (selectedIndustry && selectedSubIndustry) {
      return IndustryValidator.getIndustryHierarchy(selectedSubIndustry);
    }
    return null;
  };

  const hierarchyInfo = getHierarchyInfo();

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-mono-display font-bold text-gray-400 uppercase tracking-widest">
          {label} {required && <span className="text-security-red">*</span>}
        </label>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[9px] font-mono-display text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors"
          >
            CLEAR_SELECTION
          </button>
        )}
      </div>

      {/* Selector Principal */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-4 border rounded-[2px] text-left font-mono-display text-sm transition-all duration-300 ${
            selectedIndustry && INDUSTRY_COLORS[selectedIndustry]
              ? INDUSTRY_COLORS[selectedIndustry]
              : 'bg-black/40 border-white/10 text-gray-400 hover:border-reactor-cyan/30 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedIndustry && INDUSTRY_ICONS[selectedIndustry] ? (
                <div className={`p-2 rounded-[2px] ${INDUSTRY_COLORS[selectedIndustry]?.split(' ')[0]}/10 border ${INDUSTRY_COLORS[selectedIndustry]?.split(' ')[0]}/20`}>
                  {INDUSTRY_ICONS[selectedIndustry]}
                </div>
              ) : (
                <div className="p-2 rounded-[2px] bg-white/5 border border-white/10">
                  <Tag className="w-4 h-4 text-gray-600" />
                </div>
              )}
              <span className={`font-bold ${selectedIndustry ? 'text-gray-100' : 'text-gray-500'}`}>
                {getDisplayText()}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-black/95 border border-reactor-cyan/20 rounded-[2px] shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-5 duration-300 overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-white/10 bg-black/80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="SEARCH_INDUSTRY_OR_KEYWORD..."
                  className="w-full bg-black/60 border border-white/10 rounded-[2px] pl-10 pr-4 py-3 text-sm font-mono-display text-gray-100 placeholder:text-gray-700 focus:border-reactor-cyan/50 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {/* Selección de Industria */}
              {!selectedIndustry && (
                <div className="p-4 border-b border-white/5">
                  <h4 className="text-[10px] font-mono-display font-bold text-gray-500 uppercase tracking-widest mb-3">
                    SELECT_INDUSTRY [{filteredIndustries.length}]
                  </h4>
                  <div className="space-y-2">
                    {filteredIndustries.map((industry) => (
                      <button
                        key={industry.id}
                        type="button"
                        onClick={() => handleIndustrySelect(industry.id)}
                        className="w-full p-3 text-left border border-white/5 rounded-[2px] hover:border-reactor-cyan/30 hover:bg-reactor-cyan/5 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-[2px] ${INDUSTRY_COLORS[industry.id]?.split(' ')[0]}/10 border ${INDUSTRY_COLORS[industry.id]?.split(' ')[0]}/20`}>
                            {INDUSTRY_ICONS[industry.id] || <Tag className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-mono-display font-bold text-gray-100 group-hover:text-reactor-cyan">
                                {industry.name}
                              </span>
                              <div className="flex gap-1">
                                {industry.metadata.hasTraditional && (
                                  <span className="text-[8px] font-mono-display text-gray-600 bg-white/5 px-2 py-1 rounded-[1px] uppercase">
                                    TRAD
                                  </span>
                                )}
                                {industry.metadata.hasWeb3 && (
                                  <span className="text-[8px] font-mono-display text-reactor-cyan bg-reactor-cyan/10 px-2 py-1 rounded-[1px] uppercase">
                                    WEB3
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-500 font-mono-display mt-1 leading-tight">
                              {industry.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selección de Subindustria */}
              {selectedIndustry && (
                <div className="p-4">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setSelectedIndustry(null)}
                      className="text-[10px] font-mono-display text-gray-500 hover:text-gray-300 uppercase tracking-widest flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      BACK_TO_INDUSTRIES
                    </button>
                    <span className="text-gray-700">/</span>
                    <span className="text-[10px] font-mono-display font-bold text-reactor-cyan uppercase tracking-widest">
                      {industries.find(i => i.id === selectedIndustry)?.name}
                    </span>
                  </div>

                  <h4 className="text-[10px] font-mono-display font-bold text-gray-500 uppercase tracking-widest mb-3">
                    SELECT_SUBINDUSTRY [{filteredSubIndustries.length}]
                  </h4>

                  <div className="space-y-2">
                    {filteredSubIndustries.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSubIndustrySelect(sub.id)}
                        className={`w-full p-3 text-left border rounded-[2px] transition-all ${
                          selectedSubIndustry === sub.id
                            ? 'border-reactor-cyan bg-reactor-cyan/10'
                            : 'border-white/5 hover:border-reactor-cyan/30 hover:bg-reactor-cyan/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-[2px] ${
                              sub.isWeb3
                                ? 'bg-reactor-cyan/10 border border-reactor-cyan/20'
                                : 'bg-white/5 border border-white/10'
                            }`}>
                              {sub.isWeb3 ? (
                                <Cpu className="w-4 h-4 text-reactor-cyan" />
                              ) : (
                                <Building2 className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono-display font-bold text-gray-100">
                                  {sub.name}
                                </span>
                                <span className={`text-[8px] font-mono-display uppercase px-2 py-1 rounded-[1px] ${
                                  sub.isWeb3
                                    ? 'text-reactor-cyan bg-reactor-cyan/10'
                                    : 'text-gray-500 bg-white/5'
                                }`}>
                                  {sub.isWeb3 ? 'WEB3' : 'TRADICIONAL'}
                                </span>
                              </div>
                              {sub.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {sub.keywords.slice(0, 3).map((keyword, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[8px] font-mono-display text-gray-600 bg-black/40 px-2 py-0.5 rounded-[1px] uppercase"
                                    >
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedSubIndustry === sub.id && (
                            <Check className="w-4 h-4 text-reactor-cyan" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Información de la selección */}
      {hierarchyInfo && (
        <div className={`p-4 border rounded-[2px] ${INDUSTRY_COLORS[selectedIndustry!]}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {INDUSTRY_ICONS[selectedIndustry!]}
                <h4 className="text-xs font-mono-display font-bold text-gray-100 uppercase tracking-widest">
                  {hierarchyInfo.industryName} / {hierarchyInfo.subIndustryName}
                </h4>
              </div>
              <p className="text-[10px] text-gray-500 font-mono-display mb-3">
                {hierarchyInfo.description}
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono-display uppercase px-3 py-1 rounded-[1px] ${
                  hierarchyInfo.isWeb3
                    ? 'text-reactor-cyan bg-reactor-cyan/10 border border-reactor-cyan/20'
                    : 'text-gray-400 bg-white/5 border border-white/10'
                }`}>
                  {hierarchyInfo.isWeb3 ? 'WEB3_ECOSYSTEM' : 'TRADITIONAL_INDUSTRY'}
                </span>
                <span className="text-[9px] font-mono-display text-gray-600 uppercase">
                  ID: {hierarchyInfo.subIndustryId}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-mono-display text-gray-600 uppercase tracking-widest mb-1">
                TAXONOMY_VERIFIED
              </div>
              <Check className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Capas Transversales */}
      {showTransversalLayers && selectedIndustry && availableTransversalLayers.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-gray-600" />
            <label className="text-[10px] font-mono-display font-bold text-gray-400 uppercase tracking-widest">
              TRANSVERSAL_LAYERS (OPTIONAL)
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTransversalLayers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => handleTransversalLayerToggle(layer.id as 'identity' | 'privacy')}
                className={`px-4 py-2 border rounded-[2px] text-[10px] font-mono-display font-bold uppercase tracking-widest transition-all ${
                  selectedTransversalLayers.includes(layer.id as 'identity' | 'privacy')
                    ? 'border-reactor-cyan text-reactor-cyan bg-reactor-cyan/10'
                    : 'border-white/10 text-gray-500 bg-white/5 hover:border-reactor-cyan/30 hover:text-gray-300'
                }`}
              >
                {layer.name}
                {selectedTransversalLayers.includes(layer.id as 'identity' | 'privacy') && (
                  <Check className="inline-block w-3 h-3 ml-2" />
                )}
              </button>
            ))}
          </div>
          {availableTransversalLayers.length > 0 && (
            <p className="text-[9px] text-gray-600 font-mono-display mt-2 uppercase tracking-wider">
              These layers apply across multiple industries and represent cross-cutting concerns
            </p>
          )}
        </div>
      )}

      {/* Estadísticas de la taxonomía (debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 border border-white/5 rounded-[2px]">
          <div className="text-[9px] font-mono-display text-gray-600 uppercase tracking-widest mb-2">
            TAXONOMY_STATS
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-display">
            <div className="text-gray-500">Industries:</div>
            <div className="text-gray-300">{IndustryValidator.getTaxonomyStats().totalIndustries}</div>
            <div className="text-gray-500">Trad Subindustries:</div>
            <div className="text-gray-300">{IndustryValidator.getTaxonomyStats().totalTraditionalSubIndustries}</div>
            <div className="text-gray-500">Web3 Subindustries:</div>
            <div className="text-gray-300">{IndustryValidator.getTaxonomyStats().totalWeb3SubIndustries}</div>
            <div className="text-gray-500">Total:</div>
            <div className="text-gray-300">{IndustryValidator.getTaxonomyStats().totalSubIndustries}</div>
          </div>
        </div>
      )}
    </div>
  );
}