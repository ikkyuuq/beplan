import { File } from "expo-file-system";
import type { ImagePickerAsset } from "expo-image-picker";
import { Platform } from "react-native";

/**
 * Adds a picked image to `formData` as `field`.
 *
 * Expo replaces the global fetch with expo/fetch, which rejects React
 * Native's `{ uri, name, type }` parts ("Unsupported FormDataPart
 * implementation"). It needs a Blob or something with bytes(), so on native
 * the image goes in as an expo-file-system File, and on web as the Blob
 * behind its blob:/data: URI.
 *
 * Leave Content-Type unset on the request: fetch sets it with the boundary.
 */
export async function appendImage(
  formData: FormData,
  field: string,
  image: Pick<ImagePickerAsset, "uri" | "fileName">
) {
  if (Platform.OS === "web") {
    const blob = await (await fetch(image.uri)).blob();
    formData.append(field, blob, image.fileName || "photo.jpg");
  } else {
    formData.append(field, new File(image.uri) as unknown as Blob);
  }
}
