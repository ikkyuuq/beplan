/**
 * routesConfig.ts - กำหนดเส้นทางของแอป
 * 
 * - public: หน้าเหล่านี้สามารถเข้าถึงได้โดยไม่ต้องล็อกอิน
 * - private: หน้าเหล่านี้ต้องล็อกอินก่อน
 * 
 * - defaultRedirect: หน้า Default ถ้ายังไม่ได้ล็อกอิน
 * - loggedInRedirect: หน้า Default ถ้าล็อกอินแล้ว
 * - resetPassword: หน้า Reset Password (ลืมรหัสผ่าน)
 * - setNewPassword: หน้า Set New Password (Reset Password แล้ว Redirect มาหน้านี้)
 * - signIn: หน้า Sign In (Sign Out แล้ว Redirect มาหน้านี้)
 * - signUp: หน้า Sign Up (สมัครสมาชิกใหม่)
) */

export const routes = {
  public: ["/(welcome)", "/(auth)/sign-in", "/(auth)/sign-up"],
  private: [
    "/(tabs)/schedule",
    "/(tabs)/create",
    "/(tabs)/analysis",
    "/(tabs)/community",
  ],

  defaultRedirect: "/(welcome)" as const,
  loggedInRedirect: "/(tabs)/schedule" as const,
  resetPassword: "/(auth)/reset-password" as const,
  setNewPassword: "/(auth)/set-password" as const,
  signIn: "/(auth)/sign-in" as const,
  signUp: "/(auth)/sign-up" as const,
};
