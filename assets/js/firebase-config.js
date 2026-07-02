// Placeholder values that denote Firebase is not configured yet
const PLACEHOLDER = "YOUR_FIREBASE_";

export let firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID",
  measurementId: "YOUR_FIREBASE_MEASUREMENT_ID"
};

let configLoaded = false;

export const ensureConfigLoaded = async () => {
  if (configLoaded) return;
  try {
    const configModule = await import('./config.js');
    if (configModule && configModule.firebaseConfig) {
      firebaseConfig = configModule.firebaseConfig;
    }
  } catch (e) {
    console.warn("config.js not found or failed to load. Running in Mock/Template mode.");
  }
  configLoaded = true;
};

// Check if actual config has been provided
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         !firebaseConfig.apiKey.startsWith(PLACEHOLDER) &&
         firebaseConfig.projectId && 
         !firebaseConfig.projectId.startsWith(PLACEHOLDER);
};

// We will import and initialize Firebase only if it is configured.
// This prevents errors on initial local runs before config is provided.
let app = null;
let db = null;
let storage = null;

export const initFirebase = async () => {
  await ensureConfigLoaded();
  
  if (!isFirebaseConfigured()) {
    console.log("Firebase credentials are not set. The application is running in MOCK mode using localStorage.");
    return { db: null, storage: null };
  }

  try {
    // Dynamically import Firebase SDKs from CDN (v12.15.0 as requested)
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
    const { getStorage } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js");

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log("Firebase Firestore and Storage initialized successfully!");
    return { db, storage };
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    return { db: null, storage: null };
  }
};

export { db, storage };
export default firebaseConfig;
