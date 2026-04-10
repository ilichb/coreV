import sys

file_path = 'src/app/[locale]/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Definimos el nuevo bloque del Modal con efectos avanzados
new_hologram_modal = '''{showHologram && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-hologramFadeIn" 
          onClick={() => setShowHologram(false)}
        >
          {/* Contenedor Principal del Holograma con Escaneo */}
          <div className="relative group p-10" onClick={(e) => e.stopPropagation()}>
            
            {/* 1. Brillo de Fondo (Glow Area) */}
            <div className="absolute inset-0 bg-reactor-cyan/10 rounded-full blur-[150px] animate-pulse"></div>
            
            {/* 2. El Logo con Efectos de Glitch y Parpadeo */}
            <div className="relative animate-hologramAppear">
              <img 
                src="/images/logo.jpg" 
                alt="Andromeda Hologram" 
                className="w-80 h-80 object-contain rounded-sm border border-reactor-cyan/30 shadow-[0_0_60px_rgba(0,240,255,0.4)] opacity-90 mix-blend-screen" 
              />
              
              {/* 3. Superposición de Líneas de Escaneo (Scanlines) */}
              <div className="absolute inset-0 bg-scanlines opacity-30 mix-blend-overlay rounded-sm"></div>
              
              {/* 4. Efecto de Brillo Intenso Aleatorio (Flicker) */}
              <div className="absolute inset-0 bg-reactor-cyan/20 blur-sm animate-hologramFlicker rounded-sm"></div>
            </div>
            
            {/* 5. Marco Técnico Decorativo (Opcional, estilo Sci-Fi) */}
            <div className="absolute -inset-2 border border-reactor-cyan/10 rounded-lg pointer-events-none group-hover:border-reactor-cyan/30 transition-colors"></div>
            <div className="absolute -inset-1 border-t-2 border-l-2 border-reactor-cyan/40 w-10 h-10 top-0 left-0 rounded-tl-lg"></div>
            <div className="absolute -inset-1 border-b-2 border-r-2 border-reactor-cyan/40 w-10 h-10 bottom-0 right-0 rounded-br-lg"></div>
            
          </div>
        </div>
      )}'''

# Reemplazamos el bloque antiguo del modal por el nuevo
import re
pattern = r'{showHologram && \(.*?</div>\s*</div>\s*</div>\s*\)}'
content = re.sub(pattern, new_hologram_modal, content, flags=re.DOTALL)

# 2. Definimos las Keyframes y Clases de Tailwind necesarias (al final del archivo)
new_styles = '''
      <style>{`
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        
        /* Efecto de Aparición del Holograma (Glitch Inicial) */
        @keyframes hologramAppear {
          0% { opacity: 0; transform: scale(1.1) translateY(20px); filter: brightness(3) blur(5px); }
          10% { opacity: 1; transform: scale(1) translateY(0); filter: brightness(1) blur(0px); }
          15% { transform: translateX(-5px); filter: hue-rotate(90deg); }
          20% { transform: translateX(5px); }
          25% { transform: translateX(0); filter: hue-rotate(0deg); }
          100% { opacity: 0.9; }
        }
        
        /* Parpadeo Aleatorio de Brillo (Flicker) */
        @keyframes hologramFlicker {
          0%, 100% { opacity: 0.2; }
          5%, 15%, 25%, 45%, 55%, 65%, 85%, 95% { opacity: 0.4; }
          10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90% { opacity: 0.1; }
        }
        
        /* Difuminado de Entrada del Fondo */
        @keyframes hologramFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .animate-hologramAppear { animation: hologramAppear 0.5s ease-out forwards; }
        .animate-hologramFlicker { animation: hologramFlicker 3s infinite; }
        .animate-hologramFadeIn { animation: hologramFadeIn 0.3s ease-out forwards; }
        
        /* Patrón de Líneas de Escaneo (Scanlines) */
        .bg-scanlines {
          background: linear-gradient(
            to bottom,
            transparent,
            transparent 50%,
            rgba(0, 0, 0, 0.5) 50%,
            rgba(0, 0, 0, 0.5)
          );
          background-size: 100% 4px;
        }
      `}</style>
    </div>
  );
}'''

# Reemplazamos el bloque de estilos antiguo por el nuevo
content = re.sub(r'<style>{`.*?`}</style>\s*</div>\s*\);\s*}', new_styles, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)
