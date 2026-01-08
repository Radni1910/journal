import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as LocalAuth from "expo-local-authentication";

import LoginScreen from "./screens/loginScreen";
import JournalScreen from "./screens/JournalScreen";
import TodoScreen from "./screens/TodoScreen";
import LockScreen from "./screens/LockScreen";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, setUser);
  }, []);

  if (!user) {
    return <LoginScreen />;
  }

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Journal" 
          component={JournalScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Todos" 
          component={TodoScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
