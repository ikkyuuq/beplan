import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Height of the floating tab bar (components/CustomTabBar). */
export const TAB_BAR_HEIGHT = 72;

/** Gap between the screen's bottom edge (or home indicator) and the tab bar. */
export const useTabBarBottomOffset = () => {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12);
};

/**
 * Bottom padding a tab screen's scroll content needs so its last item can
 * scroll above the floating tab bar, on any device (home indicator or not).
 */
export const useTabBarSpace = () => useTabBarBottomOffset() + TAB_BAR_HEIGHT + 16;

/** Largest text scaling dense UI (calendar strip, tab bar) allows. */
export const DENSE_TEXT_MAX_SCALE = 1.3;

/**
 * Top padding for a full screen: the device's safe area (status bar, notch,
 * Dynamic Island) plus a small gap. Screens draw their own headers
 * (headerShown: false), so each one has to stay clear of it.
 */
export const useScreenTopPadding = (gap = 12) => useSafeAreaInsets().top + gap;
