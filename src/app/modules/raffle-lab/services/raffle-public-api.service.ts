
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RaffleNumber } from '../models/raffle-number.model';

export interface PublicRaffleDraw {
  id: number;
  name: string;
  totalNumbers: number;
  status: 'published' | 'closed';
}

export interface PublicRaffleNumbers {
  drawId: number;
  numbers: RaffleNumber[];
}

export interface PublicRaffleReservation {
  id: number;
  drawId: number;
  status: 'active' | 'confirmed' | 'cancelled' | 'expired';
  expiresAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class RafflePublicApiService {
  private readonly baseUrl =
    `${environment.API_URL}/experiments/raffle-lab`;

  constructor(private readonly http: HttpClient) {}

  getDraws(): Observable<ApiResponse<PublicRaffleDraw[]>> {
    return this.http.get<ApiResponse<PublicRaffleDraw[]>>(
      `${this.baseUrl}/draws`
    );
  }

  getDrawNumbers(
    drawId: number
  ): Observable<ApiResponse<PublicRaffleNumbers>> {
    return this.http.get<ApiResponse<PublicRaffleNumbers>>(
      `${this.baseUrl}/draws/${drawId}/numbers`
    );
  }

  createReservation(
    drawId: number,
    participantName: string,
    values: number[]
  ): Observable<ApiResponse<PublicRaffleReservation>> {
    return this.http.post<ApiResponse<PublicRaffleReservation>>(
      `${this.baseUrl}/reservations`,
      { drawId, participantName, values }
    );
  }
}
