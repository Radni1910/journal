// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getFirestore} from "firebase/firestore"
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAft7chk6x7CE0a2ZksCiuXCXZV-a_yoPg",
  authDomain: "digital-journal-4e517.firebaseapp.com",
  projectId: "digital-journal-4e517",
  storageBucket: "digital-journal-4e517.firebasestorage.app",
  messagingSenderId: "191081202874",
  appId: "1:191081202874:web:d83ddd6e58684e75a66e83",
  measurementId: "G-BHWC82188Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);