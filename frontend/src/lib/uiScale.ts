/**
 * UI Scale and Adaptive HiDPI Engine
 * Handles resolution-aware zoom scaling and comfortable typography without breaking desktop layout.
 */

export interface ScaleOption {
  id: string;
  label: string;
  factor: number;
  baseFont: number;
  desc: string;
}

export const SCALE_OPTIONS: ScaleOption[] = [
  { id: 'auto', label: 'Auto (Adaptive HiDPI)', factor: 1.0, baseFont: 14, desc: 'Otomatis menyesuaikan skala optimal layar Anda tanpa memotong kolom.' },
  { id: '90', label: '90% — Compact (13px)', factor: 0.90, baseFont: 13, desc: 'Tampilan padat, memuat lebih banyak baris kode & dokumen.' },
  { id: '100', label: '100% — Default Standard (14px)', factor: 1.0, baseFont: 14, desc: 'Skala seimbang & tajam, standar desktop.' },
  { id: '105', label: '105% — Standard Plus (14.5px)', factor: 1.05, baseFont: 14.5, desc: 'Sedikit lebih lega dengan tata letak tetap proporsional.' },
  { id: '110', label: '110% — Medium (15px)', factor: 1.10, baseFont: 15, desc: 'Teks lebih terbaca jelas dan nyaman untuk mata.' },
  { id: '115', label: '115% — Comfort (16px)', factor: 1.15, baseFont: 16, desc: 'Ideal untuk monitor 2K/3K atau laptop HiDPI berskala 175%.' },
  { id: '120', label: '120% — Large (17px)', factor: 1.20, baseFont: 17, desc: 'Teks besar dan anti-lelah untuk jarak baca sedang.' },
  { id: '125', label: '125% — Extra Large (18px)', factor: 1.25, baseFont: 18, desc: 'Skala maksimal yang tetap menjaga ruang kolom tengah.' },
];

/**
 * Calculates a safe adaptive zoom factor that fits high-resolution displays
 * without squeezing the main workspace or overflowing the settings dialog.
 */
export function getAdaptiveZoomFactor(width: number, height: number): number {
  if (width >= 2400) return 1.15;
  if (width >= 1700) return 1.05;
  if (width >= 1350) return 1.0;
  return 1.0;
}

export function resolveZoomFactor(setting: string, width: number, height: number): { zoom: number; fontPx: number } {
  if (setting === 'auto') {
    const factor = getAdaptiveZoomFactor(width, height);
    return { zoom: factor, fontPx: Number((14 * factor).toFixed(1)) };
  }
  const match = SCALE_OPTIONS.find(o => o.id === setting);
  if (match) {
    return { zoom: match.factor, fontPx: match.baseFont };
  }
  // Legacy aliases fallback
  if (setting === 'compact') return { zoom: 0.90, fontPx: 13 };
  if (setting === 'standard') return { zoom: 1.0, fontPx: 14 };
  if (setting === 'large') return { zoom: 1.10, fontPx: 15 };
  if (setting === 'extralarge') return { zoom: 1.20, fontPx: 17 };
  if (setting === 'comfort') return { zoom: 1.15, fontPx: 16 };

  return { zoom: 1.0, fontPx: 14 };
}
