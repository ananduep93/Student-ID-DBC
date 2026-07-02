import { initFirebase, isFirebaseConfigured, getDb } from './firebase-config.js';
import { IMAGEBB_API_KEY } from './config.js';

// ─── ImageBB Configuration ───────────────────────────────────────────────────

const isImageBBConfigured = () => {
  return IMAGEBB_API_KEY && !IMAGEBB_API_KEY.startsWith("YOUR_");
};

// ─── Firebase Singleton ──────────────────────────────────────────────────────

let firebaseReady = false;

const ensureFirebase = async () => {
  if (!firebaseReady) {
    await initFirebase();
    firebaseReady = true;
  }
};

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

// ─── Helper: File → Base64 ───────────────────────────────────────────────────

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (err) => reject(err);
});

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

// ─── Firestore Helpers ───────────────────────────────────────────────────────

const getFirestoreFunctions = async () => {
  return await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Upload Profile Photo → ImgBB (fallback: Base64)
// ═══════════════════════════════════════════════════════════════════════════════

export const uploadProfilePhoto = async (file) => {
  if (!isImageBBConfigured()) {
    console.log("ImgBB key not set. Storing image as Base64 locally.");
    return await fileToBase64(file);
  }

  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await withTimeout(
      fetch(`https://api.imgbb.com/1/upload?key=${IMAGEBB_API_KEY}`, {
        method: "POST",
        body: formData
      }),
      15000,
      "ImgBB upload timed out (15s). Check your internet connection."
    );

    const result = await response.json();

    if (result.success) {
      console.log("ImgBB upload success:", result.data.url);
      return result.data.url;
    } else {
      throw new Error(result.error?.message || "ImgBB returned an error response.");
    }
  } catch (error) {
    console.error("ImgBB upload failed, falling back to Base64:", error);
    // Graceful fallback: store image as Base64 in Firestore if ImgBB fails
    return await fileToBase64(file);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Save Student Profile → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const saveStudentProfile = async (profileData) => {
  const uniqueId = generateUniqueId();
  const submissionDate = new Date().toISOString();

  const studentDoc = {
    id: uniqueId,
    ...profileData,
    submissionDate
  };

  await ensureFirebase();
  const db = getDb();

  if (isFirebaseConfigured() && db) {
    try {
      const { doc, setDoc } = await getFirestoreFunctions();
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
// 3. Get Single Student Profile → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const getStudentProfile = async (id) => {
  await ensureFirebase();
  const db = getDb();

  if (isFirebaseConfigured() && db) {
    try {
      const { doc, getDoc } = await getFirestoreFunctions();
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
// 4. Get All Student Profiles → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const getAllStudentProfiles = async () => {
  await ensureFirebase();
  const db = getDb();

  if (isFirebaseConfigured() && db) {
    try {
      const { collection, getDocs, query, orderBy } = await getFirestoreFunctions();
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
// 5. Update Student Profile → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const updateStudentProfile = async (id, updatedFields) => {
  await ensureFirebase();
  const db = getDb();

  if (isFirebaseConfigured() && db) {
    try {
      const { doc, updateDoc } = await getFirestoreFunctions();
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
// 6. Delete Student Profile → Firestore (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const deleteStudentProfile = async (id) => {
  await ensureFirebase();
  const db = getDb();

  if (isFirebaseConfigured() && db) {
    try {
      const { doc, deleteDoc } = await getFirestoreFunctions();
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
  uploadProfilePhoto,
  saveStudentProfile,
  getStudentProfile,
  getAllStudentProfiles,
  updateStudentProfile,
  deleteStudentProfile
};
