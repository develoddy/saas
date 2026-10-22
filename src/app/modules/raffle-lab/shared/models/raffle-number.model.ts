
/**
 * Raffle Lab — Number Model
 * Phase 1: In-memory prototype
 */

export type RaffleNumberStatus =
  | 'available'
  | 'pending'
  | 'confirmed';

export interface RaffleNumber {
  value: number;
  status: RaffleNumberStatus;
}
