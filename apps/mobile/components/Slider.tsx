import { View } from "react-native";
import SliderCard from "./SliderCard";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

// ====================== Type Definitions ======================
type Template = {
  title: string;
  category: string;
  description?: string;
  image: string;
  owner: string;
  duration?: number;
  isFavorite: boolean;
  goals_id?: string[];
};

type SliderProps = {
  data: Template[];
  onCardPress?: (template: Template) => void;
  onToggleFavorite?: (template: Template) => void;
};

// ====================== Main Component ======================
export default function Slider({
  data,
  onCardPress,
  onToggleFavorite,
}: SliderProps) {
  // ====================== Animation Values ======================
  const scrollX = useSharedValue(0);

  // ====================== Animation Handler ======================
  const onScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // ====================== Render UI ======================
  return (
    <View>
      <Animated.FlatList
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        horizontal
        pagingEnabled
        snapToStart
        onScroll={onScrollHandler}
        data={data}
        renderItem={({ item, index }) => (
          <SliderCard
            index={index}
            title={item.title}
            category={item.category}
            description={item.description}
            image={item.image}
            owner={item.owner}
            duration={item.duration}
            isFavorite={item.isFavorite}
            goals_id={item.goals_id} 
            scrollX={scrollX}
            onPress={() => onCardPress && onCardPress(item)}
            onToggleFavorite={() => onToggleFavorite && onToggleFavorite(item)}
          />
        )}
      />
    </View>
  );
}
