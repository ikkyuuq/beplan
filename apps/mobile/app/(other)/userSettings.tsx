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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import OccupationSelector from "@/components/OccupationSelector";
import OccupationProfileIcon from "@/components/OccupationProfileIcon";

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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [description, setDescription] = useState("");
  const [occupation, setOccupation] = useState("");
  const [externalAccounts, setExternalAccounts] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  const [useOccupationIcon, setUseOccupationIcon] = useState<boolean>(false);

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
          // Load user profile data
          setUsername(user.username || getDefaultUsername());
          setProfileImage(user.imageUrl);
          setPrimaryEmail(user.primaryEmailAddress?.emailAddress || "");
          setDescription((user.unsafeMetadata?.description as string) || "");
          setOccupation((user.unsafeMetadata?.occupation as string) || "");
          setExternalAccounts(user.externalAccounts || []);

          const occupationValue =
            (user.unsafeMetadata?.occupation as string) || "";
          setOccupation(occupationValue);

          const useOccupIcon = user.unsafeMetadata
            ?.useOccupationIcon as boolean;
          setUseOccupationIcon(useOccupIcon || false);
          setProfileImage(user.imageUrl);

          if (user.getSessions) {
            const sessions = await user.getSessions();

            const activeSession = sessions.find(
              (session) => session.status === "active"
            );

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

  const handleSaveUsername = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

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

  const handleSaveDescription = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      const currentMetadata = user.unsafeMetadata || {};

      await user.update({
        unsafeMetadata: {
          ...currentMetadata,
          description: description,
        },
      });

      setIsEditingDescription(false);
      Alert.alert("Success", "Description updated successfully!");
    } catch (error: any) {
      console.error("Description update error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update description. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOccupation = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      const currentMetadata = user.unsafeMetadata || {};
      const prevOccupation = currentMetadata.occupation;
      const occupationChanged = prevOccupation !== occupation;

      await user.update({
        unsafeMetadata: {
          ...currentMetadata,
          occupation: occupation,
        },
      });

      setIsEditingOccupation(false);

      // ถ้ามีการเปลี่ยนอาชีพและอาชีพใหม่ไม่ว่างเปล่า ให้แนะนำการใช้ไอคอนตามอาชีพ
      if (occupationChanged && occupation && !useOccupationIcon) {
        Alert.alert(
          "Occupation Updated",
          "Would you like to use an occupation-based profile icon?",
          [
            {
              text: "Yes",
              onPress: toggleProfileIconType,
            },
            {
              text: "No",
              style: "cancel",
            },
          ]
        );
      } else {
        Alert.alert("Success", "Occupation updated successfully!");
      }
    } catch (error: any) {
      console.error("Occupation update error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update occupation. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProfileIconType = async () => {
    if (!user || !occupation) return;

    try {
      setIsSaving(true);

      const newUseOccupationIcon = !useOccupationIcon;
      const currentMetadata = user.unsafeMetadata || {};

      await user.update({
        unsafeMetadata: {
          ...currentMetadata,
          useOccupationIcon: newUseOccupationIcon,
        },
      });

      setUseOccupationIcon(newUseOccupationIcon);

      Alert.alert(
        "Success",
        newUseOccupationIcon
          ? "Now using occupation-based profile icon!"
          : "Now using default profile image!"
      );
    } catch (error: any) {
      console.error("Profile icon update error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile icon preference."
      );
    } finally {
      setIsSaving(false);
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

            <View style={styles.profileImageContainer}>
              {/* สร้าง Container ขนาดคงที่สำหรับรูปโปรไฟล์เพื่อป้องกันการขยับเมื่อเปลี่ยนรูปแบบไอคอน */}
              <View style={styles.fixedSizeContainer}>
                {useOccupationIcon && occupation ? (
                  <OccupationProfileIcon
                    occupation={occupation}
                    size={100}
                    showLabel={false}
                  />
                ) : (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />
                )}
              </View>
            </View>

            {/* แยกปุ่มออกมานอก profileImageContainer เพื่อให้ตำแหน่งคงที่ */}
            {occupation && (
              <TouchableOpacity
                style={styles.iconToggleButton}
                onPress={toggleProfileIconType}
                disabled={isSaving}
              >
                <Text style={styles.iconToggleText}>
                  {useOccupationIcon
                    ? "Use Default Profile"
                    : "Use Occupation Icon"}
                </Text>
              </TouchableOpacity>
            )}

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
                      onPress={handleSaveUsername}
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

              {/* Occupation Field - Using the new OccupationSelector component */}
              <View style={styles.profileInfoRow}>
                <Text style={styles.profileInfoLabel}>Occupation</Text>
                {isEditingOccupation ? (
                  <View style={{ flex: 1 }}>
                    <OccupationSelector
                      value={occupation}
                      onValueChange={setOccupation}
                      onSave={handleSaveOccupation}
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
                        onPress={handleSaveDescription}
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
    marginTop: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
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

  // Change Icon Button
  fixedSizeContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  iconToggleButton: {
    marginTop: 10,
    marginBottom: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#4E5A94",
    borderRadius: 15,
    alignSelf: "center",
  },
  iconToggleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },

  // Description styling
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

  // Edit and Save Buttons
  editButton: {
    padding: 6,
    marginLeft: 10,
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
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#FAFAFA",
  },
  saveButton: {
    backgroundColor: "#4E5A94",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DDD",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
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
