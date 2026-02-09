# MVP Hub: Sistema Honesto de Validación

## 🎯 Principio fundamental

**La raíz `/` NO muestra módulos técnicos. Solo muestra MVPs con señales reales de tracción.**

Este sistema es **honesto**: si un MVP no tiene pulso, no merece vitrina.

---

## 🔍 Criterios de Aparición en `/`

### Un MVP aparece en `/` si cumple:

1. **Health score > 0** (mínimo de señales reales)
2. **NO es demo/placeholder** (`key-module`, `demo`, `internal-tool`, etc.)
3. **Tiene actividad en últimos 30 días:**
   - Sesiones recientes (mínimo 3)
   - Usos de preview (mínimo 5)
   - O completions del wizard (mínimo 1)

### Señales Reales que Contamos:

```javascript
// Sesiones recientes (tracking_events)
- Eventos con session_id único en últimos 30 días

// Preview usage
- Eventos tipo 'preview_*' en tracking_events

// Wizard completions
- Eventos 'wizard_completed'

// Feedback positivo
- Eventos 'feedback_submitted' con positive:true

// Tenants activos
- Usuarios registrados con is_active = true

// Métricas específicas por MVP
- video-express: jobs completados, preview jobs
- mailflow: secuencias creadas, emails enviados
```

---

## 📊 Cálculo del Health Score

**Score de 0 a 100 basado en señales reales:**

```
Sesiones recientes:     40 puntos máx (≥3 sesiones = activo)
Preview usage:          30 puntos máx (≥5 usos = interés real)
Wizard completions:     20 puntos máx (≥1 completion = engaged)
Feedback positivo:      10 puntos máx (señal de valor)
Tenants activos:        +20 puntos bonus (usuarios comprometidos)
```

**Fórmula:**
- `0 puntos` = MVP muerto (no aparece en `/`)
- `1-30 puntos` = Señales muy débiles
- `31-60 puntos` = Tracción inicial
- `61-80 puntos` = Tracción sólida
- `81-100 puntos` = Listo para promocionar

---

## 🚀 Criterios de Promoción: MVP → Módulo Estable

### Un MVP está listo para convertirse en módulo si cumple 3+ de estos 5 criterios:

1. **Health score ≥ 70**
2. **Actividad reciente ≥ 10 sesiones** (últimos 30 días)
3. **Adopción de usuarios ≥ 3 tenants activos**
4. **Wizard completions ≥ 5** (señal de engagement)
5. **Feedback positivo ≥ 3** (validación de valor)

### Verificar candidatos a promoción:

```bash
GET /api/mvp-hub/promotion-candidates
```

**Respuesta:**
```json
{
  "success": true,
  "count": 1,
  "candidates": [
    {
      "key": "video-express",
      "name": "Video Express",
      "healthScore": 82,
      "readyForPromotion": true,
      "score": "4/5",
      "criteria": {
        "healthScore": true,
        "recentActivity": true,
        "userAdoption": true,
        "wizardCompletion": true,
        "positiveFeedback": false
      },
      "recommendation": "Este MVP está listo para convertirse en módulo estable"
    }
  ]
}
```

---

## 🔁 Flujo Correcto: De Idea a Producto

```
1. Idea nueva
   ↓
2. Crear wizard + preview (sin crear en modules todavía)
   ↓
3. Lanzar tracking events
   ↓
4. Recopilar métricas reales
   ↓
5. ¿Health score > 0?
   ├─ NO → Iterar o pivotar
   └─ SÍ → Aparece en / automáticamente
   ↓
6. ¿Cumple criterios de promoción?
   ├─ NO → Seguir validando
   └─ SÍ → Crear módulo en modules table
   ↓
7. Módulo estable en producción
```

**❌ NO al revés:**
- No crear módulo antes de validar
- No mostrar demos técnicas en` /`
- No inventar datos o usar fallbacks hardcodeados

---

## 📁 Arquitectura del Sistema

### Backend

```
api/src/
├── services/
│   └── mvpMetrics.service.js      # 🧠 Lógica de métricas y health score
├── controllers/
│   └── mvpHub.controller.js       # 🎛️ Endpoints honestos (no consulta modules directamente)
└── routes/
    └── mvpHub.routes.js           # 🛣️ Rutas públicas del hub
```

### Frontend

```
app-saas/src/app/mvps-hub/
├── mvps-hub.component.ts          # 🎯 Sin fallbacks hardcodeados
├── mvps-hub.component.html        # 🎨 Mensaje honesto si no hay MVPs
└── mvps-hub.component.scss        # 💅 Estados: loading, error, empty, grid
```

### Endpoints

```
GET /api/mvp-hub/modules
→ MVPs activos con tracción real (ordenados por health score)

GET /api/mvp-hub/modules/:key
→ Detalles + métricas + criterios de promoción

GET /api/mvp-hub/promotion-candidates
→ MVPs listos para convertirse en módulos estables (interno/admin)
```

---

## 🛠️ Cómo Añadir un Nuevo MVP

### ❌ Forma INCORRECTA (antigua):
```sql
INSERT INTO modules (key, name, ...) VALUES ('new-mvp', 'New MVP', ...);
-- Aparece inmediatamente en / aunque nadie lo use
```

