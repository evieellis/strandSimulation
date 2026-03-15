/**
 * ColorPalettes - Curated color collections with modern and neutral options
 */
const ColorPalettes = {
  brights: {
    name: "Brights",
    colors: [
      { name: "black", hex: "#1a1a1a" },
      { name: "charcoal", hex: "#2d2d2d" },
      { name: "slate", hex: "#4a5568" },
      { name: "graphite", hex: "#718096" },
      { name: "pewter", hex: "#a0aec0" },
      { name: "silver", hex: "#cbd5e0" },
      { name: "ash", hex: "#e2e8f0" },
      { name: "white", hex: "#f7fafc" }
    ]
  },
  neutrals: {
    name: "Neutrals",
    colors: [
      { name: "espresso", hex: "#3e2723" },
      { name: "chocolate", hex: "#4e342e" },
      { name: "mocha", hex: "#6d4c41" },
      { name: "#8d6e63" },
      { name: "latte", hex: "#a1887f" },
      { name: "taupe", hex: "#bcaaa4" },
      { name: "sand", hex: "#d7ccc8" },
      { name: "cream", hex: "#efebe9" }
    ]
  }
};

/**
 * ColorManager - Manages color selection and palette operations
 */
export class ColorManager {
  constructor(defaultPalette = 'brights') {
    this.currentPalette = defaultPalette;
    this.customColors = new Set();
  }

  /**
   * Get current palette colors
   */
  getColors() {
    return ColorPalettes[this.currentPalette].colors;
  }

  /**
   * Get all available palette names
   */
  getPaletteNames() {
    return Object.keys(ColorPalettes);
  }

  /**
   * Switch to a different palette
   */
  setPalette(paletteName) {
    if (ColorPalettes[paletteName]) {
      this.currentPalette = paletteName;
      return true;
    }
    return false;
  }

  /**
   * Get a random color from the current palette
   */
  getRandomColor() {
    const colors = this.getColors();
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex].hex;
  }

  /**
   * Get a color by index (wraps around if out of bounds)
   */
  getColorAtIndex(index) {
    const colors = this.getColors();
    const safeIndex = index % colors.length;
    return colors[safeIndex].hex;
  }

  /**
   * Add a custom color to the manager
   */
  addCustomColor(hexColor) {
    if (this.isValidHex(hexColor)) {
      this.customColors.add(hexColor);
      return true;
    }
    return false;
  }

  /**
   * Get all custom colors
   */
  getCustomColors() {
    return Array.from(this.customColors);
  }

  /**
   * Validate hex color format
   */
  isValidHex(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }

  /**
   * Convert RGB to Hex
   */
  rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join('');
  }

  /**
   * Convert Hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}

export { ColorPalettes };
