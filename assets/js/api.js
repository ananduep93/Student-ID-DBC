import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

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

// ─── Supabase Configuration Check ────────────────────────────────────────────

const isSupabaseConfigured = () => {
  return SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_');
};

const getSupabaseHeaders = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
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

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Save Student Profile → Supabase (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const saveStudentProfile = async (profileData) => {
  const uniqueId = generateUniqueId();
  const submissionDate = new Date().toISOString();

  const studentDoc = {
    id: uniqueId,
    ...profileData,
    submissionDate
  };

  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/students`, {
          method: 'POST',
          headers: {
            ...getSupabaseHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(studentDoc)
        }),
        10000,
        "Supabase write timed out."
      );
      if (!res.ok) {
        throw new Error(`Supabase error: ${res.status} ${await res.text()}`);
      }
      console.log("Supabase: profile saved with ID:", uniqueId);
      return uniqueId;
    } catch (error) {
      console.error("Supabase save error:", error);
      throw error;
    }
  } else {
    console.log("Supabase not configured. Saving to localStorage.");
    mockDB.addProfile(studentDoc);
    return uniqueId;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Get Single Student Profile → Supabase (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const getStudentProfile = async (id) => {
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${id}&select=*`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase fetch timed out."
      );
      if (!res.ok) {
        throw new Error(`Supabase fetch failed: ${res.status}`);
      }
      const data = await res.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Supabase get error:", error);
      throw error;
    }
  } else {
    return mockDB.getProfile(id);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Get All Student Profiles → Supabase (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const getAllStudentProfiles = async () => {
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/students?select=*&order=submissionDate.desc`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase query timed out."
      );
      if (!res.ok) {
        throw new Error(`Supabase query failed: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error("Supabase getAll error:", error);
      throw error;
    }
  } else {
    return mockDB.getProfiles().sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Update Student Profile → Supabase (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const updateStudentProfile = async (id, updatedFields) => {
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            ...getSupabaseHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedFields)
        }),
        10000,
        "Supabase update timed out."
      );
      if (!res.ok) {
        throw new Error(`Supabase update failed: ${res.status} ${await res.text()}`);
      }
      return true;
    } catch (error) {
      console.error("Supabase update error:", error);
      throw error;
    }
  } else {
    return mockDB.updateProfile(id, updatedFields);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Delete Student Profile → Supabase (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const deleteStudentProfile = async (id) => {
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${id}`, {
          method: 'DELETE',
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase delete timed out."
      );
      if (!res.ok) {
        throw new Error(`Supabase delete failed: ${res.status}`);
      }
      return true;
    } catch (error) {
      console.error("Supabase delete error:", error);
      throw error;
    }
  } else {
    mockDB.deleteProfile(id);
    return true;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Get Admin Password Hash → Supabase admin_settings table
// ═══════════════════════════════════════════════════════════════════════════════

export const getAdminPasswordHash = async () => {
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/admin_settings?key=eq.admin_password&select=*`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase fetch password timed out."
      );
      if (res.status === 404) {
        console.warn("admin_settings table not found in Supabase (404). Falling back to default password.");
        return null;
      }
      if (!res.ok) {
        throw new Error(`Supabase fetch failed: ${res.status}`);
      }
      const data = await res.json();
      return data.length > 0 ? data[0].value : null;
    } catch (error) {
      console.error("Supabase get settings error, using fallback:", error);
      return null;
    }
  } else {
    return null;
  }
};

// Expose to window for debugging
window.api = {
  saveStudentProfile,
  getStudentProfile,
  getAllStudentProfiles,
  updateStudentProfile,
  deleteStudentProfile,
  getAdminPasswordHash
};
