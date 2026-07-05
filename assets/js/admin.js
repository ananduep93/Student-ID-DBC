import toast from './toast.js';
import { getAllStudentProfiles, updateStudentProfile, deleteStudentProfile, getAdminKeys, saveAdminLoginLog, getAdminLoginLogs, getImagebbApiKey } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  // Session Keys
  const AUTH_KEY = 'admin_session_auth';

  // State
  let studentsData = [];
  let filteredData = [];

  // DOM Elements
  const loginWrapper = document.getElementById('login-wrapper');
  const dashboardWrapper = document.getElementById('dashboard-wrapper');
  const loginForm = document.getElementById('admin-login-form');
  const passwordInput = document.getElementById('admin-password');
  const logoutBtn = document.getElementById('logout-btn');
  const loadingOverlay = document.getElementById('loading-overlay');

  // Stats Elements
  const statTotal = document.getElementById('stat-total');
  const statAids = document.getElementById('stat-aids');
  const statAviation = document.getElementById('stat-aviation');
  const statHospital = document.getElementById('stat-hospital');

  // Search, Filter & Sort
  const searchInput = document.getElementById('search-input');
  const filterDept = document.getElementById('filter-dept');
  const sortOrder = document.getElementById('sort-order');
  const studentsList = document.getElementById('students-list');
  const emptyState = document.getElementById('table-empty-state');
  const downloadCsvBtn = document.getElementById('download-csv-btn');

  // Edit Modal
  const editModal = document.getElementById('edit-modal');
  const editModalClose = document.getElementById('edit-modal-close');
  const editCancelBtn = document.getElementById('edit-cancel-btn');
  const editForm = document.getElementById('edit-student-form');
  
  // Edit Form Fields
  const editId = document.getElementById('edit-id');
  const editName = document.getElementById('edit-name');
  const editDept = document.getElementById('edit-dept');
  const editPhone = document.getElementById('edit-phone');
  const editEmail = document.getElementById('edit-email');
  const editBio = document.getElementById('edit-bio');
  const editBlood = document.getElementById('edit-blood');
  const editAddress = document.getElementById('edit-address');
  const editPhotoFile = document.getElementById('edit-photo-file');
  const editPhotoUrl = document.getElementById('edit-photo-url');
  const editPhotoPreview = document.getElementById('edit-photo-preview');
  const editPhotoPlaceholder = document.getElementById('edit-photo-placeholder');
  const editLinkedin = document.getElementById('edit-linkedin');
  const editInstagram = document.getElementById('edit-instagram');
  const editGithub = document.getElementById('edit-github');
  const editPortfolio = document.getElementById('edit-portfolio');
  const editSkills = document.getElementById('edit-skills');

  // 1. Initial Authentication Check
  if (sessionStorage.getItem(AUTH_KEY) === 'true') {
    showDashboard();
  } else {
    showLogin();
  }

  // Helper to hash password using SHA-256
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPassword = passwordInput.value.trim();
    
    loadingOverlay.classList.add('active');
    try {
      const keys = await getAdminKeys();
      const storedAdminHash = (keys && keys.admin_password) || "1785cfc3bc6ac7738e8b38cdccd1af12563c2b9070e07af336a1bf8c0f772b6a";
      const storedMonitorHash = (keys && keys.monitor_key) || "f2cd852e505f1084fe70fea3c0f4d577df89414bd356f43c7ae3a29e9e628553";

      const enteredHash = await sha256(enteredPassword);
      
      if (enteredHash === storedMonitorHash) {
        try {
          const logins = await getAdminLoginLogs();
          // Sort newest logins first
          logins.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          showAdminLoginsModal(logins);
        } catch (err) {
          console.error(err);
          toast.show("Error checking active logins: " + err.message, "error");
        } finally {
          loadingOverlay.classList.remove('active');
          passwordInput.value = '';
        }
      } else if (enteredHash === storedAdminHash) {
        let adminName = prompt("Please enter your name for the login audit log:");
        if (adminName === null) {
          // User clicked cancel
          passwordInput.value = '';
          loadingOverlay.classList.remove('active');
          return;
        }
        adminName = adminName.trim();
        if (adminName === "") {
          adminName = "Anonymous Admin";
        }

        const deviceFriendly = parseUserAgent(navigator.userAgent);
        try {
          await saveAdminLoginLog(adminName, deviceFriendly);
        } catch (logErr) {
          console.warn("Failed to save admin login log to Supabase:", logErr);
          toast.show("Warning: Logged in (Database logging failed: 401).", "warning");
        }

        sessionStorage.setItem(AUTH_KEY, 'true');
        toast.show("Verification successful. Access granted.", "success");
        passwordInput.value = '';
        showDashboard();
      } else {
        toast.show("Access Denied. Incorrect admin password.", "error");
        passwordInput.focus();
        passwordInput.select();
      }
    } catch (err) {
      console.error(err);
      toast.show("Failed to verify password: " + err.message, "error");
    } finally {
      loadingOverlay.classList.remove('active');
    }
  });

  // Helper to parse User Agent into friendly format
  function parseUserAgent(ua) {
    if (!ua) return "Unknown Device";
    let browser = "Browser";
    let os = "Device";

    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";
    
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("Linux")) os = "Linux";

    return `${browser} on ${os}`;
  }

  // Active Logins Modal Helper
  function showAdminLoginsModal(logins) {
    const existing = document.getElementById('active-users-modal');
    if (existing) existing.remove();

    // Deduplicate logins by admin name (case-insensitive) - only keep the newest login
    const uniqueLogins = [];
    const seenNames = new Set();
    logins.forEach(login => {
      const nameKey = (login.name || "").trim().toLowerCase();
      if (nameKey && !seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        uniqueLogins.push(login);
      }
    });

    const modal = document.createElement('div');
    modal.id = 'active-users-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
    modal.style.backdropFilter = 'blur(16px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '100000';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';

    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.maxWidth = '420px';
    card.style.width = '90%';
    card.style.padding = '30px';
    card.style.textAlign = 'center';
    card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
    card.style.border = '1px solid rgba(255, 255, 255, 0.4)';

    const title = document.createElement('h2');
    title.textContent = 'Admin Panel Logins';
    title.style.fontFamily = "'Outfit', sans-serif";
    title.style.fontSize = '1.5rem';
    title.style.color = '#0c2340';
    title.style.marginBottom = '12px';

    const countText = document.createElement('p');
    countText.style.fontSize = '1.05rem';
    countText.style.color = '#475569';
    countText.style.marginBottom = '24px';
    countText.innerHTML = `Total recorded admin entries: <strong style="color: #A50034; font-size: 1.3rem;">${uniqueLogins.length}</strong>`;

    const viewButton = document.createElement('button');
    viewButton.className = 'btn btn-primary';
    viewButton.style.width = '100%';
    viewButton.style.marginBottom = '12px';
    viewButton.textContent = 'Click to show who';

    const userListContainer = document.createElement('div');
    userListContainer.style.display = 'none';
    userListContainer.style.maxHeight = '240px';
    userListContainer.style.overflowY = 'auto';
    userListContainer.style.textAlign = 'left';
    userListContainer.style.marginTop = '15px';
    userListContainer.style.marginBottom = '20px';
    userListContainer.style.padding = '10px';
    userListContainer.style.background = 'rgba(15, 76, 129, 0.04)';
    userListContainer.style.borderRadius = '12px';
    userListContainer.style.border = '1px solid rgba(15, 76, 129, 0.08)';

    if (uniqueLogins.length === 0) {
      viewButton.disabled = true;
      viewButton.style.opacity = '0.6';
      viewButton.style.cursor = 'not-allowed';
    } else {
      uniqueLogins.forEach(login => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '12px';
        row.style.padding = '10px 0';
        row.style.borderBottom = '1px solid rgba(0,0,0,0.06)';
        if (login === uniqueLogins[uniqueLogins.length - 1]) {
          row.style.borderBottom = 'none';
        }

        // Avatar Frame (Visual Key Icon)
        const avatar = document.createElement('div');
        avatar.style.width = '36px';
        avatar.style.height = '36px';
        avatar.style.borderRadius = '50%';
        avatar.style.overflow = 'hidden';
        avatar.style.background = '#0c2340';
        avatar.style.color = '#ffffff';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.flexShrink = '0';
        avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>`;

        const info = document.createElement('div');
        info.style.display = 'flex';
        info.style.flexDirection = 'column';
        
        const name = document.createElement('span');
        name.textContent = login.name || "Anonymous Admin";
        name.style.fontSize = '13.5px';
        name.style.fontWeight = '700';
        name.style.color = '#1e293b';

        // Format Date Time nicely
        let dateStr = 'N/A';
        if (login.created_at) {
          const d = new Date(login.created_at);
          dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        }

        const details = document.createElement('span');
        details.textContent = `${login.device || "Unknown Device"} • ${dateStr}`;
        details.style.fontSize = '10.5px';
        details.style.color = '#64748b';

        info.appendChild(name);
        info.appendChild(details);
        row.appendChild(avatar);
        row.appendChild(info);
        userListContainer.appendChild(row);
      });
    }

    viewButton.addEventListener('click', () => {
      viewButton.style.display = 'none';
      userListContainer.style.display = 'block';
    });

    const closeButton = document.createElement('button');
    closeButton.className = 'btn btn-secondary';
    closeButton.style.width = '100%';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    });

    card.appendChild(title);
    card.appendChild(countText);
    card.appendChild(viewButton);
    card.appendChild(userListContainer);
    card.appendChild(closeButton);
    modal.appendChild(card);
    document.body.appendChild(modal);

    setTimeout(() => {
      modal.style.opacity = '1';
    }, 10);
  }

  // Logout handler
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    showLogin();
    toast.show("Logged out of session.", "info");
  });

  function showLogin() {
    loginWrapper.style.display = 'flex';
    dashboardWrapper.classList.remove('active');
    logoutBtn.style.display = 'none';
  }

  async function showDashboard() {
    loginWrapper.style.display = 'none';
    dashboardWrapper.classList.add('active');
    logoutBtn.style.display = 'flex';
    await loadDashboardData();
  }

  // 2. Fetch and render dashboard
  async function loadDashboardData() {
    loadingOverlay.classList.add('active');
    try {
      const rawData = await getAllStudentProfiles();
      const studentOnlyData = rawData.filter(item => item.department !== 'ADMIN_LOG');
      studentsData = deduplicateStudents(studentOnlyData);
      updateStats();
      applyFiltersAndSort();
    } catch (err) {
      console.error(err);
      toast.show("Error fetching student records: " + err.message, "error");
    } finally {
      loadingOverlay.classList.remove('active');
    }
  }

  function deduplicateStudents(data) {
    const uniqueMap = new Map();
    const duplicatesToDelete = [];

    // Group duplicates, sorting by submission date descending so newer is first
    const sorted = [...data].sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));

    const cleanData = [];

    for (const student of sorted) {
      const nameKey = (student.fullName || "").trim().toLowerCase();
      const deptKey = (student.department || "").trim().toLowerCase();
      const uniqueKey = `${nameKey}|${deptKey}`;

      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, student);
        cleanData.push(student);
      } else {
        duplicatesToDelete.push(student);
      }
    }

    // Background database cleanup of duplicate rows
    if (duplicatesToDelete.length > 0) {
      console.log(`Found ${duplicatesToDelete.length} duplicates. Cleaning up database...`);
      cleanupDuplicatesFromDatabase(duplicatesToDelete);
    }

    return cleanData;
  }

  async function cleanupDuplicatesFromDatabase(duplicates) {
    for (const dup of duplicates) {
      try {
        await deleteStudentProfile(dup.id);
        console.log(`Successfully deleted duplicate row from Supabase: ${dup.fullName} (${dup.id})`);
      } catch (err) {
        console.error(`Failed to delete duplicate row ${dup.id} from Supabase:`, err);
      }
    }
  }

  function updateStats() {
    statTotal.textContent = studentsData.length;
    
    const aidsCount = studentsData.filter(s => 
      s.department === 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE' || s.department === 'AI & DS'
    ).length;
    statAids.textContent = aidsCount;
    
    const aviationCount = studentsData.filter(s => 
      s.department === 'AVIATION & LOGISTICS' || s.department === 'AVIATION'
    ).length;
    statAviation.textContent = aviationCount;

    const hospitalCount = studentsData.filter(s => 
      s.department === 'HOSPITAL ADMINISTRATION & HEALTH CARE MANAGEMENT'
    ).length;
    statHospital.textContent = hospitalCount;
  }

  // Search & Filters listener
  searchInput.addEventListener('input', applyFiltersAndSort);
  filterDept.addEventListener('change', applyFiltersAndSort);
  sortOrder.addEventListener('change', applyFiltersAndSort);

  function applyFiltersAndSort() {
    const search = searchInput.value.trim().toLowerCase();
    const deptFilter = filterDept.value;
    const sort = sortOrder.value;

    // Filter
    filteredData = studentsData.filter(student => {
      const matchesSearch = 
        student.fullName.toLowerCase().includes(search) ||
        student.email.toLowerCase().includes(search);
        
      let matchesDept = false;
      if (deptFilter === 'ALL') {
        matchesDept = true;
      } else if (deptFilter === 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE') {
        matchesDept = student.department === 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE' || student.department === 'AI & DS';
      } else if (deptFilter === 'AVIATION & LOGISTICS') {
        matchesDept = student.department === 'AVIATION & LOGISTICS' || student.department === 'AVIATION';
      } else {
        matchesDept = student.department === deptFilter;
      }
      
      return matchesSearch && matchesDept;
    });

    // Sort
    if (sort === 'NEWEST') {
      filteredData.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
    } else if (sort === 'OLDEST') {
      filteredData.sort((a, b) => new Date(a.submissionDate) - new Date(b.submissionDate));
    } else if (sort === 'ALPHA') {
      filteredData.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    renderStudents();
  }

  function renderStudents() {
    studentsList.innerHTML = '';
    
    if (filteredData.length === 0) {
      emptyState.style.display = 'flex';
      return;
    }
    
    emptyState.style.display = 'none';

    filteredData.forEach(student => {
      const tr = document.createElement('tr');
      
      // Formatting Date Time
      let formattedDate = 'N/A';
      if (student.submissionDate) {
        const d = new Date(student.submissionDate);
        formattedDate = d.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
      }

      let deptClass = 'aviation';
      if (student.department === 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE') {
        deptClass = 'aids';
      } else if (student.department === 'HOSPITAL ADMINISTRATION & HEALTH CARE MANAGEMENT') {
        deptClass = 'hospital';
      }
      const initialLetter = student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S';
      
      // Check if student has an uploaded photoUrl
      const hasPhoto = student.photoUrl && student.photoUrl.startsWith('http');
      const avatarHTML = hasPhoto
        ? `<img class="student-thumbnail" src="${student.photoUrl}" alt="${student.fullName}" style="object-fit: cover; width: 44px; height: 44px; border-radius: 6px; border: 2px solid var(--glass-border);">`
        : `<div class="student-thumbnail" title="Student Avatar">${initialLetter}</div>`;
      
      tr.innerHTML = `
        <td data-label="Student Details" class="student-cell-td">
          <div class="student-cell">
            ${avatarHTML}
            <div class="student-info-mini">
              <a href="./qr.html?id=${student.id}" class="student-name-link" title="View Student QR Code">${student.fullName}</a>
              <span class="student-reg-mini">Submitted: ${formattedDate}</span>
            </div>
          </div>
        </td>
        <td data-label="Department">
          <span class="dept-badge ${deptClass}">${student.department}</span>
        </td>
        <td data-label="Contact">
          <div style="display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.85rem;">
            <span>📞 ${student.phoneNumber}</span>
            <span>✉️ ${student.email}</span>
          </div>
        </td>
        <td data-label="Actions" class="actions-cell-td">
          <div class="actions-cell">
            
            <button class="btn btn-icon view-profile-btn" data-id="${student.id}" title="Open Profile Link">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
            
            <button class="btn btn-icon copy-link-btn" data-id="${student.id}" title="Copy Profile Link">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            
            <button class="btn btn-icon upload-photo-btn" data-id="${student.id}" title="Upload Profile Photo">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            </button>
            
            <button class="btn btn-icon edit-btn" data-id="${student.id}" title="Edit Profile Details">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            
            <button class="btn btn-icon delete-btn" data-id="${student.id}" title="Delete Record">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
            
          </div>
        </td>
      `;
      
      studentsList.appendChild(tr);
    });

    // Wire up actions
    setupRowActionHandlers();
  }

  function setupRowActionHandlers() {
    // Open Profile
    document.querySelectorAll('.view-profile-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const url = getProfileURL(id);
        window.open(url, '_blank');
      });
    });

    // Copy Profile Link
    document.querySelectorAll('.copy-link-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const url = getProfileURL(id);
        
        navigator.clipboard.writeText(url).then(() => {
          toast.show("Profile link copied to clipboard!", "success");
        }).catch(err => {
          toast.show("Could not copy link: " + err, "error");
        });
      });
    });

    // Edit Profile Modal Trigger
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const student = studentsData.find(s => s.id === id);
        if (student) {
          openEditModal(student);
        }
      });
    });

    // Delete Record Trigger
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const student = studentsData.find(s => s.id === id);
        
        if (student && confirm(`Are you sure you want to permanently delete the profile of ${student.fullName}? This cannot be undone.`)) {
          loadingOverlay.classList.add('active');
          try {
            await deleteStudentProfile(id);
            toast.show("Record deleted successfully.", "success");
            await loadDashboardData();
          } catch (err) {
            toast.show("Deletion failed: " + err.message, "error");
          } finally {
            loadingOverlay.classList.remove('active');
          }
        }
      });
    });
  }

  function getProfileURL(id) {
    // Build profile URL based on current host context
    const loc = window.location;
    const pathSegments = loc.pathname.split('/');
    pathSegments[pathSegments.length - 1] = 'profile.html';
    const newPathName = pathSegments.join('/');
    return `${loc.protocol}//${loc.host}${newPathName}?id=${id}`;
  }

  // 3. Modals handling
  // Edit Modal controls
  function openEditModal(student) {
    editId.value = student.id;
    editName.value = student.fullName;
    editDept.value = student.department;
    editPhone.value = student.phoneNumber;
    editEmail.value = student.email;
    editBio.value = student.aboutMe || "";
    editBlood.value = student.bloodGroup || "";
    editAddress.value = student.address || "";
    editLinkedin.value = student.linkedinUrl || "";
    editInstagram.value = student.instagramUrl || "";
    editGithub.value = student.githubUrl || "";
    editPortfolio.value = student.portfolioUrl || "";
    
    // Parse skills array
    let skillsString = "";
    if (student.skills) {
      try {
        const parsed = typeof student.skills === 'string' ? JSON.parse(student.skills) : student.skills;
        if (Array.isArray(parsed)) {
          skillsString = parsed.join(', ');
        }
      } catch (e) {
        skillsString = student.skills.toString();
      }
    }
    editSkills.value = skillsString;
    
    editPhotoFile.value = "";
    editPhotoUrl.value = student.photoUrl || "";
    
    if (student.photoUrl) {
      editPhotoPreview.src = student.photoUrl;
      editPhotoPreview.style.display = "block";
      editPhotoPlaceholder.style.display = "none";
    } else {
      editPhotoPreview.style.display = "none";
      editPhotoPlaceholder.style.display = "flex";
    }
    
    editModal.classList.add('active');
  }

  function closeEditModal() {
    editModal.classList.remove('active');
    editForm.reset();
  }

  editModalClose.addEventListener('click', closeEditModal);
  editCancelBtn.addEventListener('click', closeEditModal);

  editPhotoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        editPhotoPreview.src = event.target.result;
        editPhotoPreview.style.display = 'block';
        editPhotoPlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });
  
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  });

  // Edit Form Save Submission
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editId.value;
    
    // Split and map comma-separated skills
    const skillsArray = editSkills.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const updatedFields = {
      fullName: editName.value.trim(),
      department: editDept.value,
      phoneNumber: editPhone.value.trim(),
      email: editEmail.value.trim(),
      aboutMe: editBio.value.trim(),
      bloodGroup: editBlood.value,
      address: editAddress.value.trim(),
      photoUrl: editPhotoUrl.value.trim(),
      linkedinUrl: editLinkedin.value.trim(),
      instagramUrl: editInstagram.value.trim(),
      githubUrl: editGithub.value.trim(),
      portfolioUrl: editPortfolio.value.trim(),
      skills: skillsArray
    };

    loadingOverlay.classList.add('active');
    const loadingText = document.getElementById('loading-text');
    
    try {
      // Check if a new file is chosen for upload
      const file = editPhotoFile.files[0];
      if (file) {
        if (loadingText) {
          loadingText.textContent = "Uploading new photo to ImgBB...";
        }
        
        const formData = new FormData();
        formData.append("image", file);
        
        const apiKey = await getImagebbApiKey();
        if (!apiKey) {
          throw new Error("ImgBB API key not configured in passwords table.");
        }

        // Timeout set to 60 seconds (60000ms) to prevent timeout failures on slow connections
        const response = await Promise.race([
          fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("ImgBB upload timed out.")), 60000))
        ]);

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error?.message || "Failed to upload to ImgBB.");
        }
        updatedFields.photoUrl = result.data.url;
      }

      if (loadingText) {
        loadingText.textContent = "Saving changes to student profile...";
      }
      await updateStudentProfile(id, updatedFields);
      closeEditModal();
      toast.show("Student details updated successfully.", "success");
      await loadDashboardData();
    } catch (err) {
      toast.show("Update failed: " + err.message, "error");
    } finally {
      loadingOverlay.classList.remove('active');
      if (loadingText) {
        loadingText.textContent = "Processing details...";
      }
    }
  });

  // 4. CSV Exporter
  downloadCsvBtn.addEventListener('click', () => {
    if (filteredData.length === 0) {
      toast.show("No student records available to export.", "error");
      return;
    }

    try {
      const headers = [
        "ID", "Full Name", "College", "Department",
        "Phone Number", "Email", "Submission Date",
        "LinkedIn", "Instagram", "GitHub", "Portfolio", "Skills", "Bio"
      ];

      const csvRows = [];
      csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

      filteredData.forEach(s => {
        const row = [
          s.id || '',
          s.fullName || '',
          s.college || '',
          s.department || '',
          s.phoneNumber || '',
          s.email || '',
          s.submissionDate || '',
          s.linkedinUrl || '',
          s.instagramUrl || '',
          s.githubUrl || '',
          s.portfolioUrl || '',
          Array.isArray(s.skills) ? s.skills.join("; ") : (s.skills || ''),
          (s.aboutMe || '').replace(/[\r\n]+/g, ' ')
        ];
        csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
      });

      const csvString = csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '_');
      link.setAttribute("href", url);
      link.setAttribute("download", `student_profiles_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.show("CSV Export downloaded successfully.", "success");
    } catch (err) {
      toast.show("Failed to export data: " + err.message, "error");
    }
  });

  // 5. Admin Photo Upload Feature
  const photoUploadInput = document.getElementById('admin-photo-upload-input');
  let activeStudentIdForUpload = null;

  // Track active student on click of upload-photo-btn
  document.addEventListener('click', (e) => {
    const uploadBtn = e.target.closest('.upload-photo-btn');
    if (uploadBtn) {
      activeStudentIdForUpload = uploadBtn.getAttribute('data-id');
      photoUploadInput.click();
    }
  });

  photoUploadInput.addEventListener('change', async (e) => {
    if (!activeStudentIdForUpload || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const studentId = activeStudentIdForUpload;
    
    // Reset file input and tracking variable
    photoUploadInput.value = '';
    activeStudentIdForUpload = null;

    // Validate file type & size (5MB max)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.show("Please upload a valid image file (JPG, PNG, or WebP).", "error");
      return;
    }
    
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.show("File size exceeds 5MB limit.", "error");
      return;
    }

    loadingOverlay.classList.add('active');
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
      loadingText.textContent = "Uploading photo to ImgBB...";
    }

    try {
      // Create Form Data for ImgBB API
      const formData = new FormData();
      formData.append("image", file);

      const apiKey = await getImagebbApiKey();
      if (!apiKey) {
        throw new Error("ImgBB API key not configured in passwords table.");
      }

      // Perform POST fetch to ImgBB
      const response = await Promise.race([
        fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: "POST",
          body: formData
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("ImgBB upload timed out.")), 60000))
      ]);

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to upload to ImgBB.");
      }

      const imageUrl = result.data.url;

      // Update student profile document in Firestore
      if (loadingText) {
        loadingText.textContent = "Saving image link to student profile...";
      }
      await updateStudentProfile(studentId, { photoUrl: imageUrl });

      toast.show("Profile image uploaded successfully!", "success");
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      toast.show("Upload failed: " + err.message, "error");
    } finally {
      loadingOverlay.classList.remove('active');
    }
  });
});
