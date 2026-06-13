const isValidRgbChannel = (value: number) => {
  return Number.isInteger(value) && value >= 0 && value <= 255;
};

const toRgbString = (r: number, g: number, b: number) => `rgb(${r},${g},${b})`;

export const normalizeRgbColor = (input: unknown): string | null => {
  if (typeof input !== "string") {
    return null;
  }

  const value = input.trim();
  if (!value) {
    return null;
  }

  const hexMatch = value.match(/^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/);
  if (hexMatch) {
    const hex =
      hexMatch[1].length === 3
        ? hexMatch[1].split("").map((c) => `${c}${c}`).join("")
        : hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return toRgbString(r, g, b);
  }

  const rgbFunctionMatch = value.match(
    /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i,
  );
  if (rgbFunctionMatch) {
    const r = Number(rgbFunctionMatch[1]);
    const g = Number(rgbFunctionMatch[2]);
    const b = Number(rgbFunctionMatch[3]);
    if (isValidRgbChannel(r) && isValidRgbChannel(g) && isValidRgbChannel(b)) {
      return toRgbString(r, g, b);
    }
    return null;
  }

  const csvMatch = value.match(/^([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})$/);
  if (csvMatch) {
    const r = Number(csvMatch[1]);
    const g = Number(csvMatch[2]);
    const b = Number(csvMatch[3]);
    if (isValidRgbChannel(r) && isValidRgbChannel(g) && isValidRgbChannel(b)) {
      return toRgbString(r, g, b);
    }
  }

  return null;
};
