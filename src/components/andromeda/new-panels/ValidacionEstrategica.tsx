'use client'

import React, { useState } from 'react'
import { ShieldCheck, Users, Code, Building, ArrowRight } from 'lucide-react'
import { strategicValidations } from '@/data/validaciones-estrategicas'
import type { ProfileType } from '@/data/types'
import ValidationModal from '../ValidationModal'

const profileIcons: Record<string, any> = {
  investor: ShieldCheck,
  ally: Users,
  talent: Code,
  institution: Building
}

export default function ValidacionEstrategica() {
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(null)

  return (
    <div className="mt-20 border-t border-slate-800 pt-20">
      <div className="text-center mb-12">
        <h3 className="text-3xl font-bold text-white mb-4">Validaciones Estratégicas</h3>
        <p className="text-slate-400">Selecciona tu perfil para iniciar el proceso de vinculación con Andromeda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {strategicValidations.map((profile) => {
          const Icon = profileIcons[profile.id] || ShieldCheck
          return (
            <button
              key={profile.id}
              onClick={() => setSelectedProfile(profile.id)}
              className="flex flex-col items-center p-8 bg-slate-800/40 border border-slate-700 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800/60 transition-all group text-center"
            >
              <div className="p-4 bg-blue-500/10 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <Icon className="w-8 h-8 text-blue-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">
                {profile.title.replace('Validación para ', '')}
              </h4>
              <p className="text-sm text-slate-400 mb-6">{profile.subtitle}</p>
              <div className="mt-auto flex items-center gap-2 text-blue-400 font-medium text-sm">
                Iniciar Validación <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          )
        })}
      </div>

      {selectedProfile && (
        <ValidationModal 
          isOpen={true}
          profileType={selectedProfile} 
          onClose={() => setSelectedProfile(null)} 
        />
      )}
    </div>
  )
}
