export function getArtistHref(artistId: string) {
  // Cutover-Schalter: solange V2 aktiv ist, zeigen alle Artist-Links auf V2.
  // Wenn Cutover final ist, hier auf "/dashboard/artist" zurückstellen oder umdrehen.
  return `/dashboard/artist-v2/${artistId}`;
}
