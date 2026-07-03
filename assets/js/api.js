import { db, storage, isFirebaseConfigured } from './firebase-config.js';
import { IMAGEBB_API_KEY } from './config.js';
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ─── ImageBB Configuration ───────────────────────────────────────────────────

const isImageBBConfigured = () => {
  return IMAGEBB_API_KEY && !IMAGEBB_API_KEY.startsWith("YOUR_");
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

// ─── Helper: Image Compression ────────────────────────────────────────────────

const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name || 'photo.jpg', {
              type: file.type || 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type || 'image/jpeg', quality);
      };
    };
    reader.onerror = () => resolve(file);
  });
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
// 1. Upload Profile Photo → Storage Bucket / ImgBB / Base64 Fallback
// ═══════════════════════════════════════════════════════════════════════════════

export const uploadProfilePhoto = async (file) => {
  // Try compressing the image first to reduce load on network/storage
  let compressedFile = file;
  try {
    compressedFile = await compressImage(file);
    console.log(`Image compressed: original = ${(file.size/1024).toFixed(1)}KB, compressed = ${(compressedFile.size/1024).toFixed(1)}KB`);
  } catch (e) {
    console.warn("Image compression failed, using original file:", e);
  }

  // A. Try Firebase Storage first (first-party, matches database environment)
  if (isFirebaseConfigured() && storage) {
    try {
      console.log("Attempting upload to Firebase Storage...");
      const fileName = `student_photos/${Date.now()}_${file.name || 'photo.jpg'}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await withTimeout(
        uploadBytes(storageRef, compressedFile),
        15000,
        "Firebase Storage upload timed out."
      );
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log("Firebase Storage upload success:", downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.warn("Firebase Storage upload failed, trying ImgBB:", error);
    }
  }

  // B. Try ImgBB second (third-party)
  if (isImageBBConfigured()) {
    try {
      console.log("Attempting upload to ImgBB...");
      const formData = new FormData();
      formData.append("image", compressedFile, file.name || 'photo.jpg');

      const response = await withTimeout(
        fetch(`https://api.imgbb.com/1/upload?key=${IMAGEBB_API_KEY}`, {
          method: "POST",
          body: formData
        }),
        15000,
        "ImgBB upload timed out."
      );

      const result = await response.json();
      if (result.success) {
        console.log("ImgBB upload success:", result.data.url);
        return result.data.url;
      } else {
        throw new Error(result.error?.message || "ImgBB returned an error response.");
      }
    } catch (error) {
      console.warn("ImgBB upload failed, falling back to Base64:", error);
    }
  }

  // C. Fall back to Base64 (guarantees a working URL even if services are blocked or offline)
  console.log("Falling back to Base64 image data.");
  return await fileToBase64(compressedFile);
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
// 3. Get Single Student Profile → Firestore (fallback: localStorage)
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
// 4. Get All Student Profiles → Firestore (fallback: localStorage)
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
// 5. Update Student Profile → Firestore (fallback: localStorage)
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
// 6. Delete Student Profile → Firestore (fallback: localStorage)
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
  uploadProfilePhoto,
  saveStudentProfile,
  getStudentProfile,
  getAllStudentProfiles,
  updateStudentProfile,
  deleteStudentProfile
};
