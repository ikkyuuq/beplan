import { useProtectedRoute } from "@/middleware/useProtectedRoute";
import { Tabs } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import CustomTabBar from "@/components/CustomTabBar";

// ====================== Main Component ======================
export default function TabsLayout() {
  useProtectedRoute(); // ✅ ตรวจสอบสิทธิ์การเข้าถึงก่อนโหลด Tabs

  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn || !user) {
    return null; // ✅ ป้องกัน UI Flashing และการเรียกข้อมูลก่อนโหลดเสร็จ
  }

  // ====================== Tab Navigation ======================
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="schedule" options={{ headerShown: false }} />
      <Tabs.Screen name="create" options={{ headerShown: false }} />
      <Tabs.Screen name="analysis" options={{ headerShown: false }} />
      <Tabs.Screen name="community" options={{ headerShown: false }} />
    </Tabs>
  );
}
