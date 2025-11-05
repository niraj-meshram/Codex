export type ThemeSpec = {
  // Phaser numeric colors
  bgTop: number;
  bgBottom: number;
  panelBg: number;
  panelBorder: number;
  accent: number; // primary accent for borders/trail
  success: number; // win text
  danger: number; // lose/impact
  // CSS values
  textPrimary: string;
  textSecondary: string;
  buttonBg: string;
  buttonText: string;
  fontFamily: string;
};

const Tesla: ThemeSpec = {
  bgTop: 0x0e1116,
  bgBottom: 0x0a0c10,
  panelBg: 0x0f1218,
  panelBorder: 0xffffff,
  accent: 0xffffff,
  success: 0x16a34a,
  danger: 0xef4444,
  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  buttonBg: '#111827',
  buttonText: '#e5e7eb',
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
};

const Airbnb: ThemeSpec = {
  bgTop: 0x111827,
  bgBottom: 0x0b1220,
  panelBg: 0x121a2a,
  panelBorder: 0xff385c,
  accent: 0xff385c,
  success: 0x22c55e,
  danger: 0xf97316,
  textPrimary: '#f3f4f6',
  textSecondary: '#a1a1aa',
  buttonBg: '#ff385c',
  buttonText: '#ffffff',
  fontFamily: 'Nunito, Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
};

const themes: Record<string, ThemeSpec> = {
  tesla: Tesla,
  airbnb: Airbnb
};

let current: ThemeSpec = Tesla;

export function setTheme(name?: string): void {
  if (!name) {
    current = Tesla;
    return;
  }
  const key = name.toLowerCase();
  current = themes[key] ?? Tesla;
}

export function initThemeFromURL(): void {
  try {
    const t = new URLSearchParams(window.location.search).get('theme');
    setTheme(t ?? undefined);
  } catch {
    setTheme(undefined);
  }
}

export function getTheme(): ThemeSpec {
  return current;
}
