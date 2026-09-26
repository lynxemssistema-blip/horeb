export interface ColorPalette {
  hex: string;
  rgb: string;
  hsl: string;
  hslValues: string;
  foreground: string;
  lightTint: string;
  hover: string;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function getContrastColor(r: number, g: number, b: number): string {
  // Relative luminance according to WCAG
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? "#09090b" : "#ffffff";
}

export function generateTenantTheme(hexColor: string): ColorPalette {
  const fallbackHex = "#dc2626";
  const validHex = /^#([0-9A-F]{3}){1,2}$/i.test(hexColor) ? hexColor : fallbackHex;
  const { r, g, b } = hexToRgb(validHex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const foreground = getContrastColor(r, g, b);

  return {
    hex: validHex,
    rgb: `${r} ${g} ${b}`,
    hsl: `hsl(${h} ${s}% ${l}%)`,
    hslValues: `${h} ${s}% ${l}%`,
    foreground,
    lightTint: `rgba(${r}, ${g}, ${b}, 0.08)`,
    hover: `hsl(${h} ${s}% ${Math.max(l - 8, 10)}%)`,
  };
}
