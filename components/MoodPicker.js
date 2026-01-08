import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

const ITEM_WIDTH = 80;

const moods = [
  { label: "Happy", emoji: "😄", value: "happy" },
  { label: "Grateful", emoji: "🙏", value: "grateful" },
  { label: "Excited", emoji: "🤩", value: "excited" },
  { label: "Calm", emoji: "😌", value: "calm" },
  { label: "Neutral", emoji: "😐", value: "neutral" },
  { label: "Tired", emoji: "😴", value: "tired" },
  { label: "Sad", emoji: "😔", value: "sad" },
  { label: "Anxious", emoji: "😟", value: "anxious" },
  { label: "Angry", emoji: "😠", value: "angry" },
  { label: "Loved", emoji: "🥰", value: "loved" },
  { label: "Confused", emoji: "😕", value: "confused" },
  { label: "Proud", emoji: "😊", value: "proud" },
];

export default function MoodPicker({ selectedMood, onSelect }) {
  return (
    <FlatList
      data={moods}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.value}
      snapToInterval={ITEM_WIDTH}
      decelerationRate="fast"
      contentContainerStyle={{
        paddingHorizontal: 10,
      }}
      renderItem={({ item }) => {
        const isSelected = selectedMood === item.value;

        return (
          <TouchableOpacity
            style={[styles.moodBtn, isSelected && styles.selected]}
            onPress={() => onSelect(item.value)}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}
const styles = StyleSheet.create({
  moodBtn: {
    width: ITEM_WIDTH,
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 6,
  },
  selected: {
    backgroundColor: "#d8f3dc",
    borderWidth: 2,
    borderColor: "#40916c",
    transform: [{ scale: 1.0 }],
  },
  emoji: {
    fontSize: 30,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    color: "#555",
  },
  selectedLabel: {
    fontWeight: "bold",
    color: "#1b4332",
  },
});
