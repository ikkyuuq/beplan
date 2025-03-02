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
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { routes } from "@/routesConfig";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from "react-native-reanimated";

// ====================== Main Component ======================
export default function UserSettings() {
  // ====================== Hooks ======================
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();

  // ====================== State Management ======================
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [isChangingProfileImage, setIsChangingProfileImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [tempProfileImage, setTempProfileImage] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [externalAccounts, setExternalAccounts] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // ====================== Animation Values ======================
  const headerOpacity = useSharedValue(0);
  const sectionsOpacity = useSharedValue(0);
  const profileOpacity = useSharedValue(0);
  const securityOpacity = useSharedValue(0);
  const actionsOpacity = useSharedValue(0);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Header animation
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    // Content animations with sequential timing
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
          // Load user profile data
          setFirstName(user.firstName || "");
          setLastName(user.lastName || "");
          setUsername(user.username || getDefaultUsername());
          setProfileImage(user.imageUrl);
          setTempProfileImage(user.imageUrl);
          setPrimaryEmail(user.primaryEmailAddress?.emailAddress || "");

          // Load external accounts (OAuth connections)
          setExternalAccounts(user.externalAccounts || []);

          // Load active sessions
          if (user.getSessions) {
            const sessions = await user.getSessions();

            // Find current active session
            const activeSession = sessions.find(
              (session) => session.status === "active"
            );

            // Add current session indicator
            const processedSessions = await Promise.all(
              sessions.map(async (session) => {
                const isCurrent = session.id === activeSession?.id;
                return {
                  ...session,
                  isCurrent,
                };
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
    if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
      return <Ionicons name="phone-portrait" size={24} color="#555" />;
    } else if (userAgent.includes("Android")) {
      return <Ionicons name="phone-portrait" size={24} color="#555" />;
    } else {
      return <Feather name="monitor" size={24} color="#555" />;
    }
  };

  const formatLastActiveTime = (lastActiveAt: string) => {
    const date = new Date(lastActiveAt);
    return date.toLocaleString();
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

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your photos to update your profile picture."
        );
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTempProfileImage(result.assets[0].uri);
        setIsChangingProfileImage(true);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const handleSaveProfileImage = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      // For now, update only local state
      setProfileImage(tempProfileImage);

      // FUTURE IMPLEMENTATION: Upload to Clerk via backend API when ready
      /* 
      if (tempProfileImage) {
        // Create form data for image upload
        const formData = new FormData();
        
        // Get file extension from URI, handling query params properly
        const uriParts = tempProfileImage.split(/[?#]/)[0].split('.');
        const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
        
        // Create proper MIME type, handling both jpg and jpeg correctly
        const mimeType = fileExtension === 'jpg' || fileExtension === 'jpeg' 
          ? 'image/jpeg' 
          : `image/${fileExtension}`;
        
        // Create file object for FormData
        const fileInfo = {
          uri: tempProfileImage,
          name: `profile-image.${fileExtension}`,
          type: mimeType
        };
        
        // @ts-ignore: React Native's FormData implementation accepts this format
        formData.append('file', fileInfo);
        
        // Send to your FastAPI backend endpoint
        const response = await fetch(`https://your-api-url.com/upload-profile-image/${user.id}`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
            // 'Authorization': `Bearer ${user.sessionToken}`, // Add auth headers when needed
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload image to server');
        }
        
        // Get updated image URL from response with fallback to local image
        const result = await response.json();
        setProfileImage(result?.image_url || tempProfileImage);
      }
      */

      setIsChangingProfileImage(false);
      Alert.alert(
        "Success",
        "Profile image updated locally. Backend integration will be implemented later."
      );
    } catch (error: any) {
      console.error("Profile image update error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile image. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelProfileImage = () => {
    setTempProfileImage(profileImage);
    setIsChangingProfileImage(false);
  };

  const handleSaveUsername = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      // Update only username through Clerk API
      if (username !== getDefaultUsername()) {
        await user.update({
          username: username,
        });
      }

      setIsChangingUsername(false);
      Alert.alert("Success", "Username updated successfully!");
    } catch (error: any) {
      console.error("Username update error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update username. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ลบฟังก์ชัน handleUnlinkAccount

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
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={[styles.section, profileAnimatedStyle]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Feather name="user" size={20} color="#4E5A94" />
              <Text style={styles.sectionTitle}>Profile Information</Text>
            </View>
          </View>

          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri: isChangingProfileImage
                  ? tempProfileImage
                  : profileImage || "https://picsum.photos/seed/profile/150",
              }}
              style={styles.profileImage}
            />

            {!isChangingProfileImage ? (
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={handlePickImage}
              >
                <Feather name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            ) : null}

            {isChangingProfileImage && (
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity
                  style={styles.saveImageButton}
                  onPress={handleSaveProfileImage}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelImageButton}
                  onPress={handleCancelProfileImage}
                >
                  <Feather name="x" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.profileDetailsContainer}>
            <View style={styles.profileInfoRow}>
              <Text style={styles.profileInfoLabel}>Name</Text>
              <Text style={styles.profileInfoValue}>
                {firstName} {lastName}
              </Text>
            </View>

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
                    style={styles.saveUsernameButton}
                    onPress={handleSaveUsername}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveUsernameText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.usernameContainer}>
                  <Text style={styles.profileInfoValue}>{username}</Text>
                  <TouchableOpacity
                    style={styles.editUsernameButton}
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
          </View>
        </Animated.View>

        {/* Security Section */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500)}
          style={[styles.section, securityAnimatedStyle]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Feather name="shield" size={20} color="#4E5A94" />
              <Text style={styles.sectionTitle}>Security & Authentication</Text>
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
                      Last active: {formatLastActiveTime(session.lastActiveAt)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No active sessions</Text>
          )}
        </Animated.View>

        {/* Account Actions Section */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(500)}
          style={[styles.section, actionsAnimatedStyle]}
        >
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
  content: {
    padding: 20,
    paddingBottom: 40,
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
    paddingTop: Platform.OS === "ios" ? 50 : 20,
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

  // Section Styling
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
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  changeImageButton: {
    position: "absolute",
    right: "35%",
    bottom: 15,
    backgroundColor: "#4E5A94",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  imageButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 5,
  },
  saveImageButton: {
    backgroundColor: "#4CAF50",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  cancelImageButton: {
    backgroundColor: "#FF3B30",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
  editUsernameButton: {
    padding: 6,
    marginLeft: 10,
  },

  // Form Elements
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#FAFAFA",
  },
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
  saveUsernameButton: {
    backgroundColor: "#4E5A94",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveUsernameText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
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
  revokeButton: {
    padding: 8,
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
