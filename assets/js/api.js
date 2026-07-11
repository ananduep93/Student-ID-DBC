import { SUPABASE_URL, SUPABASE_ANON_KEY, IMAGEBB_API_KEY } from './config.js';

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

  const table = profileData.courseYear || '2025-2029';

  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
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
      console.log(`Supabase: profile saved with ID ${uniqueId} in table ${table}`);
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
  // First check if we have the student in the local cache across all batches
  const cached1 = localStorage.getItem('student_profiles_2025-2029');
  const cached2 = localStorage.getItem('student_profiles_2026-2030');
  let student = null;
  let batch = '2025-2029';

  if (cached1) {
    try {
      const data = JSON.parse(cached1);
      student = Array.isArray(data) ? data.find(item => item.id === id) : null;
      if (student) batch = '2025-2029';
    } catch (e) {
      console.warn("Error parsing cache 2025-2029:", e);
    }
  }
  if (!student && cached2) {
    try {
      const data = JSON.parse(cached2);
      student = Array.isArray(data) ? data.find(item => item.id === id) : null;
      if (student) batch = '2026-2030';
    } catch (e) {
      console.warn("Error parsing cache 2026-2030:", e);
    }
  }

  // Fallback: check legacy cache
  if (!student) {
    const legacyCached = localStorage.getItem('student_profiles');
    if (legacyCached) {
      try {
        const data = JSON.parse(legacyCached);
        student = Array.isArray(data) ? data.find(item => item.id === id) : null;
      } catch (e) {
        console.warn("Error parsing legacy cache:", e);
      }
    }
  }

  if (student) {
    // Return instantly from local cache, revalidate in background
    setTimeout(() => {
      fetch(`${SUPABASE_URL}/rest/v1/${batch}?id=eq.${id}&select=*`, {
        headers: getSupabaseHeaders()
      }).then(res => res.json()).then(newData => {
        if (newData.length > 0) {
          const cacheKey = `student_profiles_${batch}`;
          const currentData = JSON.parse(localStorage.getItem(cacheKey) || '[]');
          const idx = currentData.findIndex(item => item.id === id);
          if (idx !== -1) {
            currentData[idx] = newData[0];
            localStorage.setItem(cacheKey, JSON.stringify(currentData));
          }
        }
      }).catch(err => console.warn("Background revalidation failed:", err));
    }, 10);
    return student;
  }

  if (isSupabaseConfigured()) {
    try {
      // First try to fetch from 2025-2029
      let res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/2025-2029?id=eq.${id}&select=*`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase fetch timed out."
      );
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) return data[0];
      }

      // If not found, try 2026-2030
      res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/2026-2030?id=eq.${id}&select=*`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase fetch timed out."
      );
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) return data[0];
      }
      return null;
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

