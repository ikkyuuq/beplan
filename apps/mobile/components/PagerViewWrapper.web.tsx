import React, { useRef } from 'react';
import { ScrollView, ViewStyle, StyleProp, View } from 'react-native';

interface PagerViewProps {
  style?: StyleProp<ViewStyle>;
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children?: React.ReactNode;
}

export default function PagerViewWrapper({
  style,
  initialPage = 0,
  onPageSelected,
  children,
}: PagerViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const pages = React.Children.toArray(children);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

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
}
