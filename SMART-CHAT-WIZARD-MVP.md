# 🚀 SMART CHAT WIZARD - MVP WOW

## 📍 Ubicación y Acceso

**Componente**: `app-saas/src/app/components/smart-chat-wizard/`

**Ruta Pública**: 
```
http://localhost:4202/preview/smart-chat
```

**Propósito**: Wizard MVP de validación orientado a generar WOW moment y medir interés real **ANTES** de construir el producto completo.

---

## 🎯 Objetivo Estratégico

**NO construir el producto completo todavía.**

Este wizard valida:
- ✅ Dolor real del comerciante (mensajes repetidos)
- ✅ Valor percibido (automatización de respuestas)
- ✅ Engagement (interacción con simulación)
- ✅ Intención de uso (activación/feedback)

**Después de validación exitosa** → Activar módulo completo (`modules/smart-chat/`)

---

## 🎭 Flujo del Wizard (4 Pasos)

### **Paso 1: Problema Real**

**Qué muestra**:
- Bandeja de mensajes repetidos (preguntas frecuentes)
- Métricas de impacto:
  - ~3h perdidas al día
  - 47% preguntas repetidas
  - €560 coste mensual

**Tracking**:
```typescript
'problem_acknowledged' // Cuando el usuario avanza
```

**CTA**: "Sí, necesito automatizar esto"

---

### **Paso 2: WOW Moment (Simulación)**

**Qué muestra**:
- Chat widget simulado respondiendo automáticamente
- Conversación realista:
  - Usuario: "¿Dónde está mi pedido?"
  - Bot: "Déjame buscarlo. ¿Cuál es tu número de pedido?"
  - Usuario: "#12345"
  - Bot: "Encontrado! Tu pedido está en camino. Llegará mañana entre 9h-14h"
  
**Tiempo de resolución**: 3 segundos vs 8 minutos manual

**Tracking**:
```typescript
'simulation_started'
'simulation_completed' // Cuando termina la animación
'simulation_replayed' // Si el usuario vuelve a verla
```

**CTA**: "Quiero probarlo yo mismo"

---

### **Paso 3: Preview Interactivo**

**Qué muestra**:
- Chat widget funcional donde el usuario puede escribir
- Quick questions predefinidas:
  - "¿Dónde está mi pedido?"
  - "¿Tienen envío a Canarias?"
  - "¿Puedo cambiar la talla?"

**Respuestas inteligentes** basadas en keywords reales de e-commerce

**Tracking**:
```typescript
'interactive_first_question' // Primera pregunta del usuario
'interactive_question_asked' // Cada pregunta adicional
'quick_question_selected' // Si usa quick question
```

**Validación**: Debe hacer al menos 1 pregunta para continuar

**CTA**: "¡Lo quiero instalar!"

---

### **Paso 4: CTA & Install**

**Qué muestra**:
- ✅ Beneficios del producto
- 📋 Código embebible copiable
- 🚀 Botón de activación
- 📊 Feedback de validación

**Tracking**:
```typescript
'embed_code_viewed'
'embed_code_copied'
'activate_clicked'
'wizard_feedback_answered' // yes, partial, no
'wizard_feedback_comment_submitted' // Si da feedback negativo/parcial
```

**CTA**: "Activar Smart Chat ahora"

---

## 📊 Medición y Analytics

Todos los eventos se envían a `tracking_events` y se visualizan en:

```
Admin Panel → /lab → Analytics
```

### **KPIs Clave**:

1. **Tasa de Inicio**:
   ```sql
   SELECT COUNT(*) FROM tracking_events 
   WHERE event_name = 'smart_chat_wizard_started';
   ```

2. **Tasa de Completitud por Paso**:
   ```sql
   SELECT 
     event_name,
     COUNT(*) as count
   FROM tracking_events
   WHERE event_name LIKE '%step_%_completed%'
   GROUP BY event_name;
   ```

3. **Engagement con Simulación**:
   ```sql
   SELECT 
     COUNT(*) as total_views,
     SUM(CASE WHEN event_name = 'simulation_replayed' THEN 1 ELSE 0 END) as replays
   FROM tracking_events
   WHERE event_name IN ('simulation_completed', 'simulation_replayed');
   ```

