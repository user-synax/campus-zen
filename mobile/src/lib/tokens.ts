import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "cz_access_token";
const REFRESH_KEY = "cz_refresh_token";

// In-memory copies so the API client never blocks the JS thread on
// SecureStore reads per request. Source of truth stays on device storage.
let accessToken: string | null = null;
let refreshToken: string | null = null;

async function setItem(key: string, value: string | null) {
  if (Platform.OS === "web") {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // storage unavailable (private mode) — memory copy still works
    }
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export const tokens = {
  get access() {
    return accessToken;
  },
  get refresh() {
    return refreshToken;
  },
  setAccess(v: string | null) {
    accessToken = v;
  },
  async load() {
    const [a, r] = await Promise.all([getItem(ACCESS_KEY), getItem(REFRESH_KEY)]);
    accessToken = a;
    refreshToken = r;
  },
  async save(a: string | null, r: string | null) {
    accessToken = a;
    refreshToken = r;
    await Promise.all([setItem(ACCESS_KEY, a), setItem(REFRESH_KEY, r)]);
  },
  async clear() {
    accessToken = null;
    refreshToken = null;
    await Promise.all([setItem(ACCESS_KEY, null), setItem(REFRESH_KEY, null)]);
  },
};
