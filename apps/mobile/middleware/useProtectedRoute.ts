import { useSegments, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { routes } from "@/routesConfig"; 

export function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
  
    try {
      const currentPath = `/${segments.join("/")}`;
      const isPublicPage = routes.public.includes(currentPath);
      const isPrivatePage = routes.private.includes(currentPath);
  
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
