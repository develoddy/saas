export interface RafflePrize {
  id: number;
  position: number;
  title: string;
  description: string | null;
  imagePath: string | null;
}

export interface RafflePrizeInput {
  position: number;
  title: string;
  description: string | null;
}

export interface RafflePrizesResponse {
  drawId: number;
  prizes: RafflePrize[];
}
