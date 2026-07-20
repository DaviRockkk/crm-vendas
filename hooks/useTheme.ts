import { useThemeStore } from '@/store/useThemeStore';
import { lightColors, darkColors, type Colors, spacing, radius, fontSize, fontWeight } from '@/constants/theme';

export function useTheme() {
  const { isDark, toggleTheme, setDark } = useThemeStore();
  const colors: Colors = isDark ? darkColors : lightColors;

  return {
    colors,
    isDark,
    toggleTheme,
    setDark,
    spacing,
    radius,
    fontSize,
    fontWeight,
  };
}
