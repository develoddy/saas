import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatService, TenantConfig } from '../../services/chat.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  configForm!: FormGroup;
  agentForm!: FormGroup;
  agents: any[] = [];
  loading = true;
  saving = false;
  success: string | null = null;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadSettings();
    this.loadAgents();
  }

  initForms(): void {
    this.configForm = this.fb.group({
      widget_color: ['#4F46E5', Validators.required],
      widget_position: ['bottom-right', Validators.required],
      welcome_message: ['', [Validators.required, Validators.maxLength(250)]],
      auto_response_enabled: [true],
      capture_leads: [true],
      is_active: [true]
    });

    this.agentForm = this.fb.group({
      agent_name: ['', Validators.required],
      agent_email: ['', [Validators.required, Validators.email]]
    });
  }

  loadSettings(): void {
    this.loading = true;
    this.chatService.getConfig().subscribe({
      next: (config) => {
        this.configForm.patchValue(config);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        this.loading = false;
      }
    });
  }

  loadAgents(): void {
    this.chatService.getAgents().subscribe({
      next: (agents) => {
        this.agents = agents;
      },
      error: (err) => {
        console.error('Error loading agents:', err);
      }
    });
  }

  saveSettings(): void {
    if (this.configForm.invalid) return;

    this.saving = true;
    this.error = null;
    this.success = null;

    this.chatService.updateConfig(this.configForm.value).subscribe({
      next: () => {
        this.saving = false;
        this.success = '✅ Configuración guardada correctamente';
        setTimeout(() => this.success = null, 3000);
      },
      error: (err) => {
        console.error('Error saving settings:', err);
        this.saving = false;
        this.error = '❌ Error al guardar configuración';
      }
    });
  }

  inviteAgent(): void {
    if (this.agentForm.invalid) return;

    this.chatService.inviteAgent(this.agentForm.value).subscribe({
      next: () => {
        this.agentForm.reset();
        this.loadAgents();
        this.success = '✅ Agente invitado correctamente';
        setTimeout(() => this.success = null, 3000);
      },
      error: (err) => {
        console.error('Error inviting agent:', err);
        this.error = '❌ Error al invitar agente';
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      active: 'Activo',
      inactive: 'Inactivo',
      invited: 'Invitado'
    };
    return labels[status] || status;
  }
}
