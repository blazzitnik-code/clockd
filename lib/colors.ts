// Midnight-purple / Miami palette — all readable with white text
const PALETTE = ["#8b2cf5", "#e0379b", "#1f7fff", "#0e9f9a", "#c026d3", "#5b5f97"];

export function companyColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}
