# 🚀 Dynamic MVP Hub - Guía Completa

## 📋 Resumen

El **MVP Hub** es ahora **completamente dinámico**:
- ✅ Los MVPs se cargan desde el **backend** (`/api/mvp-hub/modules`)
- ✅ La base de datos `modules` es la **única fuente de verdad**
- ✅ No hay datos hardcodeados en el frontend (excepto fallback en desarrollo)
- ✅ Añadir nuevos MVPs = solo actualizar la base de datos

---

## 🛠️ Arquitectura

### Backend (API)

**Controlador**: `api/src/controllers/mvpHub.controller.js`
- `getMvpHubModules()` - Lista todos los MVPs disponibles
- `getMvpHubModuleDetails(key)` - Detalles de un MVP específico

**Rutas**: `api/src/routes/mvpHub.routes.js`
```javascript
GET /mvp-hub/modules              // Lista de MVPs
GET /mvp-hub/modules/:key         // Detalles de un MVP
```

**Filtros aplicados**:
- `is_active = true` - Solo módulos activos
- `show_in_store = true` - Solo MVPs públicos
- `status IN ('testing', 'live')` - No mostrar deshabilitados

---

### Frontend (app-saas)

**Servicio**: `src/app/services/mvp-hub.service.ts`
```typescript
getMvps(includeComingSoon?, type?): Observable<MvpHubResponse>
getMvpDetails(key: string): Observable<MvpDetailsResponse>
```

**Componente**: `src/app/mvps-hub/mvps-hub.component.ts`
- Llama a `mvpHubService.getMvps()` en `ngOnInit()`
- Muestra loading spinner mientras carga
- Maneja errores con mensaje y botón de reintentar
- Fallback a datos hardcodeados solo en desarrollo si falla el backend

---

## 🗄️ Estructura de Base de Datos

### Tabla `modules`

**Columnas clave**:
```sql
key              VARCHAR(100)     -- Identificador único (ej: 'video-express')
name             VARCHAR(255)     -- Nombre del MVP (ej: 'Video Express')
tagline          VARCHAR(500)     -- Frase gancho
description      TEXT             -- Descripción larga
icon             VARCHAR(100)     -- Clase de Bootstrap Icons (ej: 'bi-camera-video-fill')
color            VARCHAR(50)      -- Color hex (ej: '#8b5cf6')
status           ENUM             -- 'live', 'testing', 'coming-soon', etc.
type             ENUM             -- 'saas', 'demo'
is_active        BOOLEAN          -- Si está activo
show_in_store    BOOLEAN          -- Si se muestra en el Hub
saas_config      JSON             -- Configuración SaaS
preview_config   JSON             -- Configuración de preview
```

**Ejemplo de `saas_config`**:
```json
{
  "features": [
    "Generación automática con IA",
    "Optimizado para Instagram & TikTok",
    "Sin marca de agua",
    "Listo en menos de 1 minuto"
  ],
  "trial_days": 14,
  "plans": [...]
}
```

**Ejemplo de `preview_config`**:
```json
{
  "enabled": true,
  "route": "/preview/video-express"
}
```

---

## 🧪 Cómo Probar

### 1️⃣ Verificar estructura de la base de datos

```sql
-- Verificar que existe la columna show_in_store
DESCRIBE modules;

-- Ver módulos activos y en store
SELECT key, name, status, is_active, show_in_store 
FROM modules 
WHERE is_active = 1;
```

Si falta la columna `show_in_store`:
```sql
ALTER TABLE modules 
ADD COLUMN show_in_store BOOLEAN DEFAULT FALSE 
AFTER is_active;
```

---

### 2️⃣ Activar MVPs en el Hub

