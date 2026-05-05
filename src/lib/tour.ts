export function totalTourRounds(cityCount: number): number {
  if (cityCount <= 0) return 1;
  return Math.ceil(cityCount / 20);
}
