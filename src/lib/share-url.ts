/** O link público curto que o criador compartilha com a audiência. */
export function buildShareUrl(id: string, origin?: string): string {
  const base = origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  return `${base}/go/${id}`;
}