### ✅ Forma CORRECTA (nueva):

1. **Crear wizard/preview** en app-saas (sin tocar modules)
2. **Añadir tracking events:**
   ```typescript
   trackingService.track('wizard_step_completed', {
     module: 'new-mvp',
     step: 1
   });
   ```
3. **Esperar señales reales** (sesiones, conversiones, feedback)
4. **Verificar health score:**
   ```bash
   GET /api/mvp-hub/modules
   ```
   - Si health score > 0 → Aparece automáticamente
   - Si health score = 0 → No aparece (honesto)

5. **Cuando cumpla criterios de promoción**, crear módulo:
   ```sql
   INSERT INTO modules (key, name, type, status, ...)
   VALUES ('new-mvp', 'New MVP', 'saas', 'live', ...);
   ```

---

## 🎨 Estados del Frontend

### 1. **Loading:**
```html
<div class="loading-state">
  <spinner />
  <p>Cargando experimentos activos...</p>
</div>
```

### 2. **Error:**
```html
<div class="error-state">
  <i class="bi-exclamation-triangle"></i>
  <p>Error al conectar con el servidor</p>
  <button (click)="retryLoad()">Reintentar</button>
</div>
```

### 3. **Empty (NO HAY MVPs con tracción):**
```html
<div class="empty-state">
  <i class="bi-hourglass-split"></i>
  <h3>Estamos validando experimentos</h3>
  <p>
    Por ahora no hay MVPs con tracción demostrable.
    Estamos probando nuevas ideas y recopilando señales reales de uso.
    Vuelve pronto para ver qué funciona.
  </p>
</div>
```

### 4. **MVPs Grid (hay MVPs activos):**
```html
<section class="mvps-grid">
  <div *ngFor="let mvp of mvps" class="mvp-card">
    <!-- Tarjeta de MVP con métricas reales -->
  </div>
</section>
```

---

## 📊 Monitoring & Analytics

### Queries útiles para debugging:

```sql
-- Ver health score de todos los MVPs
SELECT 
  m.key,
  m.name,
  COUNT(DISTINCT te.session_id) as sessions_30d,
  COUNT(CASE WHEN te.event LIKE '%preview%' THEN 1 END) as preview_uses,
  COUNT(CASE WHEN te.event = 'wizard_completed' THEN 1 END) as completions
FROM modules m
LEFT JOIN tracking_events te ON te.module = m.key 
  AND te.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
WHERE m.is_active = TRUE
GROUP BY m.key, m.name;

-- Ver qué MVPs están apareciendo en /
SELECT key, name, type 
FROM modules 
WHERE is_active = TRUE 
  AND type NOT IN ('demo', 'internal-tool', 'template')
  AND key NOT IN ('key-module');

-- Ver eventos recientes de un MVP
SELECT event, COUNT(*) as count
FROM tracking_events
WHERE module = 'video-express'
  AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY event
ORDER BY count DESC;
```

---

## 🚨 Troubleshooting

### "No aparecen MVPs en `/`"

**Causas posibles:**
1. ✅ **Correcto:** No hay MVPs con tracción real → Sistema funciona bien
2. ❌ Tracking events no se están guardando
3. ❌ Backend no arrancó correctamente
4. ❌ Frontend no conecta con backend

**Debug:**
```bash
# 1. Verificar que backend responde
curl http://localhost:3000/api/mvp-hub/modules

# 2. Verificar tracking events en BD
SELECT COUNT(*) FROM tracking_events;

# 3. Ver logs del backend
# Debería mostrar: "✅ MVPs activos: X/Y"
```

### "KeyModule aparece en `/`"

❌ **ESTO NO DEBE PASAR**

**Fix:**
1. Verificar que el servicio excluye `key-module`:
   ```javascript
   const EXCLUDED_MVP_KEYS = ['key-module'];
   ```
2. Reiniciar backend
3. Limpiar caché del frontend

---

## ✅ Checklist de Validación

Usar este checklist antes de considerar que un MVP está "en producción":

- [ ] El MVP tiene tracking events implementados
- [ ] Se están guardando eventos en `tracking_events` table
- [ ] Health score > 0 (mínimo de señales reales)
- [ el MVP aparece automáticamente en `/` (sin flags manuales)
- [ ] KeyModule y demos NO aparecen en `/`
- [ ] Si BD vacía, frontend muestra mensaje honesto (no fallbacks inventados)
- [ ] Métricas visibles en `/api/mvp-hub/modules/:key`

---

## 🎓 Filosofía del Sistema

### Antes (técnico):
> "Tengo 3 módulos en la DB → Muestro 3 módulos"

### Ahora (honesto):
> "Tengo 3 experimentos. Solo 1 tiene tracción → Muestro 1"

**El sistema deja de ser técnico y pasa a ser honesto.**

---

## 📝 Notas Finales

- Este sistema es **agnóstico** a la tabla `modules`
- Si mañana no hay MVPs con tracción, **está bien mostrar 0**
- La honestidad construye credibilidad
- `show_in_store` ya no controla nada (solo métricas reales)
- Los fallbacks hardcodeados fueron **eliminados permanentemente**

---

**Documentado:** 9 febrero 2026  
**Autor:** Copilot + LujanDev  
**Versión:** 1.0
