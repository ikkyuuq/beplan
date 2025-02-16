import { useProtectedRoute } from "@/middleware/useProtectedRoute";
import { Tabs } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import CustomTabBar from "@/components/CustomTabBar";

export default function TabsLayout() {
  useProtectedRoute(); 

  const user = useUser();

  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="schedule" options={{ headerShown: false }} />
      <Tabs.Screen name="create" options={{ headerShown: false }} />
      <Tabs.Screen name="analysis" options={{ headerShown: false }} />
      <Tabs.Screen name="community" options={{ headerShown: false }} />
    </Tabs>
  );
}