// Directly import the real config — no lazy loading, no timing issues
import { firebaseConfig as realConfig } from './config.js';

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

// Firebase instances (module-level singletons)
let app = null;
let db = null;
let storage = null;
let initPromise = null;

export const initFirebase = async () => {
  // Return cached promise if already initializing/initialized
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!isFirebaseConfigured()) {
      console.log("Firebase credentials are not set. Running in MOCK mode (localStorage).");
      return { db: null, storage: null };
    }

    try {
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
      const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

      // Avoid duplicate app initialization
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      db = getFirestore(app);
      console.log("Firebase Firestore initialized successfully!");
      return { db, storage: null };
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      initPromise = null; // reset so it can retry
      return { db: null, storage: null };
    }
  })();

  return initPromise;
};

// Getter functions so api.js always reads the current initialized instance
export const getDb = () => db;
export const getStorage = () => storage;

export default firebaseConfig;
