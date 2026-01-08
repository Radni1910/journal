import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  useColorScheme,
  Alert,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";

import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { Calendar } from "react-native-calendars";
// import * as Notifications from "expo-notifications";
import { calculateStreak } from "../utils/streak";
import MoodPicker from "../components/MoodPicker";

const moodEmojis = {
  happy: "😄",
  grateful: "🙏",
  excited: "🤩",
  calm: "😌",
  neutral: "😐",
  tired: "😴",
  sad: "😔",
  anxious: "😟",
  angry: "😠",
  loved: "🥰",
  confused: "😕",
  proud: "😊",
};

export default function JournalScreen({ navigation }) {
  const theme = useColorScheme();
  const user = auth.currentUser;

  const [text, setText] = useState("");
  const [mood, setMood] = useState("happy");
  const [entries, setEntries] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editText, setEditText] = useState("");
  const [editMood, setEditMood] = useState("happy");
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    loadEntries();
    // scheduleReminder();
  }, [user]);

  // Get mood emoji for a specific date
  const getMoodForDate = (dateString) => {
    const dateMoods = {};
    
    // Group entries by date and get the mood for each date
    entries.forEach((entry) => {
      if (entry.createdAt instanceof Date) {
        const dateStr = entry.createdAt.toISOString().split("T")[0];
        // If multiple entries on same date, keep the most recent mood
        if (!dateMoods[dateStr] || 
            entry.createdAt > (dateMoods[dateStr].date || new Date(0))) {
          dateMoods[dateStr] = {
            mood: entry.mood,
            date: entry.createdAt,
          };
        }
      }
    });
    
    return dateMoods[dateString]?.mood ? moodEmojis[dateMoods[dateString].mood] : null;
  };

  const getMarkedDates = () => {
    const marked = {};
    const dateMoods = {};
    
    // Group entries by date and get the mood for each date
    entries.forEach((entry) => {
      if (entry.createdAt instanceof Date) {
        const dateStr = entry.createdAt.toISOString().split("T")[0];
        // If multiple entries on same date, keep the most recent mood
        if (!dateMoods[dateStr] || 
            entry.createdAt > (dateMoods[dateStr].date || new Date(0))) {
          dateMoods[dateStr] = {
            mood: entry.mood,
            date: entry.createdAt,
          };
        }
      }
    });

    // Create marked dates
    Object.keys(dateMoods).forEach((dateStr) => {
      marked[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: selectedDate === dateStr ? "#40916c" : "transparent",
            borderRadius: 8,
          },
          text: {
            color: selectedDate === dateStr ? "#fff" : "#000",
            fontWeight: selectedDate === dateStr ? "bold" : "normal",
          },
        },
        selected: selectedDate === dateStr,
        selectedColor: "#40916c",
        selectedTextColor: "#fff",
        marked: true,
        dotColor: "#40916c",
      };
    });

    if (selectedDate && marked[selectedDate]) {
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = "#40916c";
    }

    return marked;
  };

  // Custom day component to display mood emoji
  const CustomDay = (props) => {
    const { date, marking, state, onPress } = props;
    const dateString = date?.dateString || "";
    const moodEmoji = getMoodForDate(dateString);
    const isSelected = marking?.selected;
    const isToday = dateString === new Date().toISOString().split("T")[0];
    const isDisabled = state === "disabled";
    
    return (
      <TouchableOpacity
        onPress={() => onPress && onPress(date)}
        disabled={isDisabled}
        style={[
          styles.calendarDay,
          isSelected && styles.calendarDaySelected,
          isToday && !isSelected && !isDisabled && styles.calendarDayToday,
          isDisabled && styles.calendarDayDisabled,
        ]}
      >
        <View style={styles.calendarDayContent}>
          <Text
            style={[
              styles.calendarDayText,
              isSelected && styles.calendarDayTextSelected,
              isToday && !isSelected && !isDisabled && styles.calendarDayTextToday,
              isDisabled && styles.calendarDayTextDisabled,
            ]}
          >
            {date?.day}
          </Text>
          {moodEmoji && !isDisabled && (
            <Text style={[
              styles.calendarDayEmoji,
              isSelected && styles.calendarDayEmojiSelected
            ]}>
              {moodEmoji}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getFilteredEntries = () => {
    let filtered = entries;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (entry) =>
          entry.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.mood.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedDate) {
      filtered = filtered.filter((entry) => {
        if (entry.createdAt instanceof Date) {
          return entry.createdAt.toISOString().split("T")[0] === selectedDate;
        }
        return false;
      });
    }

    return filtered;
  };

  const getMoodStats = () => {
    const stats = {};
    entries.forEach((entry) => {
      stats[entry.mood] = (stats[entry.mood] || 0) + 1;
    });
    return stats;
  };

  const saveEntry = async () => {
    try {
      if (!user) {
        Alert.alert("Not signed in", "Please log in before saving a journal.");
        return;
      }

      if (!text.trim()) {
        Alert.alert("Empty entry", "Please write something before saving.");
        return;
      }

      setLoading(true);
      await addDoc(collection(db, "users", user.uid, "entries"), {
        text,
        mood,
        createdAt: Timestamp.now(),
      });

      setText("");
      setMood("happy");
      await loadEntries();
      Alert.alert("Success", "Entry saved! 🌱");
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert(
        "Save failed",
        "We couldn't save your entry. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async () => {
    try {
      if (!editingEntry || !editText.trim()) {
        Alert.alert("Error", "Please enter some text.");
        return;
      }

      setLoading(true);
      const entryRef = doc(db, "users", user.uid, "entries", editingEntry.id);
      await updateDoc(entryRef, {
        text: editText,
        mood: editMood,
      });

      setEditingEntry(null);
      setEditText("");
      await loadEntries();
      Alert.alert("Success", "Entry updated! ✨");
    } catch (error) {
      console.error("Error updating entry:", error);
      Alert.alert("Error", "Failed to update entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entryId) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDoc(doc(db, "users", user.uid, "entries", entryId));
              await loadEntries();
              Alert.alert("Success", "Entry deleted.");
            } catch (error) {
              console.error("Error deleting entry:", error);
              Alert.alert("Error", "Failed to delete entry.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const loadEntries = async () => {
    try {
      if (!user) {
        return;
      }

      const q = query(
        collection(db, "users", user.uid, "entries"),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          ...raw,
          createdAt: raw.createdAt?.toDate
            ? raw.createdAt.toDate()
            : raw.createdAt ?? new Date(),
        };
      });

      setEntries(data);
      setStreak(calculateStreak(data));
    } catch (error) {
      console.error("Error loading entries:", error);
      Alert.alert(
        "Load failed",
        "We couldn't load your previous entries. Please try again."
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setEditText(entry.text);
    setEditMood(entry.mood);
  };

//   const scheduleReminder = async () => {
//     try {
//       const { status } = await Notifications.requestPermissionsAsync();
//       if (status !== "granted") return;

//       await Notifications.scheduleNotificationAsync({
//         content: {
//           title: "Journal Reminder",
//           body: "Write how you feel today 🌱",
//         },
//         trigger: { hour: 21, minute: 0, repeats: true },
//       });
//     } catch (error) {
//       console.error("Error scheduling reminder:", error);
//     }
//   };

  const formatDate = (date) => {
    if (!(date instanceof Date)) return "";
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const backgroundColor = theme === "dark" ? "#1a1a1a" : "#b8d3a6";
  const textColor = theme === "dark" ? "#fff" : "#000";
  const cardBg = theme === "dark" ? "#2a2a2a" : "#fff";
  const inputBg = theme === "dark" ? "#2a2a2a" : "#fff";
  const filteredEntries = getFilteredEntries();
  const moodStats = getMoodStats();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[styles.topHeader, { backgroundColor: cardBg }]}>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            📔 Journal
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Todos")}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>✅ Todos</Text>
          </TouchableOpacity>
        </View>

        {/* Header Stats */}
        <View style={styles.header}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.statValue, { color: textColor }]}>
                🔥 {streak}
              </Text>
              <Text style={[styles.statLabel, { color: textColor }]}>
                Day Streak
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.statValue, { color: textColor }]}>
                📝 {entries.length}
              </Text>
              <Text style={[styles.statLabel, { color: textColor }]}>
                Total Entries
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: inputBg, color: textColor }]}
            placeholder="Search entries..."
            placeholderTextColor={theme === "dark" ? "#888" : "#999"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Calendar */}
        <View style={[styles.calendarContainer, { backgroundColor: cardBg }]}>
          <Calendar
            markedDates={getMarkedDates()}
            markingType="custom"
            dayComponent={CustomDay}
            onDayPress={(day) => {
              setSelectedDate(selectedDate === day.dateString ? null : day.dateString);
            }}
            theme={{
              backgroundColor: cardBg,
              calendarBackground: cardBg,
              textSectionTitleColor: textColor,
              selectedDayBackgroundColor: "#40916c",
              selectedDayTextColor: "#fff",
              todayTextColor: "#40916c",
              dayTextColor: textColor,
              textDisabledColor: theme === "dark" ? "#555" : "#ccc",
              dotColor: "#40916c",
              selectedDotColor: "#fff",
              arrowColor: "#40916c",
              monthTextColor: textColor,
              textDayFontWeight: "400",
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "600",
            }}
          />
          {selectedDate && (
            <TouchableOpacity
              onPress={() => setSelectedDate(null)}
              style={styles.clearDateButton}
            >
              <Text style={styles.clearDateText}>Clear filter</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mood Picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            How are you feeling today?
          </Text>
          <MoodPicker selectedMood={mood} onSelect={(value) => setMood(value)} />
        </View>

        {/* Journal Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Write your thoughts
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
            placeholder="What's on your mind today?"
            placeholderTextColor={theme === "dark" ? "#888" : "#999"}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={saveEntry}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>💾 Save Entry</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Toggle */}
        <TouchableOpacity
          style={[styles.statsToggle, { backgroundColor: cardBg }]}
          onPress={() => setShowStats(!showStats)}
        >
          <Text style={[styles.statsToggleText, { color: textColor }]}>
            {showStats ? "📊 Hide Statistics" : "📊 Show Statistics"}
          </Text>
        </TouchableOpacity>

        {/* Mood Statistics */}
        {showStats && Object.keys(moodStats).length > 0 && (
          <View style={[styles.statsContainer, { backgroundColor: cardBg }]}>
            <Text style={[styles.statsTitle, { color: textColor }]}>
              Mood Overview
            </Text>
            {Object.entries(moodStats).map(([moodKey, count]) => (
              <View key={moodKey} style={styles.statRow}>
                <Text style={styles.moodStatEmoji}>
                  {moodEmojis[moodKey] || "😐"}
                </Text>
                <Text style={[styles.moodStatLabel, { color: textColor }]}>
                  {moodKey.charAt(0).toUpperCase() + moodKey.slice(1)}
                </Text>
                <View style={styles.statBarContainer}>
                  <View
                    style={[
                      styles.statBar,
                      {
                        width: `${(count / entries.length) * 100}%`,
                        backgroundColor: "#40916c",
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.moodStatCount, { color: textColor }]}>
                  {count}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Entries List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {selectedDate
              ? `Entries for ${selectedDate}`
              : searchQuery
              ? `Search Results (${filteredEntries.length})`
              : "Recent Entries"}
          </Text>

          {filteredEntries.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={[styles.emptyText, { color: textColor }]}>
                {searchQuery || selectedDate
                  ? "No entries found"
                  : "No entries yet. Start writing!"}
              </Text>
            </View>
          ) : (
            filteredEntries.map((item) => (
              <View
                key={item.id}
                style={[styles.entryCard, { backgroundColor: cardBg }]}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.moodHeader}>
                    <Text style={styles.moodEmoji}>
                      {moodEmojis[item.mood] || "😐"}
                    </Text>
                    <Text style={[styles.moodText, { color: textColor }]}>
                      {item.mood.charAt(0).toUpperCase() + item.mood.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.entryActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteEntry(item.id)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.entryText, { color: textColor }]}>
                  {item.text}
                </Text>
                <Text style={styles.entryDate}>
                  {formatDate(item.createdAt)}
                  {item.createdAt instanceof Date &&
                    ` • ${item.createdAt.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}`}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editingEntry !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingEntry(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Edit Entry
            </Text>

            <Text style={[styles.label, { color: textColor }]}>Mood</Text>
            <MoodPicker
              selectedMood={editMood}
              onSelect={(value) => setEditMood(value)}
            />

            <Text style={[styles.label, { color: textColor }]}>Entry</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
              placeholder="Edit your entry..."
              placeholderTextColor={theme === "dark" ? "#888" : "#999"}
              value={editText}
              onChangeText={setEditText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEditingEntry(null);
                  setEditText("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={updateEntry}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.updateButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  topHeader: {
    padding: 20,
    paddingTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
    position: "relative",
  },
  searchInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingRight: 40,
  },
  clearButton: {
    position: "absolute",
    right: 30,
    top: 12,
    padding: 5,
  },
  clearButtonText: {
    fontSize: 18,
    color: "#999",
  },
  calendarContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearDateButton: {
    alignItems: "center",
    padding: 10,
  },
  clearDateText: {
    color: "#40916c",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  textInput: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: "#40916c",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  statsToggle: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  statsToggleText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  moodStatEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  moodStatLabel: {
    fontSize: 14,
    fontWeight: "600",
    width: 80,
  },
  statBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginRight: 10,
    overflow: "hidden",
  },
  statBar: {
    height: "100%",
    borderRadius: 4,
  },
  moodStatCount: {
    fontSize: 14,
    fontWeight: "600",
    width: 30,
    textAlign: "right",
  },
  entryCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  moodHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  moodText: {
    fontSize: 16,
    fontWeight: "600",
  },
  entryActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
  actionIcon: {
    fontSize: 20,
  },
  entryText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  entryDate: {
    fontSize: 12,
    color: "#999",
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  updateButton: {
    backgroundColor: "#40916c",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  calendarDay: {
    width: 40,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    margin: 2,
    paddingVertical: 2,
  },
  calendarDaySelected: {
    backgroundColor: "#40916c",
    borderRadius: 8,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: "#40916c",
    borderRadius: 8,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  calendarDayText: {
    fontSize: 14,
    color: "#000",
    lineHeight: 16,
    marginBottom: 1,
  },
  calendarDayTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  calendarDayTextToday: {
    color: "#40916c",
    fontWeight: "bold",
  },
  calendarDayTextDisabled: {
    color: "#ccc",
  },
  calendarDayEmoji: {
    fontSize: 12,
    lineHeight: 12,
    marginTop: 0,
    textAlign: "center",
  },
  calendarDayEmojiSelected: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  navButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#40916c",
  },
  navButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
