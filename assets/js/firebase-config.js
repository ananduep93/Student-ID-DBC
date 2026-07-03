// Directly import from config.js — no lazy loading, no timing issues
import { firebaseConfig as realConfig } from './config.js';

// Dynamically import Firebase core and services statically from CDN
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const PLACEHOLDER = "YOUR_FIREBASE_";

// Use the real config directly
export const firebaseConfig = realConfig;

// Check if actual config keys have been provided
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith(PLACEHOLDER) &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.startsWith(PLACEHOLDER)
  );
};

// Global Firebase instances
export let app = null;
export let db = null;
export let storage = null;

if (isFirebaseConfigured()) {
  try {
    // Avoid duplicate app initialization
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase statically initialized successfully (Firestore + Storage)!");
  } catch (error) {
    console.error("Firebase static initialization failed:", error);
  }
} else {
  console.log("Firebase credentials are not set. The application is running in MOCK mode.");
}

export default firebaseConfig;
