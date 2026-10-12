import { useColorScheme } from "react-native";

export interface Theme {
  bg: string;
  surface: string;
  surfaceStrong: string;
  mistHover: string;
  text: string;
  secondary: string;
  tertiary: string;
  inverse: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentHover: string;
  accentPress: string;
  error: string;
  success: string;
}

export const light: Theme = {
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceStrong: "#eff3f4",
  mistHover: "#e7ebed",
  text: "#0f1419",
  secondary: "#536471",
  tertiary: "#829aab",
  inverse: "#ffffff",
  border: "#eff3f4",
  borderStrong: "#cfd9de",
  accent: "#1d9bf0",
  accentHover: "#1a8cd8",
  accentPress: "#1683c2",
  error: "#f4212e",
  success: "#00ba7c",
} as const;

export const dark: Theme = {
  bg: "#000000",
  surface: "#000000",
  surfaceStrong: "#16181c",
  mistHover: "#1c1f23",
  text: "#e7e9ea",
  secondary: "#71767b",
  tertiary: "#536471",
  inverse: "#000000",
  border: "#2f3336",
  borderStrong: "#536471",
  accent: "#1d9bf0",
  accentHover: "#1a8cd8",
  accentPress: "#1683c2",
  error: "#f4212e",
  success: "#00ba7c",
} as const;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