4. **Interacción Interactiva**:
   ```sql
   SELECT 
     COUNT(DISTINCT session_id) as unique_users,
     COUNT(*) as total_questions
   FROM tracking_events
   WHERE event_name = 'interactive_question_asked';
   ```

5. **Feedback**:
   ```sql
   SELECT 
     JSON_EXTRACT(event_data, '$.answer') as answer,
     COUNT(*) as count
   FROM tracking_events
   WHERE event_name = 'wizard_feedback_answered'
   GROUP BY answer;
   ```

6. **Activaciones**:
   ```sql
   SELECT COUNT(*) FROM tracking_events 
   WHERE event_name = 'activate_clicked';
   ```

---

## 🧪 Testing del Wizard

### **Flujo Completo** (Happy Path):

```bash
# 1. Iniciar app-saas
cd app-saas
ng serve --port 4202

# 2. Acceder al wizard
http://localhost:4202/preview/smart-chat
```

**Pasos de testing**:

1. ✅ Paso 1: Click en "Sí, necesito automatizar esto"
2. ✅ Paso 2: Espera a que termine la simulación (auto-start)
3. ✅ Paso 3: Escribe una pregunta o usa quick question
4. ✅ Paso 4: Ver código, copiar, dar feedback

**Validación**:
- ✅ Animaciones smooth (fadeInUp, messageSlideIn)
- ✅ Mensajes se muestran con delays simulados
- ✅ Chat scroll automático al fondo
- ✅ Código copiado al clipboard
- ✅ Feedback guardado en DB

---

## 🔄 Comparación: Wizard vs Módulo Completo

| Concepto | Wizard MVP | Módulo Completo |
|----------|-----------|-----------------|
| **Ruta** | `/preview/smart-chat` | `/app/smart-chat/*` |
| **Auth** | ❌ No requiere | ✅ Requiere login |
| **Objetivo** | Validar WOW | Gestión operativa |
| **Funcionalidad** | Simulación + Preview | Dashboard + Conversaciones + Settings |
| **Tracking** | Todos los eventos | Eventos operacionales |
| **Duración** | 2-3 minutos | Uso continuo |
| **Estado** | ✅ Activo NOW | 📦 Guardado (Fase 2) |

---

## 🚨 Decisión Post-Validación

### **Si los KPIs son positivos**:

```
Tasa de completitud > 60%
Feedback "yes" > 50%
Activaciones > 30%
```

**Entonces**:
1. Activar módulo completo en MVP Hub
2. Migrar usuarios del wizard al dashboard
3. Habilitar autenticación y multi-tenancy
4. Iterar según feedback

### **Si los KPIs son negativos**:

```
Tasa de completitud < 30%
Feedback "no" > 40%
Bounce en Paso 2
```

**Entonces**:
1. Analizar dónde se pierde el usuario
2. Revisar WOW moment (¿no es suficiente?)
3. Ajustar propuesta de valor
4. Testear con usuarios reales

---

## 📁 Archivos del Wizard

```
app-saas/src/app/components/smart-chat-wizard/
├── smart-chat-wizard.component.ts        (548 líneas)
├── smart-chat-wizard.component.html      (380 líneas)
└── smart-chat-wizard.component.scss      (550 líneas)
```

**Dependencias**:
- `TrackingService` (eventos analytics)
- `Router` (navegación)
- `FormsModule` (ngModel)
- `BrowserAnimationsModule` (animaciones)

---

## 🎯 Próximos Pasos

1. ✅ Wizard creado y registrado
2. 🧪 **Testing manual del flujo completo**
3. 📊 **Medir eventos en /lab/analytics**
4. 🔄 **Iterar según feedback inicial**
5. 📣 **Compartir con primeros usuarios**
6. 📈 **Analizar KPIs after 1 semana**
7. 🚀 **Decidir activación de módulo completo**

---

## 🔗 Referencias

- **Video Express Wizard** (patrón base): `app-saas/src/app/components/video-express-wizard/`
- **Tracking Service**: `app-saas/src/app/services/tracking.service.ts`
- **Analytics Dashboard**: Admin Panel → `/lab`
- **Módulo Completo** (guardado): `app-saas/src/app/modules/smart-chat/`

---

**Fecha de creación**: 16 de Febrero 2026  
**Estado**: ✅ MVP Wizard Listo para Validación  
**Siguiente hito**: Medir engagement y WOW en /lab/analytics
