import { View, Text, Dimensions, Image, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useState } from "react";
import PreviewTemplateModal from "./PreviewTemplateModal";

type SliderCardProps = {
  index: number;
  title: string;
  image: string;
  description?: string;
  owner: string;
  category: string;
  scrollX: SharedValue<number>;
  onPress?: () => void;
};

export default function SliderCard({
  index,
  title,
  category,
  description,
  owner,
  image,
  scrollX,
  onPress,
}: SliderCardProps) {
  const screen = Dimensions.get("screen");
  const [isListed, setIsListed] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleAddToList = () => {
    setIsListed(!isListed);
  };

  const [displayPreviewModal, setDisplayPreviewModal] = useState(false);

  const handleDisplayPreviewModal = () => {
    setDisplayPreviewModal((prev) => !prev);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          [
            (index - 1) * screen.width,
            index * screen.width,
            (index + 1) * screen.width,
          ],
          [-screen.width * 0.25, 0, screen.width * 0.25],
          "clamp"
        ),
      },
      {
        scale: interpolate(
          scrollX.value,
          [
            (index - 1) * screen.width,
            index * screen.width,
            (index + 1) * screen.width,
          ],
          [0.85, 1, 0.85],
          "clamp"
        ),
      },
    ],
    opacity: interpolate(
      scrollX.value,
      [
        (index - 1) * screen.width,
        index * screen.width,
        (index + 1) * screen.width,
      ],
      [0.5, 1, 0.5],
      "clamp"
    ),
  }));

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      handleDisplayPreviewModal();
    }
  };

  return (
    <Animated.View>
      <PreviewTemplateModal
        isVisible={displayPreviewModal}
        onClose={() => setDisplayPreviewModal(false)}
        onAddToList={handleAddToList}
        data={{ title, category, image, description, isListed, owner }}
      />
      <Animated.View
        style={[
          animatedStyle,
          {
            justifyContent: "center",
            alignItems: "center",
            width: screen.width,
          },
        ]}
      >
        <Pressable
          onPress={handleCardPress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Image
            source={{ uri: image }}
            style={{
              width: 325,
              height: 200,
              borderRadius: 20,
              opacity: isPressed ? 0.8 : 1,
            }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "transparent", "black"]}
            style={{
              position: "absolute",
              width: 325,
              height: 200,
              padding: 16,
              borderRadius: 20,
            }}
          >
            <View
              style={{
                justifyContent: "space-between",
                flex: 1,
              }}
            >
              <View style={{ alignItems: "flex-end" }}>
                {/* Heart button removed as per request */}
              </View>
              <View style={{ gap: 4 }}>
                <Text style={{ color: "#e3e3e3", fontSize: 12 }}>
                  {category}
                </Text>
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  {title}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
