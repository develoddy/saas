
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { RaffleNumber } from '../../shared/models/raffle-number.model';
import { RafflePrizesResponse } from '../../shared/models/raffle-prize.model';

export interface PublicRaffleDraw {
  id: number;
  name: string;
  totalNumbers: number;
  status: 'published' | 'closed';
  headline: string | null;
  description: string | null;
  bannerImage: string | null;
  bannerImageMobile: string | null;
  ticketPrice: string | null;
  drawDate: string | null;
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

export interface PublicRaffleResult {
  id: number;
  numberValue: number | null;
}

export interface PublicRaffleResultPrize {
  id: number;
  position: number;
  title: string;
  description: string | null;
  imagePath: string | null;
  result: PublicRaffleResult | null;
}

export interface PublicRaffleResults {
  drawId: number;
  resultsPublishedAt: string | null;
  prizes: PublicRaffleResultPrize[];
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

  getDrawPrizes(
    drawId: number
  ): Observable<ApiResponse<RafflePrizesResponse>> {
    return this.http.get<ApiResponse<RafflePrizesResponse>>(
      `${this.baseUrl}/draws/${drawId}/prizes`
    );
  }

  getDrawResults(
    drawId: number
  ): Observable<ApiResponse<PublicRaffleResults>> {
    return this.http.get<ApiResponse<PublicRaffleResults>>(
      `${this.baseUrl}/draws/${drawId}/results`
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
