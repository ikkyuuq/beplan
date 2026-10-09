import { Platform } from "react-native";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (
  configuredApiUrl ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://127.0.0.1:8000")
).replace(/\/+$/, "");
