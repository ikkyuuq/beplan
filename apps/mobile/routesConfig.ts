export const routes = {
  // ====================== Public Routes ======================
  public: Object.freeze([
    "/(welcome)",
    "/(auth)/sign-in",
    "/(auth)/sign-up",
    "/(auth)/reset-password",
    "/(auth)/set-password",
  ]) as ReadonlyArray<string>,

  // ====================== Private Routes (Require Authentication) ======================
  private: Object.freeze([
    "/(tabs)/schedule",
    "/(tabs)/create",
    "/(tabs)/analysis",
    "/(tabs)/community",
  ]) as ReadonlyArray<string>,

  // ====================== Default Redirects ======================
  defaultRedirect: "/(welcome)" as const, // Redirect for unauthorized access
  loggedInRedirect: "/(tabs)/schedule" as const, // Redirect after successful login

  // ====================== Authentication-Related Routes ======================
  resetPassword: "/(auth)/reset-password" as const,
  setNewPassword: "/(auth)/set-password" as const,
  signIn: "/(auth)/sign-in" as const,
  signUp: "/(auth)/sign-up" as const,

  // ====================== Additional Navigation ======================
  community: "/(tabs)/community" as const,
};
