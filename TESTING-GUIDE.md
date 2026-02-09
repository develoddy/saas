# Testing del MVP Hub - Guía Rápida

## 🚀 Iniciar Servidores

### Backend (API)
```bash
cd api
npm run dev
# Debe correr en http://localhost:3000
```

### Frontend (App SaaS)
```bash
cd app-saas
ng serve --port 4202
# Acceder a http://app-saas.localhost:4202
```

---

## ✅ Tests Manuales Esenciales

### Test 1: Landing Hub (Usuario nuevo)

**Objetivo**: Verificar que el Hub muestra todos los MVPs disponibles

1. Abrir navegador en `http://app-saas.localhost:4202/`
2. **Verificar**:
   - ✅ Se muestra el MVP Hub Landing con gradient púrpura
   - ✅ Header muestra "SaaS MVP Hub"
   - ✅ 3 tarjetas de MVPs: Video Express, MailFlow, KeyModule
   - ✅ Cada tarjeta muestra: icon, nombre, tagline, features, botón "Probar ahora"
   - ✅ Botones "Iniciar sesión" y "Crear cuenta" en header
   - ✅ CTA al final "¿Listo para empezar?"

---

### Test 2: Preview sin autenticación

**Objetivo**: Verificar que el preview funciona sin necesidad de login

1. Desde el Hub, hacer click en "Probar ahora" de **Video Express**
2. **Verificar**:
   - ✅ Redirige a `/preview/video-express`
   - ✅ Se muestra el wizard de Video Express
   - ✅ Puedes subir imagen, seleccionar objetivo, generar video
   - ✅ Video se genera sin pedir autenticación

3. Desde el Hub, hacer click en "Probar ahora" de **MailFlow**
4. **Verificar**:
   - ✅ Redirige a `/preview/mailflow`
   - ✅ Se muestra wizard genérico con formulario
   - ✅ Puedes completar campos y generar preview

---

### Test 3: Flujo Registro → Dashboard

**Objetivo**: Verificar flujo completo preview → registro → conversión → dashboard

1. Completar un preview de **Video Express**
2. Al finalizar, hacer click en "Crear cuenta" o botón similar
3. **Verificar**:
   - ✅ Redirige a `/register?module=video-express&from_preview=true`
   - ✅ Formulario de registro se muestra correctamente

4. Completar formulario:
   - Nombre: "Test User"
   - Email: "test@example.com" (usar email único)
   - Password: "test1234"
   - Confirmar password: "test1234"

5. Hacer click en "Crear cuenta"
6. **Verificar**:
   - ✅ Loading spinner aparece
   - ✅ Mensaje "¡Cuenta creada! Redirigiendo..."
   - ✅ Redirige a `/app/video-express`
   - ✅ Usuario ve su dashboard del módulo

7. **Verificar en consola del navegador**:
   - ✅ Token JWT guardado en localStorage (`tenant_token`)
   - ✅ Preview convertido (si venía de preview)
   - ✅ Preview data borrado de sessionStorage

---

### Test 4: Login existente

**Objetivo**: Verificar que login funciona y redirige correctamente

1. Logout (abrir DevTools → localStorage → borrar `tenant_token`)
2. Ir a `/login`
3. Ingresar credenciales del test anterior:
   - Email: "test@example.com"
   - Password: "test1234"

4. Hacer click en "Iniciar sesión"
5. **Verificar**:
   - ✅ Redirige a `/app/video-express` (su módulo)
   - ✅ Dashboard cargado correctamente
   - ✅ Token guardado en localStorage

---

### Test 5: ReturnURL preservation

**Objetivo**: Verificar que returnUrl funciona después de login

1. Logout
2. Intentar acceder directamente a `/app/mailflow`
3. **Verificar**:
   - ✅ TenantAuthGuard intercepta
   - ✅ Redirige a `/login?returnUrl=/app/mailflow`

4. Hacer login con credenciales válidas
5. **Verificar**:
   - ✅ Después del login, vuelve a `/app/mailflow` (NO a `/app/video-express`)

---

### Test 6: TenantAuthGuard bloquea rutas protegidas