```sql
-- Activar Video Express en el Hub
UPDATE modules 
SET show_in_store = TRUE, 
    is_active = TRUE,
    status = 'live',
    icon = 'bi-camera-video-fill',
    color = '#8b5cf6',
    tagline = 'Producto → Video en 60 segundos'
WHERE key = 'video-express';

-- Activar MailFlow
UPDATE modules 
SET show_in_store = TRUE, 
    is_active = TRUE,
    status = 'live',
    icon = 'bi-envelope-fill',
    color = '#3b82f6',
    tagline = 'Email marketing automatizado'
WHERE key = 'mailflow';

-- Activar Key Module (demo)
UPDATE modules 
SET show_in_store = TRUE, 
    is_active = TRUE,
    status = 'testing',
    type = 'demo',
    icon = 'bi-key-fill',
    color = '#10b981',
    tagline = 'Módulo de ejemplo'
WHERE key = 'key-module';
```

---

### 3️⃣ Configurar JSON fields

```sql
-- Ejemplo para Video Express
UPDATE modules 
SET saas_config = JSON_OBJECT(
  'features', JSON_ARRAY(
    'Generación automática con IA',
    'Optimizado para Instagram & TikTok',
    'Sin marca de agua',
    'Listo en menos de 1 minuto'
  ),
  'trial_days', 14
),
preview_config = JSON_OBJECT(
  'enabled', TRUE,
  'route', '/preview/video-express'
)
WHERE key = 'video-express';
```

---

### 4️⃣ Probar endpoint del backend

```bash
# Iniciar backend
cd /path/to/api
npm run dev

# Probar endpoint (en otra terminal)
curl http://localhost:3500/mvp-hub/modules

# Respuesta esperada:
{
  "success": true,
  "count": 3,
  "mvps": [
    {
      "key": "video-express",
      "name": "Video Express",
      "tagline": "Producto → Video en 60 segundos",
      "description": "...",
      "icon": "bi-camera-video-fill",
      "color": "#8b5cf6",
      "status": "live",
      "type": "saas",
      "features": [...],
      "previewRoute": "/preview/video-express",
      "stats": {
        "activeUsers": 5,
        "trialDays": 14
      }
    },
    ...
  ]
}
```

---

### 5️⃣ Probar frontend

```bash
# Iniciar app-saas
cd /path/to/app-saas
ng serve --port 4202

# Abrir navegador
open http://app-saas.localhost:4202/
```

**Checklist visual**:
- ✅ Aparece un spinner de carga al inicio
- ✅ Los MVPs se cargan desde la base de datos
- ✅ Las tarjetas muestran: icono, nombre, tagline, features, botones
- ✅ El badge "LIVE" o "EN TESTING" aparece correctamente
- ✅ Al hacer clic en "Probar gratis" redirige al preview

---

### 6️⃣ Probar estados de error

**Simular error del backend**:
1. Apaga el backend (`Ctrl+C`)
2. Recarga el frontend
3. Deberías ver:
   - ⚠️ Icono de warning amarillo
   - Mensaje: "No se pudieron cargar los MVPs. Por favor intenta más tarde."
   - Botón "Reintentar"
4. En consola del navegador: `⚠️ Usando MVPs de fallback (backend no disponible)`

---

## 🎯 Añadir un Nuevo MVP

### Paso 1: Insertar en base de datos

```sql
INSERT INTO modules (
  key, name, tagline, description, 
  icon, color, status, type, 
  is_active, show_in_store,
  saas_config, preview_config
) VALUES (
  'invoice-master',
  'Invoice Master',
  'Facturación automática para freelancers',
  'Genera facturas profesionales en segundos con plantillas personalizables y envío automático.',
  'bi-receipt-cutoff',
  '#f59e0b',
  'testing',
  'saas',
  TRUE,
  TRUE,
  JSON_OBJECT(
    'features', JSON_ARRAY(
      'Generación automática de facturas',
      'Plantillas personalizables',
      'Envío por email automático',
      'Seguimiento de pagos'
    ),
    'trial_days', 14
  ),
  JSON_OBJECT(
    'enabled', TRUE,
    'route', '/preview/invoice-master'
  )
);
```

### Paso 2: Refrescar el frontend

1. Recarga `http://app-saas.localhost:4202/`
2. El nuevo MVP aparecerá automáticamente

**¡Listo! No hay cambios de código necesarios.**

---

## 🚨 Troubleshooting

### Problema: No aparece ningún MVP

**Causa posible**: Filtros demasiado restrictivos

**Solución**:
```sql
-- Verificar qué está bloqueando
SELECT key, name, is_active, show_in_store, status 
FROM modules;

-- Activar todo lo necesario
UPDATE modules 
SET is_active = TRUE, 
    show_in_store = TRUE,
    status = 'live'
WHERE key IN ('video-express', 'mailflow', 'key-module');
```

---

### Problema: Error CORS en el navegador

**Causa**: Backend no permite peticiones desde `app-saas.localhost`

**Solución**: Verificar `api/src/app.js`:
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://app-saas.localhost:4202',
    'http://localhost:4202'
  ],
  credentials: true
}));
```

---

### Problema: Aparece "No se pudieron cargar los MVPs"

**Checklist**:
1. ✅ Backend corriendo en puerto 3500
2. ✅ Endpoint responde: `curl http://localhost:3500/mvp-hub/modules`
3. ✅ Frontend apunta a `URL_SERVICE: 'http://localhost:3500/api/'`
4. ✅ No hay errores en consola del navegador (F12)

---

### Problema: Los MVPs aparecen pero sin features

**Causa**: `saas_config` no tiene el campo `features`

**Solución**:
```sql
UPDATE modules 
SET saas_config = JSON_SET(
  COALESCE(saas_config, '{}'),
  '$.features',
  JSON_ARRAY(
    'Feature 1',
    'Feature 2',
    'Feature 3'
  )
)
WHERE key = 'nombre-mvp';
```

---

## 📊 Monitoreo

### Logs útiles

**Backend**:
```bash
# Ver logs en tiempo real
tail -f api/logs/combined.log

# Buscar peticiones a MVP Hub
grep "mvp-hub" api/logs/combined.log
```

**Frontend** (Consola del navegador):
```javascript
// Logs de carga exitosa
✅ 3 MVPs cargados desde backend: [...]

// Logs de error
❌ Error loading MVPs: {...}

// Logs de fallback
⚠️ Usando MVPs de fallback (backend no disponible)
```

---

## 🚀 Deployment

### Production checklist

1. **Base de datos**:
   ```sql
   -- Solo mostrar MVPs en producción
   UPDATE modules 
   SET show_in_store = FALSE 
   WHERE status != 'live';
   ```

2. **Environment**:
   - ✅ `environment.prod.ts` apunta a `https://api.lujandev.com/api/`
   - ✅ Backend permite CORS desde dominio de producción

3. **Caché** (opcional):
   - Implementar caché de 5 minutos en el servicio
   - Redis para el backend

---

## 🎨 Personalización

### Cambiar colores de un MVP

```sql
UPDATE modules 
SET color = '#10b981' 
WHERE key = 'video-express';
```

### Cambiar ícono

```sql
-- Ver iconos disponibles: https://icons.getbootstrap.com/
UPDATE modules 
SET icon = 'bi-lightning-charge-fill' 
WHERE key = 'video-express';
```

### Ocultar temporalmente un MVP

```sql
UPDATE modules 
SET show_in_store = FALSE 
WHERE key = 'video-express';
```

---

## 📚 Referencias

- **Bootstrap Icons**: https://icons.getbootstrap.com/
- **Documentación completa**: `MVP-HUB-FLOW.md`
- **Testing manual**: `TESTING-GUIDE.md`

---

## 💡 Próximos Pasos

- [ ] Implementar caché en el servicio frontend
- [ ] Añadir paginación si hay más de 10 MVPs
- [ ] Implementar búsqueda/filtrado en el Hub
- [ ] Analytics: trackear qué MVPs reciben más clics
- [ ] Admin panel para gestionar MVPs sin SQL directo

---

**¿Dudas?** Consulta `MVP-HUB-FLOW.md` o revisa los logs del backend.
