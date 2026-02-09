# Flujo de MVP Hub - Fase de Validación

## 📋 Resumen del Sistema

Sistema multi-tenant SaaS con arquitectura modular para validar diferentes MVPs. Cada usuario puede tener acceso a múltiples módulos independientes con trials y subscripciones separadas.

---

## 🏗️ Estructura de Routing

### Rutas Públicas (sin autenticación)
- `/` → **MVP Hub Landing** (componente: `MvpsHubComponent`)
  - Muestra tarjetas de todos los MVPs disponibles
  - Links directos a previews
  - CTA para registro/login
  
- `/login` → Login de tenant
- `/register` → Registro + inicio de trial
- `/preview/:moduleKey` → Preview genérico de MVPs
- `/preview/video-express` → Preview específico de Video Express

### Rutas Protegidas (requieren autenticación)
- `/app/:moduleKey` → Dashboard del módulo (con `TenantAuthGuard`)
  - Ej: `/app/mailflow` → Dashboard de MailFlow
  - Ej: `/app/video-express` → Dashboard de Video Express
  
- `/app/mailflow/*` → Lazy-loaded MailFlow module
- `/upgrade` → Página de upgrade (trial expirado)
- `/upgrade/success` → Confirmación de upgrade exitoso

---

## 🔄 Flujos de Usuario

### 1. Usuario Nuevo (Primera Visita)

```
http://app-saas.localhost:4202/
  ↓
MVP Hub Landing (/)
  - Ve todos los MVPs disponibles
  - Puede probar cualquier preview sin registro
  ↓
Click "Probar ahora" en un MVP
  ↓
/preview/:moduleKey (ej: /preview/mailflow)
  - Genera preview temporal
  - Prueba funcionalidad sin autenticación
  ↓
Click "Convertir en real" o "Crear cuenta"
  ↓
/register?module=:moduleKey&from_preview=true
  - Formulario de registro
  - Email, password, nombre
  ↓
Backend: POST /api/saas/trial/start
  - Crea tenant en DB
  - Genera token JWT
  - Trial de 14 días
  ↓
POST /api/modules/:moduleKey/preview/convert (si viene de preview)
  - Convierte preview en configuración real
  - Guarda en DB asociado al tenant
  ↓
Redirect → /app/:moduleKey
  - Usuario ya autenticado
  - Ve su dashboard del módulo
```

### 2. Usuario Existente (Returning)

```
http://app-saas.localhost:4202/
  ↓
MVP Hub Landing (/)
  - Detecta token existente
  - Muestra botón "Mi Dashboard"
  ↓
Click "Mi Dashboard"
  ↓
/app/:moduleKey (detecta automáticamente su módulo activo)
  ↓
TenantAuthGuard verifica:
  - Token válido ✅
  - Backend: GET /api/saas/check-access
    → hasAccess: true (trial activo o subscrito)
  ↓
Dashboard del módulo
```

### 3. Usuario con Trial Expirado

```
Usuario intenta acceder a /app/mailflow
  ↓
TenantAuthGuard ejecuta
  ↓
Backend: GET /api/saas/check-access
  - hasAccess: false
  - tenant.status: 'trial'
  - days_remaining: -5
  ↓
Redirect → /upgrade
  - Muestra planes de pago
  - Integración con Stripe (opcional en fase MVP)
```

### 4. Usuario con Múltiples Módulos

```
Usuario hace login
  ↓
Backend: POST /api/saas/login (sin moduleKey)
  - Detecta 3 tenants del mismo email
  - Devuelve: { modules: [...] }
  ↓
Frontend: /select-app
  - Muestra selector de módulos
  - Usuario elige uno
  ↓
Login específico con moduleKey
  ↓
/app/:moduleKey correspondiente
```

---

## 🔐 Autenticación y Guards

### TenantAuthGuard

**Ubicación**: `/app-saas/src/app/core/tenant-auth.guard.ts`

**Protege**: Todas las rutas bajo `/app/*`

**Lógica de validación**:

```typescript
1. ¿Hay token en localStorage?
   └─ No → Redirect a /login?returnUrl=...
   └─ Sí → Continuar

2. Verificar acceso con backend
   GET /api/saas/check-access (con token en headers)
   
3. Respuesta del backend:
   {
     success: true,
     hasAccess: boolean,
     tenant: {
       status: 'trial' | 'active' | 'expired' | etc,
       days_remaining: number,
       module_key: string
     }
   }

4. Decisión:
   - hasAccess = true → Permitir acceso
   - hasAccess = false + trial expirado → /upgrade
   - hasAccess = false + otros → /login?expired=true
```

---

## 🗄️ Coordinación Backend

### Endpoints Críticos

**1. POST `/api/saas/trial/start`** (Público, rate-limited)
```javascript
Body: {
  name: string,
  email: string,
  password: string,
  moduleKey: string
}

Response: {
  success: true,
  token: "jwt...",
  tenant: { ... },
  dashboard_url: "/mailflow"
}
```

**2. POST `/api/saas/login`** (Público, rate-limited)
```javascript
Body: {
  email: string,
  password: string,
  moduleKey?: string (opcional)
}

Response A (módulo único o específico):
{
  success: true,
  token: "jwt...",
  tenant: { module_key, status, ... }
}

Response B (múltiples módulos):
{
  success: true,
  email: "...",
  modules: [
    { module_key, module_name, has_access, dashboard_url },
    ...
  ]
}
```

**3. GET `/api/saas/check-access`** (Protegido, requiere token)
```javascript
Headers: {
  Authorization: "Bearer jwt..."
}

Response: {
  success: true,
  hasAccess: boolean,
  tenant: {
    id, name, email, module_key, status,
    trial_ends_at, days_remaining, ...
  }
}
```

