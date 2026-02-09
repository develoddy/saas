# 🎯 Cómo probar el MVP Hub dinámico

## ⚡ Quick Start

### 1️⃣ **Aplicar migración**

```bash
cd api
npm run migrate
```

Esto creará la columna `show_in_store` en la tabla `modules` y activará los 3 MVPs existentes.

---

### 2️⃣ **Iniciar backend**

```bash
cd api
npm run dev
```

Debería mostrar:
```
✅ Conectado a MySQL
🚀 Servidor corriendo en puerto 3500
```

---

### 3️⃣ **Probar endpoint**

En otra terminal:
```bash
curl http://localhost:3500/mvp-hub/modules | jq
```

**Respuesta esperada:**
```json
{
  "success": true,
  "count": 3,
  "mvps": [
    {
      "key": "video-express",
      "name": "Video Express",
      "tagline": "...",
      "icon": "bi-camera-video-fill",
      "color": "#8b5cf6",
      "status": "live",
      "type": "saas",
      "features": [...],
      "previewRoute": "/preview/video-express",
      "stats": {
        "activeUsers": 0,
        "trialDays": 14
      }
    },
    ...
  ]
}
```

---

### 4️⃣ **Iniciar frontend**

```bash
cd app-saas
ng serve --port 4202
```

---

### 5️⃣ **Abrir navegador**

```bash
open http://app-saas.localhost:4202/
```

**Deberías ver:**
- ✅ Spinner de carga inicial
- ✅ 3 tarjetas de MVPs (Video Express, MailFlow, KeyModule)
- ✅ Cada tarjeta con:
  - Icono con color
  - Badge "LIVE" o "EN TESTING"
  - Lista de características
  - Botón "Probar gratis"

---

## 🔍 Troubleshooting

### ❌ Error: "Column 'show_in_store' doesn't exist"

**Solución:**
```bash
cd api
npm run migrate
```

O ejecutar manualmente:
```sql
ALTER TABLE modules 
ADD COLUMN show_in_store BOOLEAN DEFAULT FALSE NOT NULL 
AFTER is_active 
COMMENT 'Si el módulo se muestra en el MVP Hub público';

UPDATE modules 
SET show_in_store = TRUE 
WHERE key IN ('video-express', 'mailflow', 'key-module');
```

---

### ❌ Frontend muestra "No se pudieron cargar los MVPs"

**Checklist:**
1. ✅ Backend corriendo en puerto 3500
2. ✅ Endpoint responde: `curl http://localhost:3500/mvp-hub/modules`
3. ✅ No hay errores CORS en consola del navegador (F12)
4. ✅ `environment.ts` apunta a `http://localhost:3500/api/`

**Ver logs del backend:**
```bash
tail -f api/logs/combined.log
```

**Ver logs del frontend:**
Abrir consola del navegador (F12 → Console)

---

### ❌ Los MVPs aparecen sin features

**Causa**: `saas_config` no tiene el campo `features`

**Solución**:
```sql
UPDATE modules 
SET saas_config = JSON_OBJECT(
  'features', JSON_ARRAY(
    'Feature 1',
    'Feature 2',
    'Feature 3',
    'Feature 4'
  ),
  'trial_days', 14
)
WHERE key = 'video-express';
```

---

### ❌ Error CORS

**Verificar** (`api/src/app.js`):
```javascript
app.use(cors({
  origin: [
    'http://app-saas.localhost:4202',
    'http://localhost:4202'
  ],
  credentials: true
}));
```

---

## 📊 Verificar datos

### Ver módulos activos

```sql
SELECT 
  key, 
  name, 
  is_active, 
  show_in_store, 
  status,
  icon,
  color
FROM modules 
WHERE is_active = 1;
```

### Ver saas_config de un módulo

```sql
SELECT 
  key,
  name,
  JSON_EXTRACT(saas_config, '$.features') AS features,
  JSON_EXTRACT(saas_config, '$.trial_days') AS trial_days
FROM modules 
WHERE key = 'video-express';
```

### Activar un nuevo MVP

```sql
-- 1. Crear el módulo (si no existe)
INSERT INTO modules (
  key, name, tagline, description,
  icon, color, type, status,
  is_active, show_in_store
) VALUES (
  'invoice-master',
  'Invoice Master',
  'Facturación automática',
  'Genera facturas profesionales en segundos',
  'bi-receipt-cutoff',
  '#f59e0b',
  'saas',
  'testing',
  TRUE,
  TRUE
);

-- 2. Configurar features
UPDATE modules 
SET saas_config = JSON_OBJECT(
  'features', JSON_ARRAY(
    'Generación automática',
    'Plantillas personalizables',
    'Envío por email',
    'Seguimiento de pagos'
  ),
  'trial_days', 14
)
WHERE key = 'invoice-master';

-- 3. Configurar preview
UPDATE modules 
SET preview_config = JSON_OBJECT(
  'enabled', TRUE,
  'route', '/preview/invoice-master'
)
WHERE key = 'invoice-master';
```

---

## 🎨 Personalizar un MVP

### Cambiar color

```sql
UPDATE modules 
SET color = '#10b981' 
WHERE key = 'video-express';
```

### Cambiar ícono

Buscar en: https://icons.getbootstrap.com/

```sql
UPDATE modules 
SET icon = 'bi-lightning-charge-fill' 
WHERE key = 'video-express';
```

### Cambiar tagline

```sql
UPDATE modules 
SET tagline = 'Nueva frase de gancho' 
WHERE key = 'video-express';
```

### Ocultar del Hub

```sql
UPDATE modules 
SET show_in_store = FALSE 
WHERE key = 'video-express';
```

---

## ✅ Test completo paso a paso

### 1. Backend
```bash
# Aplicar migración
cd api
npm run migrate

# Iniciar backend
npm run dev
```

### 2. Verificar endpoint
```bash
curl http://localhost:3500/mvp-hub/modules | jq '.count'
# Debería devolver: 3
```

### 3. Frontend
```bash
cd app-saas
ng serve --port 4202
```

### 4. Navegador
1. Abrir: http://app-saas.localhost:4202/
2. Esperar que cargue (spinner)
3. Verificar que aparezcan 3 MVP cards
4. Hacer clic en "Probar gratis" de Video Express
5. Debería redirigir a `/preview/video-express`

### 5. Añadir nuevo MVP
```sql
-- Clonar Video Express como test
INSERT INTO modules (
  key, name, tagline, description,
  icon, color, type, status,
  is_active, show_in_store, saas_config, preview_config
)
SELECT 
  'test-mvp',
  'Test MVP',
  'Módulo de prueba',
  'Solo para testing',
  'bi-star-fill',
  '#ff6b6b',
  type, 'testing',
  TRUE, TRUE, saas_config, preview_config
FROM modules 
WHERE key = 'video-express';
```

6. Refrescar el navegador → Debería aparecer 4 MVPs

---

## 🚀 Todo funciona si...

- ✅ Backend devuelve JSON con `count: 3` y array de MVPs
- ✅ Frontend muestra 3 tarjetas con iconos y colores correctos
- ✅ Al hacer clic en "Probar gratis" redirige al preview
- ✅ Si añades un MVP en la DB, aparece automáticamente al refrescar

---

## 📚 Documentación adicional

- **Arquitectura completa**: `DYNAMIC-MVP-HUB-GUIDE.md`
- **Testing manual exhaustivo**: `TESTING-GUIDE.md`
- **Flujo de usuarios**: `MVP-HUB-FLOW.md`