**Objetivo**: Verificar que usuario no autenticado no puede acceder a /app/*

1. Logout (borrar `tenant_token`)
2. Intentar ir directamente a `/app/mailflow`
3. **Verificar**:
   - ✅ Redirige automáticamente a `/login?returnUrl=/app/mailflow`

4. Intentar ir a `/app/video-express`
5. **Verificar**:
   - ✅ Redirige a `/login?returnUrl=/app/video-express`

---

### Test 7: Usuario autenticado ve botón "Mi Dashboard"

**Objetivo**: Verificar detección de sesión activa en Hub

1. Con sesión activa (después de login), ir a `/`
2. **Verificar**:
   - ✅ En lugar de "Iniciar sesión" y "Crear cuenta", aparece:
     - Icono de usuario con nombre del tenant
     - Botón "Mi Dashboard"
   - ✅ Al hacer click en "Mi Dashboard", redirige a `/app/:moduleKey` correcto

---

### Test 8: Backend - checkAccess

**Objetivo**: Confirmar que checkAccess funciona correctamente

1. Con sesión activa, abrir DevTools → Network
2. Navegar a cualquier ruta bajo `/app/*`
3. **Verificar request GET `/api/saas/check-access`**:
   - ✅ Headers incluyen `Authorization: Bearer <token>`
   - ✅ Respuesta 200 OK:
     ```json
     {
       "success": true,
       "hasAccess": true,
       "tenant": {
         "id": 123,
         "module_key": "video-express",
         "status": "trial",
         "days_remaining": 14,
         ...
       }
     }
     ```

---

## 🔍 Verificaciones en Base de Datos

### Después del registro
```sql
-- Verificar que se creó el tenant
SELECT * FROM tenants 
WHERE email = 'test@example.com';

-- Verificar trial_ends_at (debe ser ~14 días en el futuro)
-- Verificar status = 'trial'
-- Verificar module_key = 'video-express' o el módulo correcto
```

### Después de conversión de preview
```sql
-- Si el preview se convirtió, verificar que se guardó (ej: MailFlow)
SELECT * FROM mailflow_sequences 
WHERE tenant_id = <ID_DEL_TENANT>;

-- Debe existir 1 secuencia generada desde el preview
```

---

## ⚠️ Problemas Comunes y Soluciones

### "Cannot GET /" muestra página en blanco
**Causa**: Angular no está compilando correctamente  
**Solución**: 
```bash
cd app-saas
rm -rf node_modules .angular
npm install
ng serve --port 4202
```

### "Token not found" después de login
**Causa**: SaasService no guardó el token  
**Verificar**:
1. Abrir DevTools → Application → LocalStorage
2. Buscar `tenant_token`
3. Si no existe, revisar `saas.service.ts` método `handleAuthentication()`

### TenantAuthGuard no redirige correctamente
**Causa**: Guard no detecta returnUrl  
**Verificar**:
1. Consola del navegador debe mostrar logs de TenantAuthGuard
2. Revisar que `state.url` se captura correctamente en guard

### Preview no se convierte después de registro
**Causa**: sessionStorage vacío o endpoint falla  
**Verificar**:
1. Después de generar preview, abrir DevTools → Application → SessionStorage
2. Debe existir clave `<moduleKey>_preview` con JSON
3. En Network, verificar POST `/api/modules/:moduleKey/preview/convert`
4. Si falla, revisar logs del backend

---

## 📊 Métricas de Éxito

Para considerar el flujo **validado correctamente**, todos estos checks deben pasar:

- [x] Hub landing carga sin errores
- [x] Preview funciona sin autenticación (video-express + mailflow)
- [x] Registro crea tenant en DB
- [x] Token JWT se guarda en localStorage
- [x] Login redirige a /app/:moduleKey
- [x] TenantAuthGuard bloquea accesos no autenticados
- [x] checkAccess devuelve hasAccess: true para trial activo
- [x] Preview se convierte correctamente después de registro
- [x] returnUrl se preserva en login
- [x] Usuario autenticado ve "Mi Dashboard" en Hub

---

## 🐛 Debugging Avanzado

### Ver logs de autenticación
```javascript
// En consola del navegador:
localStorage.getItem('tenant_token');  // Ver token
JSON.parse(atob(token.split('.')[1])); // Decodificar payload JWT
```

### Simular trial expirado (testing /upgrade)
```sql
-- En DB, modificar tenant actual
UPDATE tenants 
SET trial_ends_at = NOW() - INTERVAL 10 DAY
WHERE email = 'test@example.com';
```

Luego intentar acceder a `/app/video-express` → debe redirigir a `/upgrade`

---

**Última actualización**: Febrero 9, 2026  
**Testing realizado**: ⏳ Pendiente
