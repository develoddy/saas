#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[1;35m'
NC='\033[0m' # No Color

# ================= CONFIGURACIÓN =================
PROJECT_DIR="$(pwd)" # Repo local app-saas
BUILD_DIR="dist/app-saas"
DEPLOY_DIR="/Volumes/lujandev/dev/projects/ECOMMERCE/ECOMMERCE-RECURSOS/PRO-DIST/saas_deploy/app-saas"

# Servidor remoto
SSH_USER="root"
SSH_HOST="64.226.123.91"
REMOTE_PATH="/var/www/app_saas_mean"
SSH_KEY="$HOME/.ssh/id_rsa_do"

divider="========================================================="

# ================= BANNER =================
echo -e "${MAGENTA}$divider${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}##       🚀🚀🚀 DEPLOY APP SAAS 🚀🚀🚀                ##${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}$divider${NC}"
echo -e "${YELLOW}🚀 Iniciando proceso de Deploy de APP-SAAS${NC}"
echo -e "${BLUE}$divider${NC}"

# ================= PASO 1: Guardar cambios locales =================
echo -e "\n${CYAN}1️⃣ PASO 1: Guardar cambios en el repo local${NC}"
git add .
git commit -m "💾 Pre-Deploy commit $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1
git push origin main
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Cambios guardados y enviados a GitHub correctamente${NC}"
else
  echo -e "${RED}❌ Error al guardar/enviar cambios a GitHub. Se detiene la ejecución${NC}"
  exit 1
fi

# ================= PASO 2: Compilar Angular =================
echo -e "\n${CYAN}2️⃣ PASO 2: Compilar proyecto Angular${NC}"
npm run build -- --configuration=production
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error en la compilación de Angular. Se detiene la ejecución${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Compilación completada correctamente${NC}"
fi

# ================= PASO 2.5: Limpiar archivos de metadatos de macOS =================
echo -e "\n${CYAN}🧹 LIMPIEZA: Eliminando archivos de metadatos de macOS${NC}"
find "$BUILD_DIR" -name "._*" -type f -delete 2>/dev/null || true
find "$BUILD_DIR" -name ".DS_Store" -type f -delete 2>/dev/null || true
dot_clean "$BUILD_DIR" 2>/dev/null || true
echo -e "${GREEN}✅ Archivos de metadatos eliminados${NC}"

# ================= PASO 3: Sincronizar carpeta de deploy local =================
echo -e "\n${CYAN}3️⃣ PASO 3: Sincronizar archivos con carpeta de deploy local${NC}"
rsync -av --delete --exclude='._*' --exclude='.DS_Store' --filter='P ._*' --filter='P .DS_Store' "$BUILD_DIR/" "$DEPLOY_DIR/"
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al sincronizar archivos. Se detiene la ejecución${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Archivos sincronizados correctamente${NC}"
fi

# ================= PASO 3.5: Verificación final de limpieza =================
echo -e "\n${CYAN}🔍 VERIFICACIÓN: Limpieza final en carpeta de deploy${NC}"
find "$DEPLOY_DIR" -name "._*" -type f -delete 2>/dev/null || true
find "$DEPLOY_DIR" -name ".DS_Store" -type f -delete 2>/dev/null || true
echo -e "${GREEN}✅ Verificación completada${NC}"

# ================= PASO 4: Push final desde deploy local =================
echo -e "\n${CYAN}4️⃣ PASO 4: Push final desde carpeta de deploy local${NC}"
cd "$(dirname "$DEPLOY_DIR")" || exit
git add .
git commit -m "🚀 Deploy APP-SAAS $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1
git push origin main
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Cambios de deploy local enviados a GitHub correctamente${NC}"
else
  echo -e "${RED}❌ Error en push desde deploy local. Se detiene la ejecución${NC}"
  exit 1
fi

# ================= PASO 5: Pull automático en servidor remoto =================
echo -e "\n${CYAN}5️⃣ PASO 5: Actualizar servidor remoto${NC}"
echo -e "${YELLOW}   Descartando cambios locales en servidor...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd $REMOTE_PATH && git reset --hard HEAD && git pull origin main"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Servidor remoto actualizado correctamente${NC}"
else
  echo -e "${RED}❌ Error al actualizar el servidor remoto. Se detiene la ejecución${NC}"
  exit 1
fi

# ================= PASO 5.5: Limpieza final en servidor remoto =================
echo -e "\n${CYAN}🧹 LIMPIEZA REMOTA: Eliminando archivos problemáticos en servidor${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd $REMOTE_PATH && find . -name '._*' -type f -delete 2>/dev/null || true; find . -name '.DS_Store' -type f -delete 2>/dev/null || true; systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Limpieza remota y recarga de nginx completadas${NC}"
else
  echo -e "${YELLOW}⚠️ Limpieza completada (nginx reload opcional falló)${NC}"
fi

# ================= FIN =================
echo -e "${MAGENTA}=========================================================${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}##    🎉🎉🎉 DEPLOY APP-SAAS COMPLETADO 🎉🎉🎉        ##${NC}"
echo -e "${MAGENTA}##       ✅ Todo actualizado y en producción ✅        ##${NC}"
echo -e "${MAGENTA}##          🥳🚀🎊 FELICIDADES 🚀🎊🥳                  ##${NC}"
echo -e "${MAGENTA}##                                                     ##${NC}"
echo -e "${MAGENTA}=========================================================${NC}\n"
