import { db, isFirebaseConfigured } from './firebase-config.js';
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ─── Timeout Helper ──────────────────────────────────────────────────────────

const withTimeout = (promise, ms, errorMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([
    promise.then(res => { clearTimeout(timeoutId); return res; }),
    timeoutPromise
  ]);
};

// ─── Unique ID Generator ─────────────────────────────────────────────────────

const generateUniqueId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// ─── MOCK Database (localStorage fallback) ───────────────────────────────────

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
    return mockDB.getProfiles().find(p => p.id === id) || null;
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
    const profiles = mockDB.getProfiles().filter(p => p.id !== id);
    mockDB.saveProfiles(profiles);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Save Student Profile → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const saveStudentProfile = async (profileData) => {
  const uniqueId = generateUniqueId();
  const submissionDate = new Date().toISOString();

  const studentDoc = {
    id: uniqueId,
    ...profileData,
    submissionDate
  };

  if (isFirebaseConfigured() && db) {
    try {
      await withTimeout(
        setDoc(doc(db, "students", uniqueId), studentDoc),
        10000,
        "Firestore write timed out. Check your Firestore rules allow public writes."
      );
      console.log("Firestore: profile saved with ID:", uniqueId);
      return uniqueId;
    } catch (error) {
      console.error("Firestore save error, falling back to localStorage:", error);
      mockDB.addProfile(studentDoc);
      return uniqueId;
    }
  } else {
    console.log("Firebase not configured. Saving to localStorage.");
    mockDB.addProfile(studentDoc);
    return uniqueId;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Get Single Student Profile → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const getStudentProfile = async (id) => {
  if (isFirebaseConfigured() && db) {
    try {
      const docSnap = await withTimeout(
        getDoc(doc(db, "students", id)),
        10000,
        "Firestore fetch timed out."
      );
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error("Firestore get error, falling back to localStorage:", error);
      return mockDB.getProfile(id);
    }
  } else {
    return mockDB.getProfile(id);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Get All Student Profiles → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const getAllStudentProfiles = async () => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, "students"), orderBy("submissionDate", "desc"));
      const snapshot = await withTimeout(
        getDocs(q),
        10000,
        "Firestore query timed out."
      );
      const students = [];
      snapshot.forEach(docSnap => students.push(docSnap.data()));
      return students;
    } catch (error) {
      console.error("Firestore getAll error, falling back to localStorage:", error);
      return mockDB.getProfiles().sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
    }
  } else {
    return mockDB.getProfiles().sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Update Student Profile → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const updateStudentProfile = async (id, updatedFields) => {
  if (isFirebaseConfigured() && db) {
    try {
      await withTimeout(
        updateDoc(doc(db, "students", id), updatedFields),
        10000,
        "Firestore update timed out."
      );
      return true;
    } catch (error) {
      console.error("Firestore update error, falling back to localStorage:", error);
      return mockDB.updateProfile(id, updatedFields);
    }
  } else {
    return mockDB.updateProfile(id, updatedFields);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Delete Student Profile → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const deleteStudentProfile = async (id) => {
  if (isFirebaseConfigured() && db) {
    try {
      await withTimeout(
        deleteDoc(doc(db, "students", id)),
        10000,
        "Firestore delete timed out."
      );
      return true;
    } catch (error) {
      console.error("Firestore delete error, falling back to localStorage:", error);
      mockDB.deleteProfile(id);
      return true;
    }
  } else {
    mockDB.deleteProfile(id);
    return true;
  }
};

// Expose to window for debugging
window.api = {
  saveStudentProfile,
  getStudentProfile,
  getAllStudentProfiles,
  updateStudentProfile,
  deleteStudentProfile
};
