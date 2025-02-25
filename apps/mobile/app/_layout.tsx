import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { Stack } from "expo-router/stack";
import { tokenCache } from "@/cache";
import { ReactNode } from "react";
import { useProtectedRoute } from "@/middleware/useProtectedRoute";

// ====================== Main Component ======================
export default function RootLayout() {
  // ====================== Environment Setup ======================
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // ====================== Environment Key Check ======================
  if (!publishableKey) {
    console.error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
    return null;
  }

  // ====================== Clerk Authentication & Routing ======================
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        {/* แก้ไข: เพิ่ม `isLoaded` เพื่อลดปัญหาการ Redirect ผิดพลาด */}
        <ProtectedRoutes>
          <Stack screenOptions={{ headerShown: false }} />
        </ProtectedRoutes>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

// ====================== Protected Routes Wrapper ======================
function ProtectedRoutes({ children }: { children: ReactNode }) {
  useProtectedRoute(); // Ensures authentication protection
  return children;
}
