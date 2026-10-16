import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { PagerHandle } from './PagerViewWrapper';
import { ScrollView, ViewStyle, StyleProp, View } from 'react-native';

interface PagerViewProps {
  style?: StyleProp<ViewStyle>;
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children?: React.ReactNode;
}

const PagerViewWrapper = forwardRef<PagerHandle, PagerViewProps>(function PagerViewWrapper({
  style,
  initialPage = 0,
  onPageSelected,
  children,
}, ref) {
  const scrollViewRef = useRef<ScrollView>(null);
  const pages = React.Children.toArray(children);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const didScrollToInitialPage = useRef(false);

  // Same API as the native PagerView. A programmatic scroll doesn't fire
  // onMomentumScrollEnd on web, so report the new page directly.
  useImperativeHandle(ref, () => ({
    setPage(index: number) {
      const page = Math.max(0, Math.min(index, pages.length - 1));
      scrollViewRef.current?.scrollTo({ x: page * containerWidth, animated: true });
      onPageSelected?.({ nativeEvent: { position: page } });
    },
  }), [containerWidth, pages.length, onPageSelected]);

  // Native PagerView opens on `initialPage`; a ScrollView always starts at
  // page 0. Jump there once the width is known, or the schedule's week strip
  // showed (and on the first scroll selected) the earliest week, 60 days ago.
  useEffect(() => {
    if (didScrollToInitialPage.current || containerWidth === 0) return;
    didScrollToInitialPage.current = true;
    scrollViewRef.current?.scrollTo({ x: initialPage * containerWidth, animated: false });
  }, [containerWidth, initialPage]);

  return (
    <ScrollView
      ref={scrollViewRef as any}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{ width: `${pages.length * 100}%` }}
      onLayout={(e) => {
        setContainerWidth(e.nativeEvent.layout.width);
      }}
      onMomentumScrollEnd={(e) => {
        const pageWidth = e.nativeEvent.layoutMeasurement.width || containerWidth;
        if (pageWidth > 0) {
          const contentOffset = e.nativeEvent.contentOffset.x;
          const position = Math.round(contentOffset / pageWidth);
          if (onPageSelected) {
            onPageSelected({ nativeEvent: { position } });
          }
        }
      }}
    >
      {pages.map((child, index) => (
        <View key={index} style={{ width: containerWidth || '100%', flex: 1 }}>
          {child}
        </View>
      ))}
    </ScrollView>
  );
});

export default PagerViewWrapper;
