import AddBookModal from "@/components/library/AddBookModal";
import BookDetailModal from "@/components/library/BookDetailModal";
import ProfileModal from "@/components/profile/ProfileModal";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { db } from "@/config/firebase";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
// --- FIREBASE LOGIC END ---

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get("window");

// Device type detection for enhanced responsiveness
const isTablet = width >= 768;
const isSmallPhone = width < 350;

interface Book {
  id: string;
  title: string;
  description: string;
  coverUri: string | null;
  rating: number;
  favorite: boolean;
  userId: string;
}

// Helper for stars with responsive sizing
const renderStars = (count: number, size?: number) => {
  const starSize = size || width * 0.035;
  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < count ? "star" : "star-outline"}
          size={starSize}
          color="#FFD36B"
          style={{ marginRight: i < 4 ? width * 0.01 : 0 }}
        />
      ))}
    </View>
  );
};

const Library = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBook, setNewBook] = useState<Partial<Book>>({});
  const [starTemp, setStarTemp] = useState(0);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- Profile modal state ---
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);

  // --- Search state ---
  const [search, setSearch] = useState("");

  // --- FIREBASE: Real-time fetch of books for current user ---
  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) {
      setBooks([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "books"),
      where("userId", "==", user.uid),
      orderBy("title")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBooks(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Book[]
      );
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // --- Sanitize Search Input ---
  const handleSearchChange = (text: string) => {
    const sanitizedSearch = sanitizeHtml(text, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
    });
    setSearch(sanitizedSearch);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      setNewBook({ ...newBook, coverUri: result.assets[0].uri });
    }
  };

  // --- FIREBASE: Add a new book ---
  const handleAddBook = async () => {
    const user = getAuth().currentUser;
    if (!user || !newBook.title) return;
    try {
      await addDoc(collection(db, "books"), {
        title: newBook.title,
        description: newBook.description || "",
        coverUri: newBook.coverUri || null,
        rating: starTemp,
        favorite: false,
        userId: user.uid,
      });
      setNewBook({});
      setStarTemp(0);
      setModalVisible(false);
    } catch (e) {
      console.error("Error adding book:", e);
    }
  };

  // --- FIREBASE: Toggle favorite ---
  const toggleFavorite = async (id: string) => {
    const user = getAuth().currentUser;
    const book = books.find((b) => b.id === id);
    if (!user || !book) return;
    try {
      await updateDoc(doc(db, "books", id), {
        favorite: !book.favorite,
      });
    } catch (e) {
      console.error("Error toggling favorite:", e);
    }
  };

  // --- Filter books by search ---
  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      (book.description &&
        book.description.toLowerCase().includes(search.toLowerCase()))
  );

  // --- Show loading indicator until books are loaded ---
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F76A86" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: height * 0.12,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.welcomeText}>Library</Text>
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
            placeholder="Search Books"
            placeholderTextColor="#666"
            value={search}
            onChangeText={handleSearchChange} // Use sanitized search
          />
        </View>

        {filteredBooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Image
              source={require("@/assets/images/books.jpg")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyStateText}>No books yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add a new book to get started
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredBooks.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridItem}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedBook(item);
                  setDetailModalVisible(true);
                }}
              >
                <Image
                  source={
                    item.coverUri
                      ? { uri: item.coverUri }
                      : require("@/assets/images/books.jpg")
                  }
                  style={styles.gridCover}
                />
                <TouchableOpacity
                  style={styles.favoriteIcon}
                  onPress={() => toggleFavorite(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.favorite ? "star" : "star-outline"}
                    size={width * 0.06}
                    color="#FFD36B"
                  />
                </TouchableOpacity>
                <View style={styles.overlay}>
                  <Text numberOfLines={1} style={styles.overlayTitle}>
                    {item.title}
                  </Text>
                  {renderStars(item.rating)}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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

      {/* Add Book Modal */}
      <AddBookModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddBook}
        newBook={newBook}
        setNewBook={setNewBook}
        pickImage={pickImage}
        starTemp={starTemp}
        setRating={setStarTemp}
      />

      {/* Add Book FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={width * 0.08} color="#fff" />
      </TouchableOpacity>

      {/* Book Detail Modal */}
      <BookDetailModal
        visible={detailModalVisible}
        book={selectedBook}
        onClose={() => setDetailModalVisible(false)}
        renderStars={renderStars}
      />
    </SafeAreaView>
  );
};

export default Library;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: height * 0.5,
  },
  emptyImage: {
    width: width * 0.35,
    height: width * 0.35,
    maxWidth: 150,
    maxHeight: 150,
  },
  emptyStateText: {
    fontSize: width * 0.045,
    fontWeight: "700",
    color: "#999",
    marginTop: height * 0.02,
  },
  emptyStateSubtext: {
    fontSize: width * 0.035,
    color: "#999",
    marginTop: height * 0.005,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: height * 0.02,
  },
  gridItem: {
    width: isTablet ? "30%" : "47%", // Responsive grid columns
    aspectRatio: 3 / 4,
    marginBottom: height * 0.02,
    borderRadius: width * 0.03,
    overflow: "hidden",
    backgroundColor: "#fefefe",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: "relative",
    borderColor: "#333",
    borderWidth: 1,
  },
  gridCover: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.02,
  },
  overlayTitle: {
    fontSize: width * 0.035,
    fontWeight: "700",
    color: "#222",
    marginBottom: height * 0.003,
  },
  starRow: {
    flexDirection: "row",
    marginTop: height * 0.003,
  },
  favoriteIcon: {
    position: "absolute",
    top: width * 0.02,
    right: width * 0.02,
    backgroundColor: "#fff",
    borderRadius: width * 0.04,
    padding: width * 0.015,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  fab: {
    position: "absolute",
    right: width * 0.06,
    bottom: height * 0.04,
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
