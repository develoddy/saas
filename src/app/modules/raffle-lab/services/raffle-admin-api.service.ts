import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RaffleAdminAuthService } from './raffle-admin-auth.service';
import { RaffleNumber } from '../models/raffle-number.model';
import { RafflePrize, RafflePrizeInput, RafflePrizesResponse } from '../models/raffle-prize.model';

export interface AdminRaffleDraw {
  id: number;
  name: string;
  totalNumbers: number;
  status: 'draft' | 'published' | 'closed';
  headline: string | null;
  description: string | null;
  bannerImage: string | null;
  bannerImageMobile: string | null;
  ticketPrice: string | null;
  drawDate: string | null;
}

export interface AdminRafflePresentation {
  headline: string | null;
  description: string | null;
  ticketPrice: number | null;
  drawDate: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface AdminRaffleReservation {
  id: number;
  drawId: number;
  participantName: string;
  status: 'active' | 'confirmed' | 'cancelled' | 'expired';
  expiresAt: string | null;
  createdAt: string;
  numbers: Array<{
    value: number;
    status: string;
  }>;
}

export interface AdminRaffleReservationsPage {
  drawId: number;
  reservations: AdminRaffleReservation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RaffleAdminApiService {
  private readonly baseUrl =
    `${environment.API_URL}/experiments/raffle-lab/admin`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: RaffleAdminAuthService
  ) {}

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.getAccessToken() || ''}`
    });
  }

  removeDrawPrizeImage(
    drawId: number,
    prizeId: number
  ): Observable<ApiResponse<RafflePrize>> {
    return this.http.delete<ApiResponse<RafflePrize>>(
      `${this.baseUrl}/draws/${drawId}/prizes/${prizeId}/image`,
      { headers: this.headers }
    );
  }

  uploadDrawPrizeImage(
    drawId: number,
    prizeId: number,
    file: File
  ): Observable<ApiResponse<RafflePrize>> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<ApiResponse<RafflePrize>>(
      `${this.baseUrl}/draws/${drawId}/prizes/${prizeId}/image`,
      formData,
      { headers: this.headers }
    );
  }

  deleteDrawPrize(
    drawId: number,
    prizeId: number
  ): Observable<ApiResponse<{ id: number; drawId: number }>> {
    return this.http.delete<ApiResponse<{ id: number; drawId: number }>>(
      `${this.baseUrl}/draws/${drawId}/prizes/${prizeId}`,
      { headers: this.headers }
    );
  }

  updateDrawPrize(
    drawId: number,
    prizeId: number,
    changes: Partial<RafflePrizeInput>
  ): Observable<ApiResponse<RafflePrize>> {
    return this.http.patch<ApiResponse<RafflePrize>>(
      `${this.baseUrl}/draws/${drawId}/prizes/${prizeId}`,
      changes,
      { headers: this.headers }
    );
  }

  createDrawPrize(
    drawId: number,
    prize: RafflePrizeInput
  ): Observable<ApiResponse<RafflePrize>> {
    return this.http.post<ApiResponse<RafflePrize>>(
      `${this.baseUrl}/draws/${drawId}/prizes`,
      prize,
      { headers: this.headers }
    );
  }

  getDrawPrizes(
    drawId: number
  ): Observable<ApiResponse<RafflePrizesResponse>> {
    return this.http.get<ApiResponse<RafflePrizesResponse>>(
      `${this.baseUrl}/draws/${drawId}/prizes`,
      { headers: this.headers }
    );
  }

  getDraws(): Observable<ApiResponse<AdminRaffleDraw[]>> {
    return this.http.get<ApiResponse<AdminRaffleDraw[]>>(
      `${this.baseUrl}/draws`,
      { headers: this.headers }
    );
  }

  createDraw(
    name: string,
    totalNumbers: number
  ): Observable<ApiResponse<AdminRaffleDraw>> {
    return this.http.post<ApiResponse<AdminRaffleDraw>>(
      `${this.baseUrl}/draws`,
      { name, totalNumbers },
      { headers: this.headers }
    );
  }

  updateDrawPresentation(
    drawId: number,
    presentation: AdminRafflePresentation
  ): Observable<ApiResponse<AdminRaffleDraw>> {
    return this.http.patch<ApiResponse<AdminRaffleDraw>>(
      `${this.baseUrl}/draws/${drawId}/presentation`,
      presentation,
      { headers: this.headers }
    );
  }

  uploadDrawBanner(
    drawId: number,
    file: File,
    variant: 'desktop' | 'mobile' = 'desktop'
  ): Observable<ApiResponse<{
    id: number;
    bannerImage: string | null;
    bannerImageMobile: string | null;
  }>> {
    const formData = new FormData();
    formData.append('variant', variant);
    formData.append('banner', file);

    return this.http.post<ApiResponse<{
      id: number;
      bannerImage: string | null;
      bannerImageMobile: string | null;
    }>>(
      `${this.baseUrl}/draws/${drawId}/banner`,
      formData,
      { headers: this.headers }
    );
  }

  getDrawNumbers(
    drawId: number
  ): Observable<ApiResponse<{
    drawId: number;
    numbers: RaffleNumber[];
  }>> {
    return this.http.get<ApiResponse<{
      drawId: number;
      numbers: RaffleNumber[];
    }>>(
      `${this.baseUrl}/draws/${drawId}/numbers`,
      { headers: this.headers }
    );
  }

  createManualReservation(
    drawId: number,
    participantName: string,
    values: number[],
    paymentStatus: 'pending' | 'paid'
  ): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(
      `${this.baseUrl}/draws/${drawId}/reservations`,
      { participantName, values, paymentStatus },
      { headers: this.headers }
    );
  }

  getReservations(
    drawId: number,
    page = 1,
    limit = 100
  ): Observable<ApiResponse<AdminRaffleReservationsPage>> {
    return this.http.get<ApiResponse<AdminRaffleReservationsPage>>(
      `${this.baseUrl}/draws/${drawId}/reservations`,
      {
        headers: this.headers,
        params: { page: String(page), limit: String(limit) }
      }
    );
  }

  confirmReservation(
    reservationId: number
  ): Observable<ApiResponse<unknown>> {
    return this.http.patch<ApiResponse<unknown>>(
      `${this.baseUrl}/reservations/${reservationId}/confirm`,
      {},
      { headers: this.headers }
    );
  }

  cancelReservation(
    reservationId: number
  ): Observable<ApiResponse<unknown>> {
    return this.http.patch<ApiResponse<unknown>>(
      `${this.baseUrl}/reservations/${reservationId}/cancel`,
      {},
      { headers: this.headers }
    );
  }

  publishDraw(
    drawId: number
  ): Observable<ApiResponse<AdminRaffleDraw>> {
    return this.http.patch<ApiResponse<AdminRaffleDraw>>(
      `${this.baseUrl}/draws/${drawId}/publish`,
      {},
      { headers: this.headers }
    );
  }

  closeDraw(
    drawId: number
  ): Observable<ApiResponse<AdminRaffleDraw>> {
    return this.http.patch<ApiResponse<AdminRaffleDraw>>(
      `${this.baseUrl}/draws/${drawId}/close`,
      {},
      { headers: this.headers }
    );
  }
}
