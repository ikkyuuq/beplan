import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { Stack } from "expo-router/stack";
import { tokenCache } from "@/cache";
import { ReactNode } from "react";
import { useProtectedRoute } from "@/middleware/useProtectedRoute";

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
    return null;
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <ProtectedRoutes>
          <Stack screenOptions={{ headerShown: false }} />
        </ProtectedRoutes>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

function ProtectedRoutes({ children }: { children: ReactNode }) {
  useProtectedRoute();
  return children;
}
