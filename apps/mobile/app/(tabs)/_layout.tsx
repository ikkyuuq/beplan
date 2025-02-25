// ====================== Imports ======================
import { Tabs } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import CustomTabBar from "@/components/CustomTabBar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// ====================== Main Component ======================
export default function TabsLayout() {
  // ====================== User Authentication ======================
  const { isLoaded, isSignedIn, user } = useUser();

  // ====================== Conditional Rendering ======================
  if (!isLoaded || !isSignedIn || !user) {
    return null;
  }

  // ====================== Tab Navigation ======================
  return (
    <GestureHandlerRootView>
      <Tabs tabBar={(props) => <CustomTabBar {...props} />}>
        <Tabs.Screen name="schedule" options={{ headerShown: false }} />
        <Tabs.Screen name="create" options={{ headerShown: false }} />
        <Tabs.Screen name="analysis" options={{ headerShown: false }} />
        <Tabs.Screen name="community" options={{ headerShown: false }} />
      </Tabs>
    </GestureHandlerRootView>
  );
}