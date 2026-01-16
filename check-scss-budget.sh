#!/bin/bash

# Script de verificación de budgets SCSS
# Verifica que los componentes no excedan el límite de 12 KB

echo "🔍 Verificando budgets de SCSS..."
echo ""

# Componentes a verificar
components=(
  "src/app/modules/mailflow/onboarding/onboarding-wizard.component.scss"
  "src/app/modules/mailflow/preview/preview-wizard.component.scss"
)

# Budget máximo (en bytes, 12 KB = 12288)
max_budget=12288
errors=0

for component in "${components[@]}"; do
  if [ -f "$component" ]; then
    size=$(stat -f%z "$component" 2>/dev/null || stat -c%s "$component" 2>/dev/null)
    size_kb=$(echo "scale=2; $size / 1024" | bc)
    
    if [ "$size" -gt "$max_budget" ]; then
      echo "❌ $component: ${size_kb} KB (excede 12 KB)"
      ((errors++))
    else
      echo "✅ $component: ${size_kb} KB"
    fi
  else
    echo "⚠️  $component: No encontrado"
  fi
done

echo ""
echo "📊 Resumen:"
echo "  • Design System: src/assets/css/"
echo "  • Total archivos SCSS globales: $(find src/assets/css/ -name "*.scss" | wc -l | xargs)"
echo "  • Budget por componente: 12 KB"
echo ""

if [ "$errors" -eq 0 ]; then
  echo "✅ Todos los componentes cumplen el budget"
  exit 0
else
  echo "❌ $errors componente(s) exceden el budget"
  echo ""
  echo "💡 Sugerencia: Refactoriza los componentes grandes usando:"
  echo "   1. Clases del design system (assets/css/)"
  echo "   2. Variables y mixins compartidos"
  echo "   3. Utility classes para layout/spacing"
  exit 1
fi
