import React, { useState } from "react";
import { Platform, View, ViewStyle, useWindowDimensions } from "react-native";
import SliderCard from "./SliderCard";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

// ====================== Type Definitions ======================
type Template = {
  title: string;
  category: string;
  description?: string;
  image: string;
  image_url?: string;
  owner: string;
  duration?: number;
  isFavorite: boolean;
  goals_id?: string[];
  created_by?: any;
};

type SliderProps = {
  data: Template[];
  onCardPress?: (template: Template) => void;
  onToggleFavorite?: (template: Template) => void;
};

// On web, pagingEnabled makes react-native-web wrap every cell in a View
// (z-index 0) for CSS scroll-snap, which traps the active cell's zIndex.
// Apply the same scroll-snap ourselves instead. Web-only CSS, hence the cast.
const isWeb = Platform.OS === "web";
const webSnapList = (isWeb ? { scrollSnapType: "x mandatory" } : {}) as ViewStyle;
const webSnapCell = (isWeb ? { scrollSnapAlign: "start" } : {}) as ViewStyle;

// ====================== Main Component ======================
export default function Slider({
  data,
  onCardPress,
  onToggleFavorite,
}: SliderProps) {
  // ====================== Animation Values ======================
  const scrollX = useSharedValue(0);
  // One page per card, as wide as the list itself (window width until laid out).
  const { width: windowWidth } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(windowWidth);
  // The card in the middle; drawn above its neighbors, which slide under it.
  const [activeIndex, setActiveIndex] = useState(0);

  useAnimatedReaction(
    () => Math.round(scrollX.value / pageWidth),
    (current, previous) => {
      if (current !== previous) runOnJS(setActiveIndex)(current);
    },
    [pageWidth]
  );

  // ====================== Animation Handler ======================
  const onScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // ====================== Render UI ======================
  return (
    <View onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}>
      <Animated.FlatList
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        horizontal
        pagingEnabled={!isWeb}
        style={webSnapList}
        snapToStart
        onScroll={onScrollHandler}
        // FlatList draws later cells on top, so raise the active cell itself;
        // a zIndex inside the card can't lift it above a sibling cell.
        CellRendererComponentStyle={({ index }) => [
          webSnapCell,
          { zIndex: index === activeIndex ? 1 : 0 },
        ]}
        extraData={activeIndex}
        data={data}
        renderItem={({ item, index }) => (
          <SliderCard
            index={index}
            title={item.title}
            category={item.category}
            description={item.description}
            image={item.image_url || item.image}
            owner={typeof item.created_by === 'object' ? 
                   (item.created_by.username || item.created_by.user_id) : 
                   item.owner}
            duration={item.duration}
            isFavorite={item.isFavorite}
            goals_id={item.goals_id} 
            scrollX={scrollX}
            pageWidth={pageWidth}
            onPress={() => onCardPress && onCardPress(item)}
            onToggleFavorite={() => onToggleFavorite && onToggleFavorite(item)}
          />
        )}
      />
    </View>
  );
}