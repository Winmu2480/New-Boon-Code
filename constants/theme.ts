// ─── Boon Design System ───────────────────────────────────────────────────────

export const Colors = {
  // Primary Palette
  primary: '#FF4D6D',       // Boon coral-red — CTAs, active states
  primaryDark: '#C9184A',   // Pressed state
  gold: '#FFB703',          // Accents, highlights
  
  // Dark Theme (default)
  background: '#0F0E17',    // Deep navy-black
  surface: '#1A1A2E',       // Card backgrounds
  surfaceElevated: '#22223B', // Elevated cards, modals
  border: '#2D2D44',        // Dividers, outlines
  
  // Text
  textPrimary: '#FFFFFE',
  textSecondary: '#A7A9BE',
  textMuted: '#666680',
  
  // Semantic
  success: '#06D6A0',
  error: '#EF233C',
  warning: '#FFB703',
  
  // AI Deal Finder
  aiPrimary: '#7B2FBE',
  aiSurface: '#1E1030',
  aiBubble: '#2D1B4E',
  
  // Overlays
  overlay: 'rgba(15, 14, 23, 0.85)',
  overlayLight: 'rgba(15, 14, 23, 0.5)',
} as const;

export const Typography = {
  // Font families (loaded via expo-font)
  displayFont: 'Playfair-Bold',
  bodyFont: 'DMSans-Regular',
  bodyMedium: 'DMSans-Medium',
  bodyBold: 'DMSans-Bold',
  monoFont: 'SpaceMono-Regular',

  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 48,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