export const getAllStudentProfiles = async (batch = '2025-2029') => {
  const table = batch;
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=submissionDate.desc`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase query timed out."
      );
      if (!res.ok) {
        throw new Error(`Supabase query failed: ${res.status}`);
      }
      const data = await res.json();
      // Cache data in localStorage under specific batch key
      localStorage.setItem(`student_profiles_${batch}`, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error(`Supabase getAll error for table ${table}, falling back to local cache:`, error);
      const cached = localStorage.getItem(`student_profiles_${batch}`);
      if (cached) {
        return JSON.parse(cached);
      }
      throw error;
    }
  } else {
    // Mock DB fallback - filter by courseYear
    return mockDB.getProfiles()
      .filter(p => p.courseYear === batch)
      .sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Update Student Profile → Supabase (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const updateStudentProfile = async (id, updatedFields, batch = '2025-2029') => {
  const table = batch;
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
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

export const deleteStudentProfile = async (id, batch = '2025-2029') => {
  const table = batch;
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
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
// 5.5. Get Student Profiles By Name → Supabase (fallback: localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

export const getStudentProfilesByName = async (fullName, batch = '2025-2029') => {
  const table = batch;
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/${table}?fullName=eq.${encodeURIComponent(fullName)}&select=*`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase fetch by name timed out."
      );
      if (!res.ok) {
        throw new Error(`Supabase query failed: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error("Supabase getStudentProfilesByName error, falling back to local cache:", error);
      const cached = localStorage.getItem(`student_profiles_${batch}`);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (Array.isArray(data)) {
            return data.filter(s => (s.fullName || "").trim().toLowerCase() === fullName.trim().toLowerCase());
          }
        } catch (e) {
          console.warn("Error parsing cache:", e);
        }
      }
      return [];
    }
  } else {
    return mockDB.getProfiles().filter(p => 
      p.courseYear === batch && 
      (p.fullName || "").trim().toLowerCase() === fullName.trim().toLowerCase()
    );
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Get Admin Configuration Keys → Supabase passwords table
// ═══════════════════════════════════════════════════════════════════════════════

export const getAdminKeys = async () => {
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/passwords?id=in.(admin_password,monitor_key)&select=*`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase fetch keys timed out."
      );
      if (res.status === 404) {
        console.warn("passwords table not found in Supabase (404).");
        return null;
      }
      if (!res.ok) {
        throw new Error(`Supabase fetch failed: ${res.status}`);
      }
      const data = await res.json();
      const keys = {};
      data.forEach(row => {
        keys[row.id] = row.password;
      });
      return keys;
    } catch (error) {
      console.error("Supabase get admin keys error, using fallback:", error);
      return null;
    }
  } else {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Save Admin Login Log → Supabase passwords table
// ═══════════════════════════════════════════════════════════════════════════════

export const saveAdminLoginLog = async (name, device) => {
  if (isSupabaseConfigured()) {
    const logId = "log_" + generateUniqueId();
    const logDoc = {
      id: logId,
      name: name,
      device: device,
      created_at: new Date().toISOString()
    };
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/passwords`, {
          method: 'POST',
          headers: {
            ...getSupabaseHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(logDoc)
        }),
        10000,
        "Supabase write log timed out."
      );
      if (!res.ok) {
        throw new Error(`Supabase log failed: ${res.status}`);
      }
      return true;
    } catch (error) {
      console.error("Supabase write log error:", error);
      throw error;
    }
  } else {
    return true;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Get Admin Login Logs → Supabase passwords table
// ═══════════════════════════════════════════════════════════════════════════════

export const getAdminLoginLogs = async () => {
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/passwords?name=not.is.null&select=*`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase fetch logs timed out."
      );
      if (res.status === 404) {
        console.warn("passwords table not found in Supabase (404) for logs.");
        return [];
      }
      if (!res.ok) {
        throw new Error(`Supabase logs failed: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error("Supabase get logs error:", error);
      throw error;
    }
  } else {
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Get ImageBB API Key → Supabase passwords table
// ═══════════════════════════════════════════════════════════════════════════════

export const getImagebbApiKey = async () => {
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/passwords?id=eq.imagebb_api_key&select=*`, {
          headers: getSupabaseHeaders()
        }),
        10000,
        "Supabase fetch api key timed out."
      );
      if (res.status === 404) {
        console.warn("passwords table not found in Supabase (404) for imagebb_api_key.");
        return IMAGEBB_API_KEY || null;
      }
      if (!res.ok) {
        throw new Error(`Supabase fetch failed: ${res.status}`);
      }
      const data = await res.json();
      return (data.length > 0 && data[0].password) ? data[0].password : (IMAGEBB_API_KEY || null);
    } catch (error) {
      console.error("Supabase get API key error, using fallback:", error);
      return IMAGEBB_API_KEY || null;
    }
  } else {
    return IMAGEBB_API_KEY || null;
  }
};

// Expose to window for debugging
window.api = {
  saveStudentProfile,
  getStudentProfile,
  getAllStudentProfiles,
  updateStudentProfile,
  deleteStudentProfile,
  getAdminKeys,
  saveAdminLoginLog,
  getAdminLoginLogs,
  getImagebbApiKey
};
