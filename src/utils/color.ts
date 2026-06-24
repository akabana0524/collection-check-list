/** "#rgb" / "#rrggbb" を {r,g,b} に変換する */
function parseHex(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff }
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1)}`
}

/** 色を ratio（0〜1）だけ暗くする */
export function darken(hex: string, ratio = 0.2): string {
  const { r, g, b } = parseHex(hex)
  return toHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio))
}

/** 背景色に対して読みやすい文字色（黒 or 白）を返す */
export function contrastText(hex: string): string {
  const { r, g, b } = parseHex(hex)
  // 相対輝度（簡易版）
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#ffffff'
}
