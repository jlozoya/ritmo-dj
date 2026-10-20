import type { RequestStatus } from '@/types/music';
export const statuses: RequestStatus[] = [
  'pending',
  'accepted',
  'played',
  'rejected',
];
export const labels: Record<RequestStatus, string> = {
  pending: 'Por revisar',
  accepted: 'En la lista',
  played: 'Tocadas',
  rejected: 'Descartadas',
};
