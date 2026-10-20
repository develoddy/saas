import { Component } from '@angular/core';
import { environment } from '../../../../../environments/environment';

import { RaffleNumber, RaffleNumberStatus } from '../../models/raffle-number.model';
import { RaffleReservation, RaffleReservationStatus } from '../../models/raffle-reservation.model';
import { RafflePrize } from '../../models/raffle-prize.model';
import { RaffleNumbersService } from '../../services/raffle-numbers.service';

import { Router } from '@angular/router';
import { RaffleAdminAuthService } from '../../services/raffle-admin-auth.service';
import {
  RaffleAdminApiService,
  AdminRaffleDraw,
  AdminRaffleReservation,
  AdminRafflePresentation
} from '../../services/raffle-admin-api.service';

@Component({
  selector: 'app-management-demo',
  templateUrl: './management-demo.component.html',
  styleUrls: ['./management-demo.component.scss']
})
export class ManagementDemoComponent {
  activeAdminView: 'numbers' | 'participants' | 'settings' = 'numbers';

  totalNumbers: number;
  numbers: RaffleNumber[];

  draws: AdminRaffleDraw[] = [];
  selectedDrawId: number | null = null;
  prizes: RafflePrize[] = [];
  newPrizePosition = 1;
  newPrizeTitle = '';
  newPrizeDescription = '';
  prizeSaving = false;
  editingPrizeId: number | null = null;
  editPrizePosition = 1;
  editPrizeTitle = '';
  editPrizeDescription = '';
  prizeUpdating = false;
  prizeImageFiles: Record<number, File> = {};
  prizeImageUploadingId: number | null = null;
  prizeImageRemovingId: number | null = null;

  prizeImageMessages: Record<number, string> = {};
  deletingPrizeId: number | null = null;
  prizeDeleteMessage: string | null = null;

  prizeEditMessage: string | null = null;

  prizeFormMessage: string | null = null;

  prizesLoading = false;
  prizesMessage: string | null = null;

  newDrawName = '';
  newDrawTotalNumbers = 100;
  drawLoading = false;
  drawSaving = false;
  drawMessage: string | null = null;

  presentation: AdminRafflePresentation = {
    headline: null,
    description: null,
    ticketPrice: null,
    drawDate: null
  };
  bannerFile: File | null = null;
  bannerDragging = false;
  presentationSaving = false;
  bannerUploading = false;

  mobileBannerFile: File | null = null;
  mobileBannerDragging = false;
  mobileBannerUploading = false;
  presentationMessage: string | null = null;

  get selectedDraw(): AdminRaffleDraw | undefined {
    return this.draws.find(draw => draw.id === this.selectedDrawId);
  }

  onBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.setBannerFile(file);
    input.value = '';
  }

  onBannerDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.bannerUploading) {
      this.bannerDragging = true;
    }
  }

  onBannerDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node | null;

    if (!related || !target.contains(related)) {
      this.bannerDragging = false;
    }
  }

  onBannerDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.bannerDragging = false;

    if (this.bannerUploading) {
      return;
    }

    const files = event.dataTransfer?.files;

    if (!files?.length) {
      return;
    }

    if (files.length !== 1) {
      this.presentationMessage = 'Selecciona una sola imagen.';
      return;
    }

    this.setBannerFile(files[0]);
  }

  private setBannerFile(file: File | null): void {
    if (
      file &&
      (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
    ) {
      this.bannerFile = null;
      this.presentationMessage =
        'Selecciona una imagen JPEG, PNG o WebP de hasta 5 MB.';
      return;
    }

    this.bannerFile = file;
    this.presentationMessage = null;
  }

  onMobileBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setMobileBannerFile(input.files?.[0] || null);
    input.value = '';
  }

  onMobileBannerDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.mobileBannerUploading) {
      this.mobileBannerDragging = true;
    }
  }

  onMobileBannerDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node | null;

    if (!related || !target.contains(related)) {
      this.mobileBannerDragging = false;
    }
  }

  onMobileBannerDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.mobileBannerDragging = false;

    if (this.mobileBannerUploading) {
      return;
    }

    const files = event.dataTransfer?.files;

    if (!files?.length) {
      return;
    }

    if (files.length !== 1) {
      this.presentationMessage = 'Selecciona una sola imagen.';
      return;
    }

    this.setMobileBannerFile(files[0]);
  }

  private setMobileBannerFile(file: File | null): void {
    if (
      file &&
      (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
    ) {
      this.mobileBannerFile = null;
      this.presentationMessage =
        'Selecciona una imagen JPEG, PNG o WebP de hasta 5 MB.';
      return;
    }

    this.mobileBannerFile = file;
    this.presentationMessage = null;
  }

  uploadSelectedDrawMobileBanner(): void {
    const draw = this.selectedDraw;
    const file = this.mobileBannerFile;

    if (!draw || !file || this.mobileBannerUploading) {
      return;
    }

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.presentationMessage =
        'Selecciona una imagen JPEG, PNG o WebP de hasta 5 MB.';
      return;
    }

    this.mobileBannerUploading = true;
    this.presentationMessage = null;

    this.raffleApi.uploadDrawBanner(draw.id, file, 'mobile').subscribe({
      next: response => {
        this.draws = this.draws.map(item =>
          item.id === draw.id
            ? { ...item, bannerImageMobile: response.data.bannerImageMobile }
            : item
        );

        if (this.selectedDrawId === draw.id) {
          this.mobileBannerFile = null;
          this.presentationMessage = 'Imagen móvil actualizada.';
        }

        this.mobileBannerUploading = false;
      },
      error: error => {
        this.mobileBannerUploading = false;

        if (this.selectedDrawId === draw.id) {
          this.presentationMessage =
            error.error?.message || 'No se pudo subir el banner móvil.';
        }
      }
    });
  }

  saveDrawPresentation(): void {
    const draw = this.selectedDraw;

    if (!draw || this.presentationSaving) {
      return;
    }

    const headline = this.presentation.headline?.trim() || null;
    const description = this.presentation.description?.trim() || null;
    const rawTicketPrice = this.presentation.ticketPrice;
    const ticketPrice =
      rawTicketPrice == null
        ? null
        : Number(rawTicketPrice);
    const drawDate = this.presentation.drawDate;

    if (headline && headline.length > 200) {
      this.presentationMessage = 'El título no puede superar los 200 caracteres.';
      return;
    }

    if (description && description.length > 5000) {
      this.presentationMessage = 'La descripción no puede superar los 5000 caracteres.';
      return;
    }

    if (
      ticketPrice !== null &&
      (
        !Number.isFinite(ticketPrice) ||
        ticketPrice < 0 ||
        ticketPrice > 99999999.99 ||
        Math.abs(ticketPrice * 100 - Math.round(ticketPrice * 100)) > 1e-7
      )
    ) {
      this.presentationMessage = 'El precio introducido no es válido.';
      return;
    }

    let normalizedDate: string | null = null;

    if (drawDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
        this.presentationMessage = 'La fecha introducida no es válida.';
        return;
      }

      normalizedDate = `${drawDate}T12:00:00.000Z`;

      if (
        new Date(normalizedDate).toISOString().slice(0, 10) !== drawDate
      ) {
        this.presentationMessage = 'La fecha introducida no es válida.';
        return;
      }
    }

    this.presentationSaving = true;
    this.presentationMessage = null;

    this.raffleApi.updateDrawPresentation(draw.id, {
      headline,
      description,
      ticketPrice,
      drawDate: normalizedDate
    }).subscribe({
      next: response => {
        this.draws = this.draws.map(item =>
          item.id === draw.id ? response.data : item
        );

        if (this.selectedDrawId === draw.id) {
          this.presentation.drawDate = response.data.drawDate
            ? response.data.drawDate.slice(0, 10)
            : null;
          this.presentationMessage = 'Datos comerciales guardados.';
        }

        this.presentationSaving = false;
      },
      error: error => {
        this.presentationSaving = false;

        if (this.selectedDrawId === draw.id) {
          this.presentationMessage =
            error.error?.message || 'No se pudieron guardar los datos.';
        }
      }
    });
  }

  uploadSelectedDrawBanner(): void {
    const draw = this.selectedDraw;
    const file = this.bannerFile;

    if (!draw || !file || this.bannerUploading) {
      return;
    }

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.presentationMessage =
        'Selecciona una imagen JPEG, PNG o WebP de hasta 5 MB.';
      return;
    }

    this.bannerUploading = true;
    this.presentationMessage = null;

    this.raffleApi.uploadDrawBanner(draw.id, file).subscribe({
      next: response => {
        this.draws = this.draws.map(item =>
          item.id === draw.id
            ? { ...item, bannerImage: response.data.bannerImage }
            : item
        );

        if (this.selectedDrawId === draw.id) {
          this.bannerFile = null;
          this.presentationMessage = 'Imagen del banner actualizada.';
        }

        this.bannerUploading = false;
      },
      error: error => {
        this.bannerUploading = false;

        if (this.selectedDrawId === draw.id) {
          this.presentationMessage =
            error.error?.message || 'No se pudo subir el banner.';
        }
      }
    });
  }

  getBannerImageUrl(imagePath: string): string {
    const apiUrl = environment.API_URL.endsWith('/api')
      ? environment.API_URL.slice(0, -4)
      : environment.API_URL;
    return `${apiUrl}${imagePath}`;
  }

  drawActionLoading = false;

  publishSelectedDraw(): void {
    const draw = this.selectedDraw;

    if (!draw || draw.status !== 'draft' || this.drawActionLoading) {
      return;
    }

    if (!window.confirm(
      `¿Publicar el sorteo "${draw.name}" en la vista pública?`
    )) {
      return;
    }

    this.drawActionLoading = true;
    this.drawMessage = null;

    this.raffleApi.publishDraw(draw.id).subscribe({
      next: response => {
        this.draws = this.draws.map(item =>
          item.id === draw.id ? response.data : item
        );

        this.drawActionLoading = false;
        this.drawMessage = 'Sorteo publicado correctamente.';
      },
      error: error => {
        this.drawActionLoading = false;
        this.drawMessage =
          error.error?.message || 'No se pudo publicar el sorteo.';
      }
    });
  }

  closeSelectedDraw(): void {
    const draw = this.selectedDraw;

    if (!draw || draw.status !== 'published' || this.drawActionLoading) {
      return;
    }

    if (!window.confirm(
      `¿Cerrar definitivamente el sorteo "${draw.name}"?`
    )) {
      return;
    }

    this.drawActionLoading = true;
    this.drawMessage = null;

    this.raffleApi.closeDraw(draw.id).subscribe({
      next: response => {
        this.draws = this.draws.map(item =>
          item.id === draw.id ? response.data : item
        );

        this.drawActionLoading = false;
        this.drawMessage = 'Sorteo cerrado correctamente.';
      },
      error: error => {
        this.drawActionLoading = false;
        this.drawMessage =
          error.error?.message || 'No se pudo cerrar el sorteo.';
      }
    });
  }

  get numberSummary(): {
    available: number;
    pending: number;
    confirmed: number;
    other: number;
  } {
    const counts = {
      available: 0,
      pending: 0,
      confirmed: 0,
      other: 0
    };

    for (const number of this.numbers) {
      if (number.status === 'available') {
        counts.available++;
      } else if (number.status === 'pending') {
        counts.pending++;
      } else if (number.status === 'confirmed') {
        counts.confirmed++;
      } else {
        counts.other++;
      }
    }

    return counts;
  }

  get participantSummary(): {
    pending: number;
    confirmed: number;
  } {
    return {
      pending: this.realReservations.filter(
        reservation => reservation.status === 'active'
      ).length,
      confirmed: this.realReservations.filter(
        reservation => reservation.status === 'confirmed'
      ).length
    };
  }

  loadDraws(): void {
    this.drawLoading = true;

    this.raffleApi.getDraws().subscribe({
      next: response => {
        this.draws = response.data;
        this.drawLoading = false;

        if (this.draws.length && this.selectedDrawId === null) {
          this.selectDraw(this.draws[0].id);
        }
      },
      error: () => {
        this.drawLoading = false;
        this.drawMessage = 'No se pudieron cargar los sorteos.';
      }
    });
  }

  createPrize(): void {
    const drawId = this.selectedDrawId;
    const position = Number(this.newPrizePosition);
    const title = this.newPrizeTitle.trim();
    const description = this.newPrizeDescription.trim();

    if (drawId === null || this.prizeSaving) {
      return;
    }

    if (!Number.isInteger(position) || position < 1 || position > 4294967295) {
      this.prizeFormMessage = 'Introduce una posición válida.';
      return;
    }

    if (!title || title.length > 200) {
      this.prizeFormMessage = 'El título debe tener entre 1 y 200 caracteres.';
      return;
    }

    this.prizeSaving = true;
    this.prizeFormMessage = null;

    this.raffleApi.createDrawPrize(drawId, {
      position,
      title,
      description: description || null
    }).subscribe({
      next: response => {
        this.prizeSaving = false;

        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.prizes = [...this.prizes, response.data]
          .sort((a, b) => a.position - b.position);

        this.newPrizePosition = Math.max(
          1,
          ...this.prizes.map(prize => prize.position + 1)
        );
        this.newPrizeTitle = '';
        this.newPrizeDescription = '';
        this.prizeFormMessage = 'Premio creado correctamente.';
      },
      error: error => {
        this.prizeSaving = false;

        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.prizeFormMessage = error.status === 409
          ? 'Ya existe un premio con esa posición.'
          : error.error?.message || 'No se pudo crear el premio.';
      }
    });
  }

  startEditPrize(prize: RafflePrize): void {
    if (this.prizeUpdating) {
      return;
    }

    this.editingPrizeId = prize.id;
    this.editPrizePosition = prize.position;
    this.editPrizeTitle = prize.title;
    this.editPrizeDescription = prize.description || '';
    this.prizeEditMessage = null;
  }

  cancelEditPrize(): void {
    if (this.prizeUpdating) {
      return;
    }

    this.editingPrizeId = null;
    this.prizeEditMessage = null;
  }

  saveEditPrize(): void {
    const drawId = this.selectedDrawId;
    const prizeId = this.editingPrizeId;
    const position = Number(this.editPrizePosition);
    const title = this.editPrizeTitle.trim();
    const description = this.editPrizeDescription.trim();

    if (drawId === null || prizeId === null || this.prizeUpdating) {
      return;
    }

    if (!Number.isInteger(position) || position < 1 || position > 4294967295) {
      this.prizeEditMessage = 'Introduce una posición válida.';
      return;
    }

    if (!title || title.length > 200) {
      this.prizeEditMessage = 'El título debe tener entre 1 y 200 caracteres.';
      return;
    }

    this.prizeUpdating = true;
    this.prizeEditMessage = null;

    this.raffleApi.updateDrawPrize(drawId, prizeId, {
      position,
      title,
      description: description || null
    }).subscribe({
      next: response => {
        this.prizeUpdating = false;

        if (this.selectedDrawId !== drawId ||
            this.editingPrizeId !== prizeId) {
          return;
        }

        this.prizes = this.prizes.map(prize =>
          prize.id === prizeId ? response.data : prize
        ).sort((a, b) => a.position - b.position);

        this.editingPrizeId = null;
        this.prizeFormMessage = 'Premio actualizado correctamente.';
      },
      error: error => {
        this.prizeUpdating = false;

        if (this.selectedDrawId !== drawId ||
            this.editingPrizeId !== prizeId) {
          return;
        }

        this.prizeEditMessage = error.status === 409
          ? 'Ya existe un premio con esa posición.'
          : error.error?.message || 'No se pudo actualizar el premio.';
      }
    });
  }

  onPrizeImageSelected(event: Event, prizeId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      delete this.prizeImageFiles[prizeId];
      return;
    }

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      delete this.prizeImageFiles[prizeId];
      input.value = '';
      this.prizeImageMessages[prizeId] =
        'Selecciona una imagen JPEG, PNG o WebP de hasta 5 MB.';
      return;
    }

    this.prizeImageFiles[prizeId] = file;
    delete this.prizeImageMessages[prizeId];
  }

  uploadPrizeImage(prize: RafflePrize): void {
    const drawId = this.selectedDrawId;
    const file = this.prizeImageFiles[prize.id];

    if (
      drawId === null ||
      !file ||
      this.prizeImageUploadingId !== null ||
      this.prizeImageRemovingId !== null ||
      this.deletingPrizeId !== null ||
      this.prizeUpdating ||
      this.prizeSaving
    ) {
      return;
    }

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.prizeImageMessages[prize.id] =
        'Selecciona una imagen JPEG, PNG o WebP de hasta 5 MB.';
      return;
    }

    this.prizeImageUploadingId = prize.id;
    delete this.prizeImageMessages[prize.id];

    if (this.prizeFormMessage === 'Premio creado correctamente.') {
      this.prizeFormMessage = null;
    }

    if (this.prizeDeleteMessage === 'Premio eliminado correctamente.') {
      this.prizeDeleteMessage = null;
    }

    this.raffleApi.uploadDrawPrizeImage(drawId, prize.id, file).subscribe({
      next: response => {
        if (this.selectedDrawId === drawId) {
          this.prizes = this.prizes.map(item =>
            item.id === prize.id ? response.data : item
          );

          delete this.prizeImageFiles[prize.id];

          const input = document.getElementById(
            `raffle-prize-image-${prize.id}`
          ) as HTMLInputElement | null;

          if (input) {
            input.value = '';
          }

          this.prizeImageMessages[prize.id] = 'Imagen del premio actualizada.';
        }

        this.prizeImageUploadingId = null;
      },
      error: error => {
        if (this.selectedDrawId === drawId) {
          this.prizeImageMessages[prize.id] =
            error.error?.message || 'No se pudo subir la imagen del premio.';
        }

        this.prizeImageUploadingId = null;
      }
    });
  }

  removePrizeImage(prize: RafflePrize): void {
    const drawId = this.selectedDrawId;

    if (
      drawId === null ||
      !prize.imagePath ||
      this.prizeImageRemovingId !== null ||
      this.prizeImageUploadingId !== null ||
      this.deletingPrizeId !== null ||
      this.prizeUpdating ||
      this.prizeSaving
    ) {
      return;
    }

    if (!window.confirm(
      `¿Eliminar la imagen del premio "${prize.title}"? El premio se conservará.`
    )) {
      return;
    }

    this.prizeImageRemovingId = prize.id;
    delete this.prizeImageMessages[prize.id];

    this.raffleApi.removeDrawPrizeImage(drawId, prize.id).subscribe({
      next: response => {
        if (this.selectedDrawId === drawId) {
          this.prizes = this.prizes.map(item =>
            item.id === prize.id ? response.data : item
          );

          delete this.prizeImageFiles[prize.id];

          const input = document.getElementById(
            `raffle-prize-image-${prize.id}`
          ) as HTMLInputElement | null;

          if (input) {
            input.value = '';
          }

          this.prizeImageMessages[prize.id] =
            'Imagen del premio eliminada correctamente.';
        }

        this.prizeImageRemovingId = null;
      },
      error: error => {
        if (this.selectedDrawId === drawId) {
          this.prizeImageMessages[prize.id] =
            error.error?.message || 'No se pudo eliminar la imagen.';
        }

        this.prizeImageRemovingId = null;
      }
    });
  }

  deletePrize(prize: RafflePrize): void {
    const drawId = this.selectedDrawId;

    if (
      drawId === null ||
      this.deletingPrizeId !== null ||
      this.prizeUpdating ||
      this.prizeSaving
    ) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el premio "${prize.title}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    this.deletingPrizeId = prize.id;
    this.prizeDeleteMessage = null;

    this.raffleApi.deleteDrawPrize(drawId, prize.id).subscribe({
      next: () => {
        if (this.selectedDrawId === drawId) {
          this.prizes = this.prizes.filter(item => item.id !== prize.id);

          if (this.editingPrizeId === prize.id) {
            this.editingPrizeId = null;
          }

          this.prizeDeleteMessage = 'Premio eliminado correctamente.';
        }

        this.deletingPrizeId = null;
      },
      error: error => {
        if (this.selectedDrawId === drawId) {
          this.prizeDeleteMessage =
            error.error?.message || 'No se pudo eliminar el premio.';
        }

        this.deletingPrizeId = null;
      }
    });
  }

  loadDrawPrizes(drawId: number): void {
    this.prizesLoading = true;
    this.prizesMessage = null;

    this.raffleApi.getDrawPrizes(drawId).subscribe({
      next: response => {
        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.prizes = response.data.prizes;
        this.prizesLoading = false;
      },
      error: () => {
        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.prizesLoading = false;
        this.prizesMessage = 'No se pudieron cargar los premios.';
      }
    });
  }

  selectDraw(drawId: number): void {
    if (
      this.prizeUpdating ||
      this.prizeSaving ||
      this.deletingPrizeId !== null ||
      this.prizeImageUploadingId !== null ||
      this.prizeImageRemovingId !== null
    ) {
      return;
    }

    const draw = this.draws.find(item => item.id === drawId);

    if (!draw) {
      return;
    }

    this.selectedDrawId = draw.id;
    this.editingPrizeId = null;
    this.prizeEditMessage = null;
    this.prizeFormMessage = null;
    this.prizeDeleteMessage = null;
    this.prizeImageMessages = {};
    this.prizeImageFiles = {};
    this.prizes = [];
    this.prizesLoading = false;
    this.prizesMessage = null;
    this.loadDrawPrizes(draw.id);
    this.presentation = {
      headline: draw.headline,
      description: draw.description,
      ticketPrice: draw.ticketPrice === null
        ? null
        : Number(draw.ticketPrice),
      drawDate: draw.drawDate
        ? draw.drawDate.slice(0, 10)
        : null
    };
    this.bannerFile = null;
    this.mobileBannerFile = null;
    this.mobileBannerDragging = false;
    this.presentationMessage = null;
    this.manualSelectedNumbers = [];
    this.manualNumbersInput = '';
    this.manualInputError = null;
    this.manualMessage = null;
    this.totalNumbers = draw.totalNumbers;
    this.numbers = [];
    this.selectedNumber = null;
    this.realReservations = [];
    this.reservationMessage = null;
    this.loadReservations(draw.id);
    this.drawMessage = null;

    this.raffleApi.getDrawNumbers(draw.id).subscribe({
      next: response => {
        if (this.selectedDrawId === draw.id) {
          this.numbers = response.data.numbers;
        }
      },
      error: () => {
        if (this.selectedDrawId === draw.id) {
          this.drawMessage = 'No se pudieron cargar los números.';
        }
      }
    });
  }

  manualParticipantName = '';
  manualNumbersInput = '';
  manualInputError: string | null = null;

  addManualNumbersFromText(): void {
    this.manualInputError = null;

    const input = this.manualNumbersInput.trim();

    if (!input) {
      return;
    }

    const parts = input.split(/[\s,;]+/).filter(Boolean);

    if (parts.some(part => !/^[0-9]+$/.test(part))) {
      this.manualInputError = 'Introduce números separados por comas.';
      return;
    }

    const values = parts.map(Number);

    if (values.some(value => !Number.isSafeInteger(value))) {
      this.manualInputError = 'Hay números inválidos.';
      return;
    }

    const combined = [...this.manualSelectedNumbers, ...values];

    if (new Set(combined).size !== combined.length) {
      this.manualInputError = 'Hay números repetidos en la selección.';
      return;
    }

    const unavailable = values.filter(value =>
      !this.numbers.some(
        number => number.value === value &&
                  number.status === 'available'
      )
    );

    if (unavailable.length) {
      this.manualInputError =
        'Números no disponibles: ' + unavailable.join(', ');
      return;
    }

    this.manualSelectedNumbers = combined.sort((a, b) => a - b);
    this.manualNumbersInput = '';
  }

  removeManualNumber(value: number): void {
    this.manualSelectedNumbers =
      this.manualSelectedNumbers.filter(item => item !== value);
  }


  manualPaymentStatus: 'pending' | 'paid' = 'pending';
  manualSelectedNumbers: number[] = [];
  manualSaving = false;
  manualMessage: string | null = null;

  toggleManualNumber(value: number): void {
    const number = this.numbers.find(item => item.value === value);

    if (!number || number.status !== 'available') {
      return;
    }

    this.manualSelectedNumbers =
      this.manualSelectedNumbers.includes(value)
        ? this.manualSelectedNumbers.filter(item => item !== value)
        : [...this.manualSelectedNumbers, value].sort((a, b) => a - b);
  }

  createManualReservation(): void {
    const name = this.manualParticipantName.trim();
    const drawId = this.selectedDrawId;

    if (
      drawId === null ||
      this.selectedDraw?.status === 'closed' ||
      !name ||
      this.manualSelectedNumbers.length === 0 ||
      this.manualSaving
    ) {
      return;
    }

    const unavailable = this.manualSelectedNumbers.filter(
      value => !this.numbers.some(
        number =>
          number.value === value &&
          number.status === 'available'
      )
    );

    if (unavailable.length) {
      this.manualMessage =
        'Estos números ya no están disponibles: ' +
        unavailable.join(', ');
      this.refreshNumbers(drawId);
      return;
    }

    this.manualSaving = true;
    this.manualMessage = null;

    this.raffleApi.createManualReservation(
      drawId,
      name,
      [...this.manualSelectedNumbers],
      this.manualPaymentStatus
    ).subscribe({
      next: () => {
        this.manualSaving = false;

        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.manualParticipantName = '';
        this.manualSelectedNumbers = [];
        this.manualNumbersInput = '';
        this.manualInputError = null;
        this.manualMessage = 'Reserva guardada correctamente.';

        this.loadReservations(drawId);
        this.refreshNumbers(drawId);
      },
      error: error => {
        this.manualSaving = false;

        if (this.selectedDrawId === drawId) {
          this.manualMessage =
            error.error?.message || 'No se pudo guardar la reserva.';
        }
      }
    });
  }

  createDraw(): void {
    const name = this.newDrawName.trim();

    if (!name || !Number.isInteger(this.newDrawTotalNumbers) ||
        this.newDrawTotalNumbers < 1 || this.drawSaving) {
      return;
    }

    this.drawSaving = true;
    this.drawMessage = null;

    this.raffleApi.createDraw(name, this.newDrawTotalNumbers).subscribe({
      next: response => {
        this.drawSaving = false;
        this.draws = [response.data, ...this.draws];
        this.newDrawName = '';
        this.selectDraw(response.data.id);
        this.drawMessage = 'Sorteo creado correctamente.';
      },
      error: () => {
        this.drawSaving = false;
        this.drawMessage = 'No se pudo crear el sorteo.';
      }
    });
  }

  selectedNumber: RaffleNumber | null = null;
  statusMessage: string | null = null;
  reservationMessage: string | null = null;

  realReservations: AdminRaffleReservation[] = [];
  reservationsLoading = false;
  reservationTotal = 0;

  get activeReservations(): AdminRaffleReservation[] {
    return this.realReservations.filter(
      reservation => reservation.status === 'active'
    );
  }

  get reservationHistory(): AdminRaffleReservation[] {
    return this.realReservations
      .filter(reservation => reservation.status !== 'active')
      .sort((a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
  }

  private reservationsRequestId = 0;

  loadReservations(drawId: number): void {
    const requestId = ++this.reservationsRequestId;

    this.reservationsLoading = true;
    this.realReservations = [];

    const allReservations: AdminRaffleReservation[] = [];
    const pageSize = 100;

    const loadPage = (page: number): void => {
      this.raffleApi.getReservations(drawId, page, pageSize).subscribe({
        next: response => {
          if (
            this.selectedDrawId !== drawId ||
            requestId !== this.reservationsRequestId
          ) {
            return;
          }

          const result = response.data;

          allReservations.push(...result.reservations);

          const totalPages = result.pagination.totalPages;

          if (page < totalPages) {
            loadPage(page + 1);
            return;
          }

          this.realReservations = allReservations;
          this.reservationTotal = result.pagination.total;
          this.reservationsLoading = false;
          this.historyPage = 1;
        },
        error: error => {
          if (
            this.selectedDrawId !== drawId ||
            requestId !== this.reservationsRequestId
          ) {
            return;
          }

          this.reservationsLoading = false;
          this.reservationMessage =
            error.error?.message ||
            'No se pudieron cargar todas las reservas.';
        }
      });
    };

    loadPage(1);
  }

  getReservationNumbers(
    reservation: AdminRaffleReservation
  ): string {
    return reservation.numbers
      .map(number => number.value)
      .sort((a, b) => a - b)
      .join(', ');
  }

  readonly historyPageSize = 10;

  historyFilter: RaffleReservationStatus | 'all' = 'all';
  historyPage = 1;

  get filteredReservationHistory(): AdminRaffleReservation[] {
    const history = this.reservationHistory;

    return this.historyFilter === 'all'
      ? history
      : history.filter(
          reservation => reservation.status === this.historyFilter
        );
  }

  get historyTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(
        this.filteredReservationHistory.length / this.historyPageSize
      )
    );
  }

  get paginatedReservationHistory(): AdminRaffleReservation[] {
    const page = Math.min(this.historyPage, this.historyTotalPages);
    const start = (page - 1) * this.historyPageSize;

    return this.filteredReservationHistory.slice(
      start,
      start + this.historyPageSize
    );
  }

  setHistoryFilter(
    status: RaffleReservationStatus | 'all'
  ): void {
    this.historyFilter = status;
    this.historyPage = 1;
  }

  changeHistoryPage(page: number): void {
    if (page < 1 || page > this.historyTotalPages) {
      return;
    }

    this.historyPage = page;
  }

  readonly reservationOperationsInProgress = new Set<number>();

  isReservationOperationInProgress(id: number): boolean {
    return this.reservationOperationsInProgress.has(id);
  }

  confirmActiveReservation(id: number): void {
    const drawId = this.selectedDrawId;

    if (
      drawId === null ||
      this.reservationOperationsInProgress.has(id)
    ) {
      return;
    }

    this.reservationOperationsInProgress.add(id);

    this.raffleApi.confirmReservation(id).subscribe({
      next: () => {
        this.reservationOperationsInProgress.delete(id);
        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.reservationMessage = 'Pago confirmado correctamente.';
        this.loadReservations(drawId);
        this.refreshNumbers(drawId);
      },
      error: error => {
        this.reservationOperationsInProgress.delete(id);
        if (this.selectedDrawId === drawId) {
          this.reservationMessage =
            error.error?.message || 'No se pudo confirmar el pago.';
        }
      }
    });
  }

  cancelActiveReservation(id: number): void {
    if (!window.confirm('¿Cancelar esta reserva y liberar sus números?')) {
      return;
    }

    const drawId = this.selectedDrawId;

    if (
      drawId === null ||
      this.reservationOperationsInProgress.has(id)
    ) {
      return;
    }

    this.reservationOperationsInProgress.add(id);

    this.raffleApi.cancelReservation(id).subscribe({
      next: () => {
        this.reservationOperationsInProgress.delete(id);
        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.reservationMessage = 'Reserva cancelada correctamente.';
        this.loadReservations(drawId);
        this.refreshNumbers(drawId);
      },
      error: error => {
        this.reservationOperationsInProgress.delete(id);
        if (this.selectedDrawId === drawId) {
          this.reservationMessage =
            error.error?.message || 'No se pudo cancelar la reserva.';
        }
      }
    });
  }

  reconcileManualSelection(): void {
    const available = new Set(
      this.numbers
        .filter(number => number.status === 'available')
        .map(number => number.value)
    );

    const removed = this.manualSelectedNumbers.filter(
      value => !available.has(value)
    );

    if (!removed.length) {
      return;
    }

    this.manualSelectedNumbers = this.manualSelectedNumbers.filter(
      value => available.has(value)
    );

    this.manualInputError =
      'Se han retirado números que ya no están disponibles: ' +
      removed.join(', ');
  }

  refreshNumbers(drawId: number): void {
    this.raffleApi.getDrawNumbers(drawId).subscribe({
      next: response => {
        if (this.selectedDrawId === drawId) {
          this.numbers = response.data.numbers;

          if (this.selectedNumber) {
            this.selectedNumber =
              this.numbers.find(
                number => number.value === this.selectedNumber?.value
              ) ?? null;
          }

          this.reconcileManualSelection();
        }
      },
      error: () => {
        if (this.selectedDrawId === drawId) {
          this.drawMessage = 'No se pudieron actualizar los números.';
        }
      }
    });
  }

  get selectedNumberReservation(): AdminRaffleReservation | undefined {
    const selected = this.selectedNumber;

    if (!selected || selected.status === 'available') {
      return undefined;
    }

    const expectedStatus =
      selected.status === 'pending' ? 'active' : 'confirmed';

    return this.realReservations.find(
      reservation =>
        reservation.status === expectedStatus &&
        reservation.numbers.some(
          reservedNumber => reservedNumber.value === selected.value
        )
    );
  }

  selectNumber(number: RaffleNumber): void {
    this.selectedNumber =
      this.selectedNumber?.value === number.value
        ? null
        : number;

    this.statusMessage = null;
  }



  get availableCount(): number {
    return this.numbers.filter(
      number => number.status === 'available'
    ).length;
  }

  get pendingCount(): number {
    return this.numbers.filter(
      number => number.status === 'pending'
    ).length;
  }

  get confirmedCount(): number {
    return this.numbers.filter(
      number => number.status === 'confirmed'
    ).length;
  }

  constructor(
    private readonly raffleNumbersService: RaffleNumbersService,
    private readonly auth: RaffleAdminAuthService,
    private readonly raffleApi: RaffleAdminApiService,
    private readonly router: Router
  ) {
    this.totalNumbers = raffleNumbersService.totalNumbers;
    this.numbers = [];
    this.loadDraws();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/raffle-lab/management/login']);
  }
}
