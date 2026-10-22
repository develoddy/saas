import { environment } from '../../../../../environments/environment';

export function getRaffleImageUrl(
  imagePath: string | null | undefined
): string | null {
  if (!imagePath || !imagePath.startsWith('/uploads/raffle-lab/')) {
    return null;
  }

  const apiUrl = environment.API_URL.endsWith('/api')
    ? environment.API_URL.slice(0, -4)
    : environment.API_URL;

  return `${apiUrl}${imagePath}`;
}
