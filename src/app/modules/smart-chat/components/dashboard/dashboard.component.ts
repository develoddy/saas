import { Component, OnInit } from '@angular/core';
import { ChatService, ChatStats, Conversation } from '../../services/chat.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: ChatStats | null = null;
  recentConversations: Conversation[] = [];
  loading = true;
  error: string | null = null;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Cargar estadísticas
    this.chatService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.error = 'Error al cargar estadísticas';
      }
    });

    // Cargar conversaciones recientes
    this.chatService.getConversations({ limit: 5 }).subscribe({
      next: (conversations) => {
        this.recentConversations = conversations;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading conversations:', err);
        this.error = 'Error al cargar conversaciones';
        this.loading = false;
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      open: 'badge-success',
      closed: 'badge-gray',
      pending: 'badge-warning'
    };
    return classes[status] || 'badge-gray';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      open: 'Abierta',
      closed: 'Cerrada',
      pending: 'Pendiente'
    };
    return labels[status] || status;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
