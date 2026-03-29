'use client';

import React from 'react';
import { motion } from 'framer-motion';

const PanelNavegacion = () => {
  return (
    <section 
      id="navegacion" 
      className="min-h-screen w-full flex items-center justify-center px-4 py-20 md:py-0"
      data-panel="navegacion"
    >
      <div className="max-w-6xl w-full mx-auto">
        {/* Contenedor principal con efecto vidrio */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="glass-panel p-8 md:p-12 rounded-2xl border border-white/10 backdrop-blur-xl"
        >
          {/* Título principal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                ANDROMEDA COMPUTER
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 font-light mb-8 max-w-3xl mx-auto">
              Sistema para la creación de soluciones Web3 de alto impacto
            </p>
            
            <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full mb-10"></div>
          </motion.div>

          {/* Subtítulo descriptivo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12 text-center"
          >
            <p className="text-lg md:text-xl text-gray-400 italic max-w-4xl mx-auto leading-relaxed">
              Diseñamos, guiamos y construimos infraestructuras digitales sostenibles para ecosistemas, comunidades y organizaciones del mundo real.
            </p>
          </motion.div>

          {/* Estado del sistema - Visual */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {/* SYSTEM STATUS */}
              <div className="system-status-card p-4 rounded-xl border border-green-500/20 bg-green-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">SYSTEM STATUS</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                    <span className="text-green-400 font-mono text-sm">ONLINE</span>
                  </div>
                </div>
              </div>

              {/* MODE */}
              <div className="system-status-card p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">MODE</span>
                  <span className="text-blue-400 font-mono text-sm">ANDROMEDA</span>
                </div>
              </div>

              {/* ACCESS LEVEL */}
              <div className="system-status-card p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">ACCESS LEVEL</span>
                  <span className="text-purple-400 font-mono text-sm">PUBLIC INTERFACE</span>
                </div>
              </div>

              {/* VERSION */}
              <div className="system-status-card p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">VERSION</span>
                  <span className="text-cyan-400 font-mono text-sm">v0.1</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Narrativa breve */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mb-16 text-center max-w-3xl mx-auto"
          >
            <div className="border-l-4 border-cyan-500 pl-6 py-4">
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                <span className="font-semibold text-cyan-300">Andromeda Computer no vende servicios.</span>
                <br />
                <span className="font-semibold text-blue-300">Opera procesos.</span>
                <br />
                <span className="font-semibold text-purple-300">Filtra, valida y ejecuta proyectos que tienen impacto en nuestra sociedad.</span>
              </p>
            </div>
          </motion.div>

          {/* Indicador de scroll */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2, repeat: Infinity, repeatType: "reverse" }}
            className="text-center"
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-gray-400 text-sm mb-2">↓ Desplázate para acceder al sistema</span>
              <div className="w-6 h-10 border-2 border-gray-500 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-bounce"></div>
              </div>
            </div>
          </motion.div>

          {/* Sección "¿QUÉ ES ANDROMEDA?" (según especificación) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-20 pt-10 border-t border-white/10"
          >
            <div className="max-w-4xl mx-auto">
              {/* Bloque 2 - Definición */}
              <div className="mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-300">
                  ¿QUÉ ES ANDROMEDA?
                </h2>
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                  <p className="text-lg text-gray-400 leading-relaxed">
                    <span className="text-cyan-300 font-semibold">Andromeda Computer</span> es una plataforma de desarrollo que actúa como un sistema de coordinación entre ideas, comunidades, tecnología y ejecución.
                  </p>
                </div>
              </div>

              {/* Bloque 3 - Diferenciador */}
              <div className="mb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-red-500/5 p-6 rounded-xl border border-red-500/20">
                    <h3 className="text-xl font-bold mb-4 text-red-400">No somos</h3>
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                        <span className="text-gray-400">Una agencia</span>
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                        <span className="text-gray-400">Un SaaS</span>
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                        <span className="text-gray-400">Un estudio freelance</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-green-500/5 p-6 rounded-xl border border-green-500/20">
                    <h3 className="text-xl font-bold mb-4 text-green-400">Somos</h3>
                    <p className="text-lg text-gray-400 leading-relaxed">
                      Un sistema que diseña, ordena y ejecuta soluciones complejas en entornos Web3 y tradicionales.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloque 4 - Principios */}
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-300">Principios</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: 'Impacto social real', color: 'from-purple-500 to-pink-500' },
                    { title: 'Sustentabilidad técnica y económica', color: 'from-green-500 to-emerald-500' },
                    { title: 'Neutralidad de protocolo', color: 'from-blue-500 to-cyan-500' },
                    { title: 'Enfoque sistémico, no feature-based', color: 'from-orange-500 to-red-500' }
                  ].map((principle, index) => (
                    <div 
                      key={index}
                      className="bg-white/5 p-5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className={`h-1 w-full bg-gradient-to-r ${principle.color} rounded-full mb-4`}></div>
                      <p className="text-gray-400 font-medium">{principle.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default PanelNavegacion;
