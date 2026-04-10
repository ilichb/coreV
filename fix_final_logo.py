import sys

file_path = 'src/app/[locale]/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Buscamos la sección del logo en el NAV
# Definimos el nuevo bloque con dimensiones explícitas y sin restricciones
new_logo_block = '''<div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHologram(true)} 
              className="flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] overflow-hidden border border-reactor-cyan/30 bg-black rounded-sm"
            >
              <img 
                src="/images/logo.jpg" 
                alt="Logo" 
                className="w-full h-full object-cover block"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.innerHTML = '<div class="w-2 h-2 bg-reactor-cyan rounded-full animate-pulse"></div>';
                }}
              />
            </button>
            <span className="font-mono font-bold text-sm tracking-widest text-white uppercase">ANDROMEDA<span className="text-reactor-cyan">CORE</span></span>
          </div>'''

# Localizamos el contenedor del logo actual (desde el div hasta el span) y lo reemplazamos
import re
pattern = r'<div className="flex items-center gap-3">.*?ANDROMEDA.*?CORE.*?</span>\s*</div>'
content = re.sub(pattern, new_logo_block, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)
