import toast from './toast.js';
import { getAllStudentProfiles, updateStudentProfile, deleteStudentProfile } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  // Session Keys
  const AUTH_KEY = 'admin_session_auth';
  const ADMIN_PASS = 'anandu';

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

  // Search, Filter & Sort
  const searchInput = document.getElementById('search-input');
  const filterDept = document.getElementById('filter-dept');
  const sortOrder = document.getElementById('sort-order');
  const studentsList = document.getElementById('students-list');
  const emptyState = document.getElementById('table-empty-state');
  const downloadCsvBtn = document.getElementById('download-csv-btn');

  // Lightbox Modal
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxClose = document.getElementById('lightbox-close');

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

  // 1. Initial Authentication Check
  if (sessionStorage.getItem(AUTH_KEY) === 'true') {
    showDashboard();
  } else {
    showLogin();
  }

  // Login handler
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredPassword = passwordInput.value.trim();
    
    if (enteredPassword === ADMIN_PASS) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      toast.show("Verification successful. Access granted.", "success");
      passwordInput.value = '';
      showDashboard();
    } else {
      toast.show("Access Denied. Incorrect admin password.", "error");
      passwordInput.focus();
      passwordInput.select();
    }
  });

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
      studentsData = await getAllStudentProfiles();
      updateStats();
      applyFiltersAndSort();
    } catch (err) {
      console.error(err);
      toast.show("Error fetching student records: " + err.message, "error");
    } finally {
      loadingOverlay.classList.remove('active');
    }
  }

  function updateStats() {
    statTotal.textContent = studentsData.length;
    
    const aidsCount = studentsData.filter(s => s.department === 'AI & DS').length;
    statAids.textContent = aidsCount;
    
    const aviationCount = studentsData.filter(s => s.department === 'AVIATION').length;
    statAviation.textContent = aviationCount;
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
        
      const matchesDept = deptFilter === 'ALL' || student.department === deptFilter;
      
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

      const deptClass = student.department === 'AI & DS' ? 'aids' : 'aviation';
      
      tr.innerHTML = `
        <td data-label="Student Details" class="student-cell-td">
          <div class="student-cell">
            <img class="student-thumbnail" src="${student.photoUrl}" alt="${student.fullName}" title="Click to view full photo">
            <div class="student-info-mini">
              <span class="student-name-mini">${student.fullName}</span>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
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

      // Photo Lightbox trigger
      tr.querySelector('.student-thumbnail').addEventListener('click', () => {
        lightboxImage.src = student.photoUrl;
        lightboxModal.classList.add('active');
      });
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
  // Lightbox Close
  lightboxClose.addEventListener('click', () => {
    lightboxModal.classList.remove('active');
  });
  
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) {
      lightboxModal.classList.remove('active');
    }
  });

  // Edit Modal controls
  function openEditModal(student) {
    editId.value = student.id;
    editName.value = student.fullName;
    editDept.value = student.department;
    editPhone.value = student.phoneNumber;
    editEmail.value = student.email;
    editBio.value = student.aboutMe;
    
    editModal.classList.add('active');
  }

  function closeEditModal() {
    editModal.classList.remove('active');
    editForm.reset();
  }

  editModalClose.addEventListener('click', closeEditModal);
  editCancelBtn.addEventListener('click', closeEditModal);
  
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  });

  // Edit Form Save Submission
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editId.value;
    
    const updatedFields = {
      fullName: editName.value.trim(),
      department: editDept.value,
      phoneNumber: editPhone.value.trim(),
      email: editEmail.value.trim(),
      aboutMe: editBio.value.trim()
    };

    loadingOverlay.classList.add('active');
    try {
      await updateStudentProfile(id, updatedFields);
      closeEditModal();
      toast.show("Student details updated successfully.", "success");
      await loadDashboardData();
    } catch (err) {
      toast.show("Update failed: " + err.message, "error");
    } finally {
      loadingOverlay.classList.remove('active');
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
        "Phone Number", "Email", "Submission Date", "Photo URL",
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
          s.photoUrl || '',
          s.linkedinUrl || '',
          s.instagramUrl || '',
          s.githubUrl || '',
          s.portfolioUrl || '',
          Array.isArray(s.skills) ? s.skills.join("; ") : (s.skills || ''),
          s.aboutMe || ''
        ];
        csvRows.push(row.map(val => `"${val.replace(/"/g, '""')}"`).join(","));
      });

      const csvString = csvRows.join("\n");
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
});
