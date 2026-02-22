export const Colors = {
  light: {
    textPrimary: "#2D2D2D", // 深灰色 - 主要文字
    textSecondary: "#666666", // 中灰色 - 次要文字
    textMuted: "#999999", // 浅灰色 - 辅助文字
    primary: "#B45309", // Amber-600 - 主色调，温暖护眼
    accent: "#D97706", // Amber-500 - 辅助强调色
    success: "#10B981", // Emerald-500
    error: "#EF4444",
    warning: "#F59E0B", // Amber-500
    backgroundRoot: "#E8E8E8", // 浅灰色 - 比白色深，比现在浅
    backgroundDefault: "#F5F5F5", // 更浅的灰色 - 卡片背景
    backgroundTertiary: "#E0E0E0", // 输入框背景
    buttonPrimaryText: "#FFFFFF",
    tabIconSelected: "#B45309",
    border: "#D0D0D0", // 边框颜色
    borderLight: "#E0E0E0", // 浅边框颜色
  },
  dark: {
    textPrimary: "#FAFAF9", // Stone-50
    textSecondary: "#A8A29E", // Stone-400
    textMuted: "#78716C", // Stone-500
    primary: "#D97706", // Amber-500
    accent: "#F59E0B", // Amber-400
    success: "#34D399",
    error: "#F87171",
    warning: "#FBBF24",
    backgroundRoot: "#E8E8E8", // 浅灰色 - 比白色深，比现在浅
    backgroundDefault: "#F5F5F5", // 更浅的灰色 - 卡片背景
    backgroundTertiary: "#E0E0E0", // 输入框背景
    buttonPrimaryText: "#2D2D2D", // 按钮文字颜色
    tabIconSelected: "#B45309",
    border: "#D0D0D0", // 边框颜色
    borderLight: "#E0E0E0", // 浅边框颜色
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -4,
  },
  displayLarge: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -2,
  },
  displayMedium: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "200" as const,
  },
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "300" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  smallMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  labelTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  stat: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "300" as const,
  },
  tiny: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "400" as const,
  },
  navLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500" as const,
  },
};

export type Theme = typeof Colors.light;
