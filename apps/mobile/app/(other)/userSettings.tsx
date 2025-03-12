import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { routes } from "@/routesConfig";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import OccupationSelector from "@/components/OccupationSelector";
import * as ImagePicker from "expo-image-picker";

// ====================== Main Component ======================
export default function UserSettings() {
  // ====================== Hooks ======================
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();

  // ====================== State Management ======================
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingOccupation, setIsEditingOccupation] = useState(false);
  const [isEditingProfileImage, setIsEditingProfileImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [newProfileImage, setNewProfileImage] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [description, setDescription] = useState("");
  const [occupation, setOccupation] = useState("");
  const [externalAccounts, setExternalAccounts] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // ====================== Animation Values ======================
  const headerOpacity = useSharedValue(0);
  const profileOpacity = useSharedValue(0);
  const securityOpacity = useSharedValue(0);
  const actionsOpacity = useSharedValue(0);

  // ====================== Animation Setup ======================
  useEffect(() => {
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    profileOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    securityOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    actionsOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
  }, []);

  // ====================== Animated Styles ======================
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const profileAnimatedStyle = useAnimatedStyle(() => ({
    opacity: profileOpacity.value,
    transform: [
      {
        translateY: withTiming(profileOpacity.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const securityAnimatedStyle = useAnimatedStyle(() => ({
    opacity: securityOpacity.value,
    transform: [
      {
        translateY: withTiming(securityOpacity.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const actionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [
      {
        translateY: withTiming(actionsOpacity.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  // ====================== User Data Loading ======================
  useEffect(() => {
    if (isLoaded && user) {
      const loadUserData = async () => {
        try {
          setUsername(user.username || getDefaultUsername());
          setProfileImage(user.imageUrl);
          setPrimaryEmail(user.primaryEmailAddress?.emailAddress || "");
          setDescription((user.unsafeMetadata?.description as string) || "");
          setOccupation((user.unsafeMetadata?.occupation as string) || "");
          setExternalAccounts(user.externalAccounts || []);

          if (user.getSessions) {
            const sessions = await user.getSessions();
            const activeSession = sessions.find(
              (session) => session.status === "active"
            );

            const processedSessions = await Promise.all(
              sessions.map(async (session) => {
                const isCurrent = session.id === activeSession?.id;
                return { ...session, isCurrent };
              })
            );

            setActiveSessions(processedSessions);
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadUserData();
    }
  }, [isLoaded, user]);

  // ====================== Helper Functions ======================
  const getDefaultUsername = () => {
    if (!user) return "";
    return `user-${user.id.slice(-6)}`;
  };

  const getAccountIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "google":
        return <Ionicons name="logo-google" size={24} color="#DB4437" />;
      case "github":
        return <Ionicons name="logo-github" size={24} color="#333" />;
      default:
        return <Feather name="link" size={24} color="#555" />;
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    if (
      userAgent.includes("iPhone") ||
      userAgent.includes("iPad") ||
      userAgent.includes("Android")
    ) {
      return <Ionicons name="phone-portrait" size={24} color="#555" />;
    }
    return <Feather name="monitor" size={24} color="#555" />;
  };

  const formatLastActiveTime = (lastActiveAt: string) => {
    const date = new Date(lastActiveAt);
    return date.toLocaleString();
  };

  // ====================== Image Picker ======================
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your photos to upload a profile image."
        );
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setIsEditingProfileImage(true);
        setNewProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleCancelProfileImage = () => {
    setNewProfileImage("");
    setIsEditingProfileImage(false);
  };

  // ====================== Unified Save Handler ======================
  const handleSave = async (type: string) => {
    if (!user) return;

    try {
      setIsSaving(true);

      let formattedImageData: any;
      const updateLog = {
        userId: user.id,
        profileImageURI:
          type === "profileImage" ? newProfileImage : profileImage || null,
        username: username || null,
        occupation: occupation || null,
        aboutMe: description || null,
      };

      switch (type) {
        case "username":
          if (username !== getDefaultUsername()) {
            await user.update({
              username: username,
            });
          }
          setIsChangingUsername(false);
          break;

        case "description":
          await user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              description: description,
            },
          });
          setIsEditingDescription(false);
          break;

        case "occupation":
          await user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              occupation: occupation,
            },
          });
          setIsEditingOccupation(false);
          break;

        case "profileImage":
          if (!newProfileImage) return;
          setIsLoadingImage(true);
          if (newProfileImage.startsWith("https://img.clerk.com")) {
            formattedImageData = newProfileImage;
          } else {
            const formData = new FormData();

            // Get file extension and type from URI
            const fileName =
              newProfileImage.split("/").pop() || "profile_image";
            const fileExtension =
              fileName.split(".").pop()?.toLowerCase() || "jpg";

            const mimeTypes: { [key: string]: string } = {
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              png: "image/png",
              gif: "image/gif",
              bmp: "image/bmp",
              webp: "image/webp",
            };

            const mimeType = mimeTypes[fileExtension] || "image/jpeg"; // Default JPEG if unknown

            formData.append("file", {
              uri: newProfileImage,
              name: fileName,
              type: mimeType,
            } as any);

            formattedImageData = {
              uri: newProfileImage,
              name: fileName,
              type: mimeType,
            };
          }

          if (!newProfileImage.startsWith("https://img.clerk.com")) {
            setProfileImage(newProfileImage);
          } else {
            setProfileImage(newProfileImage);
          }

          setNewProfileImage("");
          setIsEditingProfileImage(false);

          updateLog.profileImageURI = formattedImageData;
          break;

        default:
          throw new Error("Invalid save type");
      }

      console.log("User Profile Update:", JSON.stringify(updateLog, null, 2));

      Alert.alert(
        "Success",
        `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`
      );
    } catch (error: any) {
      console.error(`${type} update error:`, error);
      Alert.alert(
        "Error",
        error.message || `Failed to update ${type}. Please try again.`
      );
    } finally {
      setIsSaving(false);
      if (type === "profileImage") setIsLoadingImage(false);
    }
  };

  // ====================== Handlers ======================
  const handleBack = () => {
    router.back();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace(routes.signIn);
    } catch (error) {
      console.error("Sign out error:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  // ====================== Loading State ======================
  if (!isLoaded || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4E5A94" />
        <Text style={styles.loadingText}>Loading user settings...</Text>
      </View>
    );
  }

  // ====================== Render UI ======================
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Settings</Text>
        <View style={{ width: 24 }} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Animated.View style={[styles.section, profileAnimatedStyle]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Feather name="user" size={20} color="#4E5A94" />
                <Text style={styles.sectionTitle}>Profile Information</Text>
              </View>
            </View>

            {/* Profile Image with Edit Button */}
            <View style={styles.profileImageContainer}>
              {isLoadingImage ? (
                <View style={styles.loadingImageContainer}>
                  <ActivityIndicator size="large" color="#4E5A94" />
                </View>
              ) : (
                <>
                  <View style={styles.profileImageWrapper}>
                    <Image
                      source={{
                        uri:
                          isEditingProfileImage && newProfileImage
                            ? newProfileImage
                            : profileImage,
                      }}
                      style={styles.profileImage}
                    />
                  </View>

                  {isEditingProfileImage ? (
                    <View style={styles.profileImageActions}>
                      <TouchableOpacity
                        style={styles.profileImageActionButton}
                        onPress={() => handleSave("profileImage")}
                        disabled={isLoadingImage}
                      >
                        <Text style={styles.profileImageActionText}>Save</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.profileImageActionButton,
                          styles.cancelButton,
                        ]}
                        onPress={handleCancelProfileImage}
                        disabled={isLoadingImage}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.editProfileImageButton}
                      onPress={pickImage}
                    >
                      <Feather name="edit-2" size={14} color="#4E5A94" />
                      <Text style={styles.editProfileImageText}>
                        Edit Profile Picture
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            <View style={styles.profileDetailsContainer}>
              <View style={styles.profileInfoRow}>
                <Text style={styles.profileInfoLabel}>Username</Text>
                {isChangingUsername ? (
                  <View style={styles.usernameEditContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Choose a username"
                    />
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => handleSave("username")}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.usernameContainer}>
                    <Text style={styles.profileInfoValue}>{username}</Text>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setIsChangingUsername(true)}
                    >
                      <Feather name="edit-2" size={14} color="#4E5A94" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.profileInfoRow}>
                <Text style={styles.profileInfoLabel}>Email</Text>
                <Text style={styles.profileInfoValue}>{primaryEmail}</Text>
              </View>

              {/* Occupation Field */}
              <View style={styles.profileInfoRow}>
                <Text style={styles.profileInfoLabel}>Occupation</Text>
                {isEditingOccupation ? (
                  <View style={{ flex: 1 }}>
                    <OccupationSelector
                      value={occupation}
                      onValueChange={setOccupation}
                      onSave={() => handleSave("occupation")}
                      isSaving={isSaving}
                      onCancel={() => setIsEditingOccupation(false)}
                    />
                  </View>
                ) : (
                  <View style={styles.usernameContainer}>
                    <Text style={styles.profileInfoValue}>
                      {occupation || "Not specified"}
                    </Text>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setIsEditingOccupation(true)}
                    >
                      <Feather name="edit-2" size={14} color="#4E5A94" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Description Field */}
              <View style={styles.descriptionRow}>
                <View style={styles.descriptionHeader}>
                  <Text style={styles.descriptionLabel}>About Me</Text>
                  {!isEditingDescription && (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setIsEditingDescription(true)}
                    >
                      <Feather name="edit-2" size={14} color="#4E5A94" />
                    </TouchableOpacity>
                  )}
                </View>

                {isEditingDescription ? (
                  <View style={styles.descriptionEditContainer}>
                    <TextInput
                      style={styles.descriptionInput}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Tell community members about yourself..."
                      multiline
                      numberOfLines={4}
                      maxLength={300}
                    />
                    <Text style={styles.charCount}>
                      {description.length}/300
                    </Text>
                    <View style={styles.descriptionButtons}>
                      <TouchableOpacity
                        style={[styles.saveButton, { flex: 1 }]}
                        onPress={() => handleSave("description")}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.saveButtonText}>Save</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cancelButton, { flex: 1 }]}
                        onPress={() => setIsEditingDescription(false)}
                        disabled={isSaving}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.descriptionText}>
                    {description || "Tell community members about yourself..."}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Security Section */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <Animated.View style={[styles.section, securityAnimatedStyle]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Feather name="shield" size={20} color="#4E5A94" />
                <Text style={styles.sectionTitle}>
                  Security & Authentication
                </Text>
              </View>
            </View>

            {/* Connected Accounts */}
            <Text style={styles.subsectionTitle}>Connected Accounts</Text>

            {externalAccounts.length > 0 ? (
              externalAccounts.map((account, index) => (
                <View key={index} style={styles.accountItem}>
                  <View style={styles.accountInfo}>
                    {getAccountIcon(account.provider)}
                    <Text style={styles.accountLabel}>
                      {account.provider.charAt(0).toUpperCase() +
                        account.provider.slice(1)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No connected accounts</Text>
            )}

            {/* Active Sessions */}
            <Text style={styles.subsectionTitle}>Active Sessions</Text>
            <Text style={styles.noteText}>
              Note: For security reasons, sessions can only be managed via the
              Clerk Dashboard. Your current session can be ended using the Sign
              Out button below.
            </Text>

            {activeSessions.length > 0 ? (
              activeSessions.map((session, index) => (
                <View key={index} style={styles.sessionItem}>
                  <View style={styles.sessionInfo}>
                    {getDeviceIcon(session.latestActivity?.userAgent || "")}
                    <View style={styles.sessionDetails}>
                      <Text style={styles.sessionName}>
                        {session.latestActivity?.userAgent?.split(" ")[0] ||
                          "Unknown Device"}
                        {session.isCurrent && (
                          <Text style={styles.currentDevice}> (Current)</Text>
                        )}
                      </Text>
                      <Text style={styles.sessionTime}>
                        Last active:{" "}
                        {formatLastActiveTime(session.lastActiveAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No active sessions</Text>
            )}
          </Animated.View>
        </Animated.View>

        {/* Account Actions Section */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)}>
          <Animated.View style={[styles.section, actionsAnimatedStyle]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Feather name="settings" size={20} color="#4E5A94" />
                <Text style={styles.sectionTitle}>Account Actions</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Feather name="log-out" size={20} color="#fff" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  scrollView: {
    flex: 1,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4E5A94",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: "#16171F",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  backButton: {
    padding: 8,
  },

  // Section Base
  section: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 10,
  },
  noteText: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
    marginBottom: 10,
  },

  // Profile Section
  profileImageContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  profileImageWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  loadingImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  profileDetailsContainer: {
    gap: 12,
  },
  profileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingVertical: 8,
  },
  profileInfoLabel: {
    fontSize: 14,
    color: "#666",
    width: 80,
  },
  profileInfoValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    textAlign: "right",
  },

  // Description
  descriptionRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingVertical: 8,
  },
  descriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  descriptionText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    fontStyle: "italic",
    opacity: 0.8,
  },
  descriptionEditContainer: {
    width: "100%",
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#FAFAFA",
    height: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  descriptionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },

  // Input Fields
  usernameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  usernameEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#FAFAFA",
  },

  // Buttons Base
  buttonBase: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 36,
  },

  // Edit Buttons
  editButton: {
    padding: 6,
    marginLeft: 10,
  },
  editProfileImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 6,
    minHeight: 36,
  },
  editProfileImageText: {
    color: "#4E5A94",
    fontSize: 14,
    fontWeight: "500",
  },

  // Save Buttons
  saveButton: {
    backgroundColor: "#4E5A94",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },
  profileImageActionButton: {
    backgroundColor: "#4E5A94",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  profileImageActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },

  // Cancel Buttons
  cancelButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  cancelButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },

  // Profile Image Actions
  profileImageActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },

  // Connected Accounts
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    marginBottom: 8,
  },
  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accountLabel: {
    fontSize: 14,
    color: "#333",
  },

  // Active Sessions
  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    marginBottom: 8,
  },
  sessionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  sessionTime: {
    fontSize: 12,
    color: "#777",
  },
  currentDevice: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "normal",
  },

  // Account Actions
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
