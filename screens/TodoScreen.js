import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  useColorScheme,
  Alert,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
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

export default function TodoScreen({ navigation }) {
  const theme = useColorScheme();
  const user = auth.currentUser;

  const [todos, setTodos] = useState([]);
  const [todoText, setTodoText] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    loadTodos();
  }, [user]);

  const loadTodos = async () => {
    try {
      if (!user) {
        return;
      }

      const q = query(
        collection(db, "users", user.uid, "todos"),
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

      setTodos(data);
    } catch (error) {
      console.error("Error loading todos:", error);
      Alert.alert(
        "Load failed",
        "We couldn't load your todos. Please try again."
      );
    }
  };

  const addTodo = async () => {
    try {
      if (!user) {
        Alert.alert("Not signed in", "Please log in before adding a todo.");
        return;
      }

      if (!todoText.trim()) {
        Alert.alert("Empty todo", "Please enter a task.");
        return;
      }

      setLoading(true);
      await addDoc(collection(db, "users", user.uid, "todos"), {
        text: todoText.trim(),
        completed: false,
        createdAt: Timestamp.now(),
      });

      setTodoText("");
      await loadTodos();
    } catch (error) {
      console.error("Error adding todo:", error);
      Alert.alert("Error", "Failed to add todo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (todoId, currentStatus) => {
    try {
      const todoRef = doc(db, "users", user.uid, "todos", todoId);
      await updateDoc(todoRef, {
        completed: !currentStatus,
      });
      await loadTodos();
    } catch (error) {
      console.error("Error toggling todo:", error);
      Alert.alert("Error", "Failed to update todo.");
    }
  };

  const deleteTodo = async (todoId) => {
    Alert.alert(
      "Delete Todo",
      "Are you sure you want to delete this task?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", user.uid, "todos", todoId));
              await loadTodos();
            } catch (error) {
              console.error("Error deleting todo:", error);
              Alert.alert("Error", "Failed to delete todo.");
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodos();
    setRefreshing(false);
  };

  const getFilteredTodos = () => {
    if (showCompletedTodos) {
      return todos.filter((todo) => todo.completed);
    }
    return todos.filter((todo) => !todo.completed);
  };

  const backgroundColor = theme === "dark" ? "#1a1a1a" : "#b8d3a6";
  const textColor = theme === "dark" ? "#fff" : "#000";
  const cardBg = theme === "dark" ? "#2a2a2a" : "#fff";
  const inputBg = theme === "dark" ? "#2a2a2a" : "#fff";
  const filteredTodos = getFilteredTodos();
  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          ✅ Todo List
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Journal")}
          style={styles.navButton}
        >
          <Text style={styles.navButtonText}>📔 Journal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.statValue, { color: textColor }]}>
              📋 {todos.length}
            </Text>
            <Text style={[styles.statLabel, { color: textColor }]}>
              Total Tasks
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.statValue, { color: textColor }]}>
              ⏳ {activeCount}
            </Text>
            <Text style={[styles.statLabel, { color: textColor }]}>
              Active
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.statValue, { color: textColor }]}>
              ✅ {completedCount}
            </Text>
            <Text style={[styles.statLabel, { color: textColor }]}>
              Completed
            </Text>
          </View>
        </View>

        {/* Add Todo Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Add New Task
          </Text>
          <View style={styles.todoInputContainer}>
            <TextInput
              style={[styles.todoInput, { backgroundColor: inputBg, color: textColor }]}
              placeholder="What do you need to do?"
              placeholderTextColor={theme === "dark" ? "#888" : "#999"}
              value={todoText}
              onChangeText={setTodoText}
              onSubmitEditing={addTodo}
            />
            <TouchableOpacity
              style={[styles.addTodoButton, loading && styles.buttonDisabled]}
              onPress={addTodo}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addTodoButtonText}>+</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Todo Filter Tabs */}
        <View style={styles.section}>
          <View style={styles.todoTabs}>
            <TouchableOpacity
              style={[
                styles.todoTab,
                !showCompletedTodos && styles.todoTabActive,
                { backgroundColor: cardBg },
              ]}
              onPress={() => setShowCompletedTodos(false)}
            >
              <Text
                style={[
                  styles.todoTabText,
                  { color: !showCompletedTodos ? "#40916c" : textColor },
                ]}
              >
                Active ({activeCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.todoTab,
                showCompletedTodos && styles.todoTabActive,
                { backgroundColor: cardBg },
              ]}
              onPress={() => setShowCompletedTodos(true)}
            >
              <Text
                style={[
                  styles.todoTabText,
                  { color: showCompletedTodos ? "#40916c" : textColor },
                ]}
              >
                Completed ({completedCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Todo List */}
        <View style={styles.section}>
          {filteredTodos.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
              <Text style={styles.emptyEmoji}>
                {showCompletedTodos ? "🎉" : "📋"}
              </Text>
              <Text style={[styles.emptyText, { color: textColor }]}>
                {showCompletedTodos
                  ? "No completed tasks yet"
                  : "No tasks yet. Add one above!"}
              </Text>
            </View>
          ) : (
            filteredTodos.map((todo) => (
              <View
                key={todo.id}
                style={[styles.todoItem, { backgroundColor: cardBg }]}
              >
                <TouchableOpacity
                  style={styles.todoCheckbox}
                  onPress={() => toggleTodo(todo.id, todo.completed)}
                >
                  <Text style={styles.todoCheckboxIcon}>
                    {todo.completed ? "✅" : "⭕"}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.todoText,
                    { color: textColor },
                    todo.completed && styles.todoTextCompleted,
                  ]}
                >
                  {todo.text}
                </Text>
                <TouchableOpacity
                  onPress={() => deleteTodo(todo.id)}
                  style={styles.todoDeleteButton}
                >
                  <Text style={styles.todoDeleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  todoInputContainer: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 10,
  },
  todoInput: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  addTodoButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#40916c",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addTodoButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  todoTabs: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 10,
  },
  todoTab: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  todoTabActive: {
    borderColor: "#40916c",
    borderWidth: 2,
  },
  todoTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todoCheckbox: {
    marginRight: 12,
  },
  todoCheckboxIcon: {
    fontSize: 24,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  todoTextCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  todoDeleteButton: {
    padding: 5,
    marginLeft: 10,
  },
  todoDeleteIcon: {
    fontSize: 20,
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
});

