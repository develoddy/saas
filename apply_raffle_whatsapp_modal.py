from pathlib import Path
import sys

base = Path('src/app/modules/raffle-lab')
ts = base / 'pages/public-demo/public-demo.component.ts'
html = base / 'pages/public-demo/public-demo.component.html'
scss = base / 'styles/_public-demo.scss'
files = [ts, html, scss]
if not all(p.is_file() for p in files):
    sys.exit('ERROR: faltan archivos. Ejecuta desde la raíz de app-saas.')
original = {p: p.read_text() for p in files}

# Fail closed if files differ from the versions reviewed.
def replace_once(text, old, new, label):
    if text.count(old) != 1:
        sys.exit(f'ERROR: patrón no encontrado de forma única ({label}). No se modificó nada.')
    return text.replace(old, new, 1)

new_ts = replace_once(original[ts],
    "import { Component, OnDestroy, OnInit } from '@angular/core';",
    "import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';", 'import')
new_ts = replace_once(new_ts,
    '  error: string | null = null;\n',
    "  error: string | null = null;\n  selectedNumber: number | null = null;\n  @ViewChild('modalCloseButton') modalCloseButton?: ElementRef<HTMLButtonElement>;\n  private previousFocus: HTMLElement | null = null;\n", 'estado modal')
new_ts = replace_once(new_ts,
    '  chooseDraw(event: Event): void {\n',
    '''  openNumberModal(number: RaffleNumber): void {
    if (this.selectedDraw?.status !== 'published' || number.status !== 'available' || this.numbersLoading) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.selectedNumber = number.value;
    // Focus the close control once Angular has rendered the modal.
    queueMicrotask(() => this.modalCloseButton?.nativeElement.focus());
  }

  closeNumberModal(): void {
    this.selectedNumber = null;
    this.previousFocus?.focus();
    this.previousFocus = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedNumber !== null) this.closeNumberModal();
  }

  chooseDraw(event: Event): void {
    this.closeNumberModal();
''', 'métodos modal')
new_ts = replace_once(new_ts,
    '  private loadDraw(draw: PublicRaffleDraw): void {\n',
    '  private loadDraw(draw: PublicRaffleDraw): void {\n    this.closeNumberModal();\n', 'cambio sorteo')
new_ts = replace_once(new_ts,
    '  ngOnDestroy(): void {\n',
    '  ngOnDestroy(): void {\n    this.selectedNumber = null;\n', 'destrucción')

new_html = replace_once(original[html],
    '            [disabled]="true"\n',
    '''            [disabled]="draw.status !== 'published' || number.status !== 'available'"
            (click)="openNumberModal(number)"
''', 'habilitar números disponibles')
new_html = replace_once(new_html,
    '    <section class="demo-notice">',
    '''    <div *ngIf="selectedNumber !== null && selectedDraw as draw" class="raffle-modal-backdrop" (click)="closeNumberModal()">
      <section class="raffle-number-modal" role="dialog" aria-modal="true" aria-labelledby="raffle-modal-title" aria-describedby="raffle-modal-description" (click)="$event.stopPropagation()">
        <button #modalCloseButton class="raffle-modal-close" type="button" aria-label="Cerrar" (click)="closeNumberModal()">×</button>
        <span class="prize-label">SOLICITUD DE NÚMERO</span>
        <h2 id="raffle-modal-title">{{ draw.name }}</h2>
        <div class="raffle-modal-number">{{ selectedNumber | number:'2.0-0' }}</div>
        <p id="raffle-modal-description">¿Quieres solicitar este número? Su disponibilidad y reserva se confirmarán por WhatsApp.</p>
        <button type="button" class="raffle-modal-whatsapp" disabled title="Pendiente de configurar el número de contacto">
          Solicitar por WhatsApp (próximamente)
        </button>
        <button type="button" class="raffle-modal-cancel" (click)="closeNumberModal()">Volver a los números</button>
        <p class="raffle-modal-note">Seleccionar un número no constituye una reserva. No se realizan pagos en esta web.</p>
      </section>
    </div>

    <section class="demo-notice">''', 'plantilla modal')
new_html = replace_once(new_html,
    'Vista de consulta conectada a los datos del sorteo. Las reservas públicas aún no están habilitadas en esta interfaz.',
    'Consulta de números reales. La solicitud por WhatsApp se habilitará cuando esté configurado el contacto; la reserva se confirmará manualmente.', 'aviso')

style = '''
/* Raffle Lab — Modal de solicitud (sin reservas automáticas) */
.raffle-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.78);
}

.raffle-number-modal {
  position: relative;
  width: min(100%, 440px);
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px 24px;
  border: 1px solid tokens.$raffle-border;
  border-radius: tokens.$raffle-radius-md;
  background: #15191f;
  color: tokens.$raffle-text;
  text-align: center;
  box-shadow: 0 20px 70px rgba(0, 0, 0, 0.55);

  h2 { margin: 12px 0 18px; font-size: 22px; }
  p { color: tokens.$raffle-muted; line-height: 1.5; }
}

.raffle-modal-close {
  position: absolute;
  top: 10px;
  right: 14px;
  padding: 4px 10px;
  border: 0;
  background: transparent;
  color: tokens.$raffle-text;
  font-size: 26px;
  cursor: pointer;
}

.raffle-modal-number {
  display: inline-block;
  min-width: 90px;
  margin-bottom: 12px;
  padding: 20px;
  border: 1px solid #23864e;
  border-radius: tokens.$raffle-radius-md;
  background: #12251b;
  font-size: 32px;
  font-weight: 800;
}

.raffle-modal-whatsapp,
.raffle-modal-cancel {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 13px;
  border-radius: tokens.$raffle-radius-md;
  font: inherit;
}
.raffle-modal-whatsapp {
  border: 1px solid #23864e;
  background: #1b5133;
  color: #fff;
  opacity: 0.6;
  cursor: not-allowed;
}
.raffle-modal-cancel {
  border: 1px solid tokens.$raffle-border;
  background: transparent;
  color: tokens.$raffle-text;
  cursor: pointer;
}
.raffle-modal-cancel:hover { border-color: tokens.$raffle-gold; }
.raffle-modal-close:focus-visible,
.raffle-modal-cancel:focus-visible {
  outline: 2px solid tokens.$raffle-gold;
  outline-offset: 3px;
}
.raffle-number-modal .raffle-modal-note { font-size: 12px; }
'''
if '/* Raffle Lab — Modal de solicitud' in original[scss]:
    sys.exit('AVISO: el modal ya está en SCSS. No se modificó nada.')
new_scss = original[scss].rstrip() + '\n' + style

for p in files:
    if p.with_name(p.name + '.before-whatsapp-modal.bak').exists():
        sys.exit(f'ERROR: existe copia de seguridad para {p.name}. No se modificó nada.')

for p in files:
    p.with_name(p.name + '.before-whatsapp-modal.bak').write_text(original[p])
for p, content in [(ts,new_ts),(html,new_html),(scss,new_scss)]:
    p.write_text(content)
print('OK: modal visual implementado en TypeScript, HTML y SCSS.')
print('OK: copias .before-whatsapp-modal.bak creadas.')
print('WhatsApp deshabilitado hasta configurar teléfono real. Sin cambios de backend.')
