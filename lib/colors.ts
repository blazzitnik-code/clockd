// Midnight-purple / Miami palette — all readable with white text
const PALETTE = ["#8b2cf5", "#e0379b", "#5b6cff", "#c026d3", "#a855f7", "#5b5f97"];

export function companyColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}
