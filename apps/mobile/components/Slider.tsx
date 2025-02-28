import { View } from "react-native";
import SliderCard from "./SliderCard";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

type SliderProps = {
  data: {
    title: string;
    category: string;
    description?: string;
    image: string;
    owner: string;
  }[];
  onCardPress?: (template: any) => void; // Add onCardPress callback prop
};

export default function Slider({ data, onCardPress }: SliderProps) {
  const scrollX = useSharedValue(0);

  const onScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });
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
            scrollX={scrollX}
            owner={item.owner}
            onPress={() => onCardPress && onCardPress(item)} // Pass the onPress handler
          />
        )}
      />
    </View>
  );
}