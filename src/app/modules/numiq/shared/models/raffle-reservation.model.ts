/**
 * Raffle Lab — Reservation Model
 * Phase 2: In-memory experiment
 */

export type RaffleReservationStatus =
  | 'active'
  | 'confirmed'
  | 'cancelled'
  | 'expired';

export interface RaffleReservation {
  id: string;
  participantName: string;
  numbers: number[];
  status: RaffleReservationStatus;
  createdAt: Date;
  expiresAt: Date;
}
