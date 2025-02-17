import { useSegments, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { routes } from "@/routesConfig";

// ====================== Authentication Route Protection Hook ======================
export function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return; // Prevent execution if authentication is still loading

    try {
      // ====================== Extract Current Path & Route Type ======================
      const currentPath = `/${segments.join("/")}`;
      const isPublicPage = routes.public.includes(currentPath);
      const isPrivatePage = routes.private.includes(currentPath);

      const isKnownRoute = isPublicPage || isPrivatePage;

      // ====================== Redirect Logic Based on Authentication Status ======================
      if (!isKnownRoute) {
        console.warn(`⚠️ Warning: Unrecognized route "${currentPath}"`);
        return;
      }

      if (!isSignedIn && isPrivatePage) {
        router.replace(routes.defaultRedirect);
      }

      if (isSignedIn && isPublicPage) {
        router.replace(routes.loggedInRedirect);
      }
    } catch (error) {
      console.error("Routing Error:", error);
    }
  }, [isSignedIn, isLoaded, segments]);
}