**4. POST `/api/modules/:moduleKey/preview/convert`** (Protegido)
```javascript
Body: {
  previewData: { ... },
  autoActivate: true
}

Response: {
  success: true,
  message: "Preview converted successfully",
  sequence: { id, name, ... }
}
```

### Tablas DB Involucradas

- **`modules`**: Catálogo de MVPs disponibles
  - `key` (video-express, mailflow, key-module)
  - `type` ('saas')
  - `status` ('testing', 'live', 'coming-soon')
  - `is_active`
  - `saas_config` (JSON: trial_days, plans, preview_config...)

- **`tenants`**: Usuarios SaaS (1 tenant = 1 usuario + 1 módulo)
  - `email`, `password_hash`, `name`
  - `module_key` (FK → modules.key)
  - `status` ('trial', 'active', 'expired', 'cancelled')
  - `trial_ends_at`, `subscribed_at`, `subscription_ends_at`
  - `plan` ('trial', 'basic', 'pro')

---

## 📊 Health Scores y Métricas

### Tracking Implementado

El sistema rastrea eventos clave con `TrackingService`:

- `registration_completed` → Usuario completa registro
- `module_activated` → Usuario activa un módulo
- `conversion_started` → Usuario inicia conversión desde preview
- `trial_started` → Inicio de trial
- `subscription_created` → Conversión a plan pago

### Health Score

Cada módulo tiene un `health_score` calculado en base a:
- Usuarios activos
- Conversiones trial → pago
- Engagement (logins, features usadas)
- Feedback ratings

**Usado para**: Priorizar MVPs que demuestren tracción real.

---

## 🚀 Migración Futura (Post-Validación)

Cuando un MVP demuestre tracción, el plan es:

1. **Subdominios separados**:
   - `videoexpress.lujandev.com`
   - `mailflow.lujandev.com`
   
2. **Login centralizado** (opcional):
   - SSO entre subdominios
   - Single sign-on con JWT compartido
   
3. **Base de datos separadas** (opcional):
   - Cada MVP en su propia DB
   - Mayor escalabilidad

**Por ahora**: Mantenemos arquitectura monolítica modular en subrutas para iterar rápido.

---

## ✅ Checklist de Validación

### Frontend (app-saas)
- [x] MVP Hub Landing (/)
- [x] Login redirige a /app/:moduleKey
- [x] Register redirige a /app/:moduleKey
- [x] TenantAuthGuard protege /app/*
- [x] Preview funciona sin autenticación
- [x] Preview → Register → Convert flow
- [x] returnUrl preservado en login

### Backend (API)
- [x] POST /api/saas/trial/start
- [x] POST /api/saas/login (con detección multi-módulo)
- [x] GET /api/saas/check-access
- [x] POST /api/modules/:moduleKey/preview/convert
- [x] Middleware `authenticateTenant`
- [x] Rate limiting en endpoints públicos
- [x] Tabla `modules` con saas_config
- [x] Tabla `tenants` con trials y subscripciones

### Coordinación
- [x] Token JWT guardado en localStorage
- [x] Headers `Authorization: Bearer ...` en requests protegidos
- [x] Preview data en sessionStorage
- [x] Cleanup de preview después de conversión

---

## 🧪 Testing Manual

### Test 1: Usuario nuevo desde Hub
```
1. Ir a http://app-saas.localhost:4202/
2. Verificar que se ve el Hub con 3 MVPs
3. Click "Probar ahora" en Video Express
4. Subir imagen, generar video (preview mode)
5. Click "Crear otro video" → debe volver a preview
6. Cerrar preview y crear cuenta
7. Verificar redirect a /app/video-express
```

### Test 2: Login con returnUrl
```
1. Ir directamente a http://app-saas.localhost:4202/app/mailflow
2. TenantAuthGuard debe redirigir a /login?returnUrl=/app/mailflow
3. Hacer login
4. Verificar que vuelve a /app/mailflow (no a home)
```

### Test 3: Trial expirado
```
1. En DB, modificar tenant.trial_ends_at a hace 10 días
2. Intentar acceder a /app/mailflow
3. checkAccess debe devolver hasAccess: false
4. Debe redirigir a /upgrade
```

---

## 📝 Notas de Implementación

### Cambios Principales Aplicados

1. **Nuevo componente**: `MvpsHubComponent` (landing público)
2. **Routing restructurado**: 
   - `/` → Hub (público)
   - `/app/:moduleKey` → Dashboard (protegido)
   - Redirect `/moduleKey` → `/app/:moduleKey` (compatibilidad)
3. **Login/Register actualizados**: Navegación a `/app/:moduleKey`
4. **TenantAuthGuard**: Ya existía, funciona correctamente
5. **Backend**: Ya preparado, endpoints validados

### Archivos Modificados

**Frontend**:
- `app-routing.module.ts` → Nuevas rutas
- `app.module.ts` → Declaración de MvpsHubComponent
- `login.component.ts` → Redirect a /app/:moduleKey
- `register.component.ts` → Redirect a /app/:moduleKey
- `mvps-hub/` → Nuevo componente (TS, HTML, SCSS)

**Backend** (sin cambios necesarios):
- Endpoints ya funcionales
- authenticateTenant middleware OK
- checkAccess endpoint validado

---

## 🎯 Próximos Pasos

1. **Testing completo**: Validar todos los flujos manualmente
2. **Analytics**: Confirmar que eventos de tracking se envían correctamente
3. **Health Dashboard**: Panel admin para ver health_score de cada MVP
4. **Stripe Integration**: Completar flujo de /upgrade (opcional, si ya hay tracción)
5. **Módulos adicionales**: Agregar más MVPs al hub conforme se desarrollen

---

**Fecha de última actualización**: Febrero 9, 2026  
**Estado**: ✅ Implementado y listo para testing
