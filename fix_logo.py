import sys

file_path = 'src/app/[locale]/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Buscamos el bloque del logo en el Nav para asegurar que sea visible
old_nav_logo = 'button onClick={() => setShowHologram(true)} className="relative group"'
new_nav_logo = 'button onClick={() => setShowHologram(true)} className="flex items-center justify-center w-10 h-10 overflow-hidden border border-reactor-cyan/30 rounded-sm"'

content = content.replace(old_nav_logo, new_nav_logo)
content = content.replace('className="w-12 h-12 rounded-full border border-reactor-cyan/40 group-hover:scale-110 transition-all"', 'className="w-full h-full object-cover"')

with open(file_path, 'w') as f:
    f.write(content)
