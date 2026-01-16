# 🎨 Design System - Guía de Uso Rápido

## 📦 Ubicación
```
app-saas/src/assets/css/
```

## 🚀 Uso en Componentes

### Opción 1: Usar clases globales (recomendado para MVP)
```html
<!-- HTML del componente -->
<button class="btn btn-primary">Click me</button>
<div class="card card-selectable">...</div>
<span class="badge badge-success">Active</span>
```

### Opción 2: Importar variables/mixins en SCSS del componente
```scss
// component.scss
@use 'assets/css/variables' as *;
@use 'assets/css/mixins' as *;

.my-custom-element {
  color: $color-primary;
  @include card-hover;
}
```

---

## 📚 Componentes Disponibles

### Botones
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-retry">Retry</button>
```

### Badges
```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-csv">CSV</span>
<span class="badge badge-sample">Sample</span>
```

### Cards
```html
<div class="card">Basic card</div>
<div class="card card-selectable">Selectable card</div>
```

### Forms
```html
<div class="form-group">
  <label>Email</label>
  <input type="email" class="form-control">
  <small class="help-text">Enter your email</small>
  <small class="error-message">Invalid email</small>
</div>
```

### Upload Zone
```html
<div class="upload-zone">
  <input type="file" class="file-input">
  <label class="upload-label">
    <div class="upload-icon">📁</div>
    <p class="upload-text">Drop file here</p>
    <p class="upload-hint">CSV format</p>
  </label>
</div>
```

### Wizard Components
```html
<!-- Progress bar -->
<div class="wizard-progress-bar">
  <div class="progress-fill" [style.width.%]="50"></div>
</div>

<!-- Steps indicator -->
<div class="wizard-steps">
  <div class="step-item active">
    <div class="step-number">1</div>
    <div class="step-info">
      <span class="step-title">Step 1</span>
      <span class="step-description">Description</span>
    </div>
  </div>
</div>

<!-- Timeline -->
<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-marker">
      <span class="marker-dot"></span>
      <span class="marker-label">Day 1</span>
    </div>
    <div class="timeline-content">...</div>
  </div>
</div>

<!-- Contacts list -->
<div class="contacts-list">
  <div class="contact-item">
    <div class="contact-avatar">1</div>
    <div class="contact-info">
      <strong>John Doe</strong>
      <small>john@example.com</small>
    </div>
    <div class="contact-status">✅</div>
  </div>
</div>

<!-- Mini contacts -->
<div class="contacts-mini-list">
  <div class="mini-contact-item">
    <span class="mini-avatar">1</span>
    <div class="mini-contact-info">
      <strong>John</strong>
      <small>john@example.com</small>
    </div>
  </div>
</div>
```

### Stats Card
```html
<div class="stat-card">
  <span class="stat-icon">📧</span>
  <div class="stat-info">
    <strong>5</strong>
    <small>contacts</small>
  </div>
</div>
```

### Alerts
```html
<div class="alert alert-warning">
  <strong>Warning</strong>
  <p>This is a warning message</p>
</div>

<div class="alert alert-error">
  <strong>Error</strong>
  <p>This is an error message</p>
  <button class="btn-retry">Try Again</button>
</div>
```

### Loader
```html
<div class="loader">
  <div class="loader-spinner"></div>
  <p>Loading...</p>
  <small>Please wait</small>
</div>
```

---

## 🎨 Variables Disponibles

### Colores
```scss
$color-primary: #4f46e5
$color-success: #10b981
$color-error: #ef4444
$color-warning: #fbbf24
$color-text-primary: #1f2937
$color-text-secondary: #6b7280
$color-border: #e5e7eb
```

### Espaciado
```scss
$spacing-xs: 0.25rem
$spacing-sm: 0.5rem
$spacing-md: 1rem
$spacing-lg: 1.5rem
$spacing-xl: 2rem
$spacing-2xl: 3rem
```

### Border Radius
```scss
$radius-sm: 6px
$radius-md: 8px
$radius-lg: 12px
$radius-full: 50%
```

### Tipografía
```scss
$font-size-xs: 0.6875rem
$font-size-sm: 0.75rem
$font-size-base: 0.875rem
$font-size-md: 1rem
$font-size-lg: 1.125rem
$font-size-xl: 1.5rem
$font-size-2xl: 1.875rem

$font-weight-normal: 400
$font-weight-medium: 500
$font-weight-semibold: 600
$font-weight-bold: 700
```

---

## 🔧 Mixins Disponibles

```scss
@use 'assets/css/mixins' as *;

// Card hover effect
@include card-hover;

// Flexbox center
@include flex-center;

// Truncate text
@include truncate;

// Avatar
@include avatar(40px);

// Grid auto-fit
@include grid-auto-fit(200px);

// Responsive
@include mobile { /* styles */ }
@include tablet { /* styles */ }
```

---

## 🎯 Utility Classes

### Layout
```html
<div class="flex-center">Centered</div>
<div class="flex-between">Space between</div>
<div class="grid-auto-fit">Auto-fit grid</div>
```

### Spacing
```html
<div class="mt-1">margin-top: 0.5rem</div>
<div class="mt-2">margin-top: 1rem</div>
<div class="mt-3">margin-top: 1.5rem</div>
<div class="mt-4">margin-top: 2rem</div>

<div class="mb-1 mb-2 mb-3 mb-4">margin-bottom</div>
<div class="p-1 p-2 p-3 p-4">padding</div>
```

### Typography
```html
<div class="text-center">Centered text</div>
<p class="subtitle">Subtitle text</p>
```

### Animations
```html
<div class="fade-in">Fade in animation</div>
```

---

## 💡 Ejemplos de Uso

### Crear una tarjeta seleccionable
```html
<label class="card card-selectable" [class.selected]="isSelected">
  <input type="radio" name="option" (change)="onSelect()">
  <div>
    <h3>Option 1</h3>
    <p>Description</p>
  </div>
</label>
```

### Formulario con validación
```html
<div class="form-group">
  <label for="email">Email *</label>
  <input 
    id="email" 
    type="email" 
    class="form-control"
    [formControl]="emailControl">
  <small *ngIf="emailControl.valid" class="help-text">
    Valid email
  </small>
  <small *ngIf="emailControl.invalid && emailControl.touched" class="error-message">
    Invalid email format
  </small>
</div>
```

### Timeline de emails
```html
<div class="timeline">
  <div class="timeline-item" *ngFor="let email of emails; let i = index">
    <div class="timeline-marker">
      <span class="marker-dot"></span>
      <span class="marker-label">
        {{ email.delayHours === 0 ? 'Immediate' : 'After ' + (email.delayHours / 24) + ' days' }}
      </span>
    </div>
    <app-email-card [email]="email"></app-email-card>
  </div>
</div>
```

---

## ✅ Checklist para Nuevos Componentes

- [ ] Usar clases del design system en lugar de crear estilos custom
- [ ] Importar variables/mixins si necesitas estilos específicos
- [ ] Mantener SCSS del componente < 5 KB
- [ ] Verificar que no hay estilos duplicados
- [ ] Usar utility classes para spacing y layout
- [ ] Probar en mobile (@include mobile)

---

## 🚀 Próximos Componentes a Migrar

1. **preview-wizard.component.scss** (si excede budget)
2. **email-editor.component.scss**
3. **dashboard.component.scss**

Para cada uno:
1. Identificar estilos reutilizables
2. Mover a assets/css/ si aplican a múltiples componentes
3. Usar clases del design system
4. Reducir SCSS específico a < 5 KB

---

**Documentación creada**: 15 de enero de 2026  
**Versión**: 1.0
