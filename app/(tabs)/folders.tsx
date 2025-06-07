import AddFolderModal from "@/components/folders/AddFolderModal";
import AddNoteModal from "@/components/folders/AddNoteModal";
import FolderDetailsModal from "@/components/folders/FolderDetailsModal";
import ProfileModal from "@/components/profile/ProfileModal";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import sanitizeHtml from 'sanitize-html';

// --- FIREBASE LOGIC START ---
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../config/firebase";

// Get screen dimensions
const { width, height } = Dimensions.get("window");

const FOLDERS_COLLECTION = "folders";
// --- FIREBASE LOGIC END ---

const Folders = () => {
  const [search, setSearch] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [folders, setFolders] = useState<
    {
      id: string;
      title: string;
      description: string;
      notes?: { title: string; description: string; date: string }[];
      userId: string;
    }[]
  >([]);
  const [openedFolder, setOpenedFolder] = useState<null | {
    id: string;
    title: string;
    description: string;
    notes?: { title: string; description: string; date: string }[];
    userId: string;
  }>(null);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);

  const handleSearchChange = (text: string) => {
  // Sanitize the search query
  const sanitizedText = sanitizeHtml(text, {
    allowedTags: [],  // No HTML tags allowed
    allowedAttributes: {},  // No attributes allowed
  });
  setSearch(sanitizedText); // Update the search state with sanitized text
};

  // For per-folder menu in grid
  const [menuFolderIdx, setMenuFolderIdx] = useState<number | null>(null);

  // Edit folder modal state (reusing AddFolderModal)
  const [editingFolder, setEditingFolder] = useState<
    null | typeof openedFolder
  >(null);

  // --- Add loading state ---
  const [loading, setLoading] = useState(true);

  // --- FIREBASE: Real-time fetch of folders for current user ---
  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) {
      setFolders([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, FOLDERS_COLLECTION),
      where("userId", "==", user.uid),
      orderBy("title")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFolders(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any
      );
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // --- FIREBASE: Add a new folder (with userId) ---
  const handleAddFolder = async (folder: {
    title: string;
    description: string;
  }) => {
    const user = getAuth().currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to add a folder.");
      return;
    }
    try {
      await addDoc(collection(db, FOLDERS_COLLECTION), {
        title: folder.title,
        description: folder.description,
        notes: [],
        userId: user.uid,
      });
      setIsModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "Could not add folder.");
    }
  };

  // --- FIREBASE: Edit a folder ---
  const handleEditFolder = async (folder: {
    title: string;
    description: string;
  }) => {
    if (!editingFolder) return;
    const user = getAuth().currentUser;
    if (!user || editingFolder.userId !== user.uid) {
      Alert.alert("Error", "You do not have permission to edit this folder.");
      return;
    }
    try {
      await updateDoc(doc(db, FOLDERS_COLLECTION, editingFolder.id), {
        title: folder.title,
        description: folder.description,
      });
      setEditingFolder(null);
      setIsModalVisible(false);
      Alert.alert("Success", "Folder updated successfully.");
    } catch (e) {
      Alert.alert("Error", "Could not update folder.");
    }
  };

  // --- FIREBASE: Add a note to the opened folder ---
  const handleAddNote = async (note: {
    title: string;
    description: string;
    date: string;
  }) => {
    if (!openedFolder) return;
    const user = getAuth().currentUser;
    if (!user || openedFolder.userId !== user.uid) {
      Alert.alert(
        "Error",
        "You do not have permission to add a note to this folder."
      );
      return;
    }
    try {
      const folderRef = doc(db, FOLDERS_COLLECTION, openedFolder.id);
      const folderNotes = openedFolder.notes || [];
      await updateDoc(folderRef, {
        notes: [...folderNotes, note],
      });
      setOpenedFolder((prev) =>
        prev ? { ...prev, notes: [...(prev.notes || []), note] } : prev
      );
    } catch (e) {
      Alert.alert("Error", "Could not add note.");
    }
  };

  // --- FIREBASE: Delete a folder ---
  const handleDeleteFolder = async (folderId: string) => {
    const user = getAuth().currentUser;
    const folder = folders.find((f) => f.id === folderId);
    if (!user || !folder || folder.userId !== user.uid) {
      Alert.alert("Error", "You do not have permission to delete this folder.");
      return;
    }
    try {
      await deleteDoc(doc(db, FOLDERS_COLLECTION, folderId));
      if (openedFolder?.id === folderId) setOpenedFolder(null);
      Alert.alert("Success", "Folder deleted successfully.");
    } catch (e) {
      Alert.alert("Error", "Could not delete folder.");
    }
  };

  // Filtered folders for search
  const filteredFolders = folders.filter((f) =>
    f.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  // --- Show loading indicator until folders are loaded ---
  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#F76A86" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: height * 0.12 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>keeply.</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setProfileModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-circle-outline"
              size={width * 0.09}
              color="#F76A86"
            />
          </TouchableOpacity>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Folders</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={width * 0.05}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Folders"
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={handleSearchChange}  // Use the sanitized function
          />
        </View>

        {/* Folder Grid */}
        <View style={styles.folderGrid}>
          {filteredFolders.length > 0 ? (
            filteredFolders.map((folder, idx) => (
              <View key={folder.id} style={styles.folderSquare}>
                {/* Three-dot menu button */}
                <TouchableOpacity
                  style={styles.folderMenuButton}
                  onPress={() =>
                    setMenuFolderIdx(menuFolderIdx === idx ? null : idx)
                  }
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={width * 0.055}
                    color="#000"
                  />
                </TouchableOpacity>
                {/* Dropdown menu */}
                {menuFolderIdx === idx && (
                  <View style={styles.folderMenuDropdown}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuFolderIdx(null);
                        setEditingFolder(folder);
                        setIsModalVisible(true);
                      }}
                    >
                      <Text style={styles.menuText}>Edit</Text>
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuFolderIdx(null);
                        Alert.alert(
                          "Delete Folder",
                          "Are you sure you want to delete this folder?",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => handleDeleteFolder(folder.id),
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={[styles.menuText, { color: "#F76A86" }]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.8}
                  onPress={() => {
                    setOpenedFolder(folder);
                    setMenuFolderIdx(null);
                  }}
                >
                  <Ionicons
                    name="folder"
                    size={width * 0.11}
                    color="#0E2148"
                    style={styles.folderIcon}
                  />
                  <Text style={styles.folderName} numberOfLines={2}>
                    {folder.title}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Image
                source={require("../../assets/images/folders.jpg")}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyText}>
                No folders yet. Tap + to add one!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={isProfileModalVisible}
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <ProfileModal />
        <TouchableOpacity
          style={{
            position: "absolute",
            top: height * 0.05,
            right: width * 0.05,
            zIndex: 10,
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: width * 0.015,
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
          onPress={() => setProfileModalVisible(false)}
        >
          <Ionicons name="close" size={width * 0.07} color="#333" />
        </TouchableOpacity>
      </Modal>

      {/* Folder Details Modal */}
      {openedFolder && (
        <FolderDetailsModal
          visible={true}
          folder={openedFolder}
          onClose={() => setOpenedFolder(null)}
          onAddNote={handleAddNote}
        />
      )}
      {/* Add Note Modal */}
      {isNoteModalVisible && (
        <AddNoteModal
          visible={true}
          onClose={() => setIsNoteModalVisible(false)}
          onAddNote={handleAddNote}
        />
      )}

      {/* Add/Edit Folder Modal (reused for both) */}
      <AddFolderModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setEditingFolder(null);
        }}
        onAddFolder={editingFolder ? handleEditFolder : handleAddFolder}
        folder={editingFolder || undefined}
      />

      {/* Add Folder FAB */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingFolder(null);
          setIsModalVisible(true);
        }}
      >
        <Ionicons name="add" size={width * 0.08} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Folders;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.025,
  },
  header: {
    marginBottom: height * 0.03,
  },
  profileButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: width * 0.01,
    zIndex: 2,
  },
  appName: {
    fontSize: width * 0.08,
    fontWeight: "700",
    color: "#333",
    marginBottom: height * 0.006,
  },
  welcomeContainer: {
    marginTop: height * 0.006,
  },
  welcomeText: {
    fontSize: width * 0.08,
    fontWeight: "900",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: width * 0.025,
    paddingHorizontal: width * 0.04,
    marginBottom: height * 0.025,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchIcon: {
    marginRight: width * 0.025,
  },
  searchInput: {
    flex: 1,
    paddingVertical: height * 0.015,
    fontSize: width * 0.04,
    color: "#333",
  },
  folderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: height * 0.11,
  },
  folderSquare: {
    width: (width - width * 0.16) / 2, // Responsive width: (screen width - total horizontal padding) / 2
    aspectRatio: 1,
    backgroundColor: "#FFCCCB",
    borderRadius: width * 0.045,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: height * 0.02,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#FFD36B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    padding: width * 0.025,
    position: "relative",
    minHeight: width * 0.3,
    maxHeight: width * 0.32,
  },
  folderMenuButton: {
    position: "absolute",
    top: width * 0.025,
    right: width * 0.025,
    zIndex: 2,
    padding: width * 0.01,
  },
  folderMenuDropdown: {
    position: "absolute",
    top: width * 0.09,
    right: width * 0.025,
    backgroundColor: "#fff",
    borderRadius: width * 0.025,
    paddingVertical: height * 0.008,
    paddingHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    minWidth: width * 0.28,
    zIndex: 10,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginHorizontal: width * 0.025,
  },
  menuItem: {
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.045,
  },
  menuText: {
    fontSize: width * 0.04,
    color: "#333",
    fontWeight: "600",
  },
  folderIcon: {
    marginBottom: height * 0.012,
  },
  folderName: {
    fontSize: width * 0.04,
    color: "#333",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 0,
    letterSpacing: 0.1,
    maxWidth: "90%",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: height * 0.4,
    width: "100%",
  },
  emptyImage: {
    width: width * 0.35,
    height: width * 0.35,
    maxWidth: 140,
    maxHeight: 140,
  },
  emptyText: {
    color: "#aaa",
    fontSize: width * 0.038,
    textAlign: "center",
    marginVertical: height * 0.012,
  },
  addButton: {
    position: "absolute",
    right: width * 0.06,
    bottom: height * 0.04, // Changed from 0.03 to 0.04 to match home.tsx
    width: width * 0.16,
    height: width * 0.16,
    borderRadius: width * 0.08,
    backgroundColor: "#F76A86",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#fff",
  },
});
