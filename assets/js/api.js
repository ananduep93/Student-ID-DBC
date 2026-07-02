import { initFirebase, isFirebaseConfigured } from './firebase-config.js';

export let IMAGEBB_API_KEY = "YOUR_IMAGEBB_API_KEY";

// Try loading local config.js dynamically so it doesn't crash if ignored in Git
try {
  const configModule = await import('./config.js');
  if (configModule && configModule.IMAGEBB_API_KEY) {
    IMAGEBB_API_KEY = configModule.IMAGEBB_API_KEY;
  }
} catch (e) {
  console.warn("config.js not found or failed to load. Running in Mock/Template mode.");
}

const isImageBBConfigured = () => {
  return IMAGEBB_API_KEY && !IMAGEBB_API_KEY.startsWith("YOUR_");
};

// Timeout helper for promise-based operations
const withTimeout = (promise, ms, errorMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
};

// Database state
let db = null;
let storage = null;
let firebasePromise = null;

// Initialize Firebase connection
const getFirebaseInstance = () => {
  if (!firebasePromise) {
    firebasePromise = initFirebase().then((instances) => {
      db = instances.db;
      storage = instances.storage;
      return { db, storage };
    });
  }
  return firebasePromise;
};

// Helper: Convert File to Base64 (for mock storage fallback)
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Helper: Generate Unique ID
const generateUniqueId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < 20; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
};

// MOCK Database Layer (localStorage)
const mockDB = {
  getProfiles: () => {
    const data = localStorage.getItem('student_profiles');
    return data ? JSON.parse(data) : [];
  },
  saveProfiles: (profiles) => {
    localStorage.setItem('student_profiles', JSON.stringify(profiles));
  },
  addProfile: (profile) => {
    const profiles = mockDB.getProfiles();
    profiles.push(profile);
    mockDB.saveProfiles(profiles);
  },
  getProfile: (id) => {
    const profiles = mockDB.getProfiles();
    return profiles.find(p => p.id === id) || null;
  },
  updateProfile: (id, updatedData) => {
    const profiles = mockDB.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updatedData };
      mockDB.saveProfiles(profiles);
      return true;
    }
    return false;
  },
  deleteProfile: (id) => {
    const profiles = mockDB.getProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    mockDB.saveProfiles(filtered);
  }
};

/**
 * 1. Upload Student Profile Photo to ImageBB
 * Fallback: Base64 dataURL stored locally in Mock Mode
 */
export const uploadProfilePhoto = async (file) => {
  // Simulate network delay for good UX testing
  await new Promise(resolve => setTimeout(resolve, 800));

  if (!isImageBBConfigured()) {
    console.log("ImageBB is not configured. Converting image to Base64 locally.");
    return await fileToBase64(file);
  }

  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMAGEBB_API_KEY}`, {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    if (result.success) {
      return result.data.url; // Returns the permanent hosted image URL
    } else {
      throw new Error(result.error?.message || "Failed to upload to ImageBB");
    }
  } catch (error) {
    console.error("ImageBB upload error:", error);
    throw error;
  }
};

/**
 * 2. Save Student Profile details
 */
export const saveStudentProfile = async (profileData) => {
  const uniqueId = generateUniqueId();
  const submissionDate = new Date().toISOString();
  
  const studentDoc = {
    id: uniqueId,
    ...profileData,
    submissionDate
  };

  // Wait for Firebase initialization attempt (timeout in 6 seconds)
  try {
    await withTimeout(getFirebaseInstance(), 6000, "Firebase initialization timed out.");
  } catch (err) {
    console.warn("Firebase connection timed out. Falling back to local storage.", err);
    mockDB.addProfile(studentDoc);
    return uniqueId;
  }

  if (isFirebaseConfigured() && db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
      
      // Save document to Firestore with a 6-second timeout
      await withTimeout(
        setDoc(doc(db, "students", uniqueId), studentDoc),
        6000,
        "Firestore write timed out. Make sure your Firestore Database is created in the Firebase console and security rules allow public writes."
      );
      return uniqueId;
    } catch (error) {
      console.error("Firestore save error:", error);
      throw error;
    }
  } else {
    // Save to localStorage
    mockDB.addProfile(studentDoc);
    return uniqueId;
  }
};

/**
 * 3. Fetch Single Student Profile
 */
export const getStudentProfile = async (id) => {
  try {
    await withTimeout(getFirebaseInstance(), 6000, "Firebase initialization timed out.");
  } catch (err) {
    console.warn("Firebase connection timed out. Falling back to local storage.", err);
    return mockDB.getProfile(id);
  }

  if (isFirebaseConfigured() && db) {
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
      const docRef = doc(db, "students", id);
      
      const docSnap = await withTimeout(
        getDoc(docRef),
        6000,
        "Firestore fetch timed out. Check your database connection."
      );
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error("Firestore get error:", error);
      throw error;
    }
  } else {
    return mockDB.getProfile(id);
  }
};

/**
 * 4. Fetch All Student Profiles (Admin Dashboard)
 */
export const getAllStudentProfiles = async () => {
  try {
    await withTimeout(getFirebaseInstance(), 6000, "Firebase initialization timed out.");
  } catch (err) {
    console.warn("Firebase connection timed out. Falling back to local storage.", err);
    return mockDB.getProfiles().sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
  }

  if (isFirebaseConfigured() && db) {
    try {
      const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
      const q = query(collection(db, "students"), orderBy("submissionDate", "desc"));
      
      const querySnapshot = await withTimeout(
        getDocs(q),
        6000,
        "Firestore query timed out. Check your database connection."
      );
      
      const students = [];
      querySnapshot.forEach((doc) => {
        students.push(doc.data());
      });
      return students;
    } catch (error) {
      console.error("Firestore get all error:", error);
      throw error;
    }
  } else {
    return mockDB.getProfiles().sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
  }
};

/**
 * 5. Update Student Profile Details (Admin Dashboard)
 */
export const updateStudentProfile = async (id, updatedFields) => {
  try {
    await withTimeout(getFirebaseInstance(), 6000, "Firebase initialization timed out.");
  } catch (err) {
    console.warn("Firebase connection timed out. Falling back to local storage.", err);
    return mockDB.updateProfile(id, updatedFields);
  }

  if (isFirebaseConfigured() && db) {
    try {
      const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
      const docRef = doc(db, "students", id);
      
      await withTimeout(
        updateDoc(docRef, updatedFields),
        6000,
        "Firestore update timed out. Check your database connection."
      );
      return true;
    } catch (error) {
      console.error("Firestore update error:", error);
      throw error;
    }
  } else {
    return mockDB.updateProfile(id, updatedFields);
  }
};

/**
 * 6. Delete Student Profile (Admin Dashboard)
 */
export const deleteStudentProfile = async (id) => {
  try {
    await withTimeout(getFirebaseInstance(), 6000, "Firebase initialization timed out.");
  } catch (err) {
    console.warn("Firebase connection timed out. Falling back to local storage.", err);
    mockDB.deleteProfile(id);
    return true;
  }

  if (isFirebaseConfigured() && db) {
    try {
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
      const docRef = doc(db, "students", id);
      
      await withTimeout(
        deleteDoc(docRef),
        6000,
        "Firestore delete timed out. Check your database connection."
      );
      return true;
    } catch (error) {
      console.error("Firestore delete error:", error);
      throw error;
    }
  } else {
    mockDB.deleteProfile(id);
    return true;
  }
};

// Make api functions globally available if needed
window.api = {
  uploadProfilePhoto,
  saveStudentProfile,
  getStudentProfile,
  getAllStudentProfiles,
  updateStudentProfile,
  deleteStudentProfile
};
