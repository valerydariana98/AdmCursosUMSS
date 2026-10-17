#!/usr/bin/env bash
#
# Publica en GitHub las historias de usuario del módulo de certificados.
#
# Los cuerpos salen de docs/issues/*.md, que genera
# scripts/generar_hu_certificados.py junto con el .docx: así lo publicado en
# GitHub y el documento nunca se desincronizan.
#
# Requisitos:
#   1. GitHub CLI instalado  ->  winget install --id GitHub.cli -e --source winget
#   2. Sesión iniciada      ->  gh auth login
#
# Uso:
#   bash scripts/crear-issues-certificados.sh

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CARPETA_ISSUES="$RAIZ/docs/issues"
ETIQUETA="User Story"

command -v gh >/dev/null 2>&1 || {
  echo "Error: no se encontro 'gh'."
  echo "Instalalo con: winget install --id GitHub.cli -e --source winget"
  exit 1
}

if ! gh auth status >/dev/null 2>&1; then
  echo "No hay sesion iniciada en GitHub. Ejecuta primero:"
  echo "  gh auth login"
  exit 1
}

# Orden de dependencias: HU-01 -> HU-03 -> HU-02 -> HU-04.
ORDEN=(HU-01 HU-03 HU-02 HU-04)

for hu in "${ORDEN[@]}"; do
  archivo="$CARPETA_ISSUES/$hu.md"

  if [[ ! -f "$archivo" ]]; then
    echo "Falta $archivo. Regenera con: python scripts/generar_hu_certificados.py"
    exit 1
  fi

  # El titulo sale de la primera linea con formato '## <id>. <titulo>' del .md,
  # para que la issue y el documento usen exactamente el mismo nombre.
  titulo=$(grep -m1 '^# ' "$archivo" | sed 's/^# //')

  echo "Creando issue: $titulo"

  gh issue create \
    --title "$titulo" \
    --body-file "$archivo" \
    --label "$ETIQUETA"
done

echo
echo "Issues creadas correctamente."