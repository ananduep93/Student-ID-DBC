import toast from './toast.js';
import { uploadProfilePhoto, saveStudentProfile } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  // Stepper State
  let currentStep = 1;
  const totalSteps = 2;

  // DOM Elements
  const form = document.getElementById('student-form');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const nextIcon = document.getElementById('next-icon');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');

  // Photo Upload Elements
  const photoInput = document.getElementById('photo-input');
  const uploadZone = document.getElementById('upload-zone');
  const previewContainer = document.getElementById('preview-container');
  const previewImage = document.getElementById('preview-image');
  const removePhotoBtn = document.getElementById('remove-photo-btn');
  const photoErrorMsg = document.getElementById('photo-error-msg');
  let selectedPhotoFile = null;

  // Skills Tag Elements
  const skillsInput = document.getElementById('skills-input');
  const skillsContainer = document.getElementById('skills-container');
  const skillsDataInput = document.getElementById('skills-data');
  let skillsList = [];

  // Bio Elements
  const aboutMe = document.getElementById('about-me');
  const charCounter = document.getElementById('char-counter');

  // Pre-fill / Setup inputs
  setupPhotoUpload();
  setupSkillsTags();
  setupBioCounter();

  // Navigation Event Listeners
  prevBtn.addEventListener('click', navigatePrevious);
  nextBtn.addEventListener('click', navigateNext);

  // Character counter for Bio
  function setupBioCounter() {
    aboutMe.addEventListener('input', () => {
      const length = aboutMe.value.length;
      charCounter.textContent = `${length} / 200`;
      
      if (length > 200) {
        charCounter.style.color = 'var(--accent-pink)';
      } else {
        charCounter.style.color = 'var(--text-muted)';
      }
    });
  }

  // File Upload Drag & Drop + Click logic
  function setupPhotoUpload() {
    // Click to upload
    uploadZone.addEventListener('click', () => {
      photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('dragover');
      }, false);
    });

    uploadZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    });

    // Remove photo
    removePhotoBtn.addEventListener('click', () => {
      selectedPhotoFile = null;
      photoInput.value = '';
      previewContainer.classList.remove('active');
      uploadZone.style.display = 'flex';
      
      const parentGroup = photoInput.closest('.form-group');
      parentGroup.classList.remove('success');
    });
  }

  function handleFileSelection(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = 5 * 1024 * 1024; // 5MB

    const parentGroup = photoInput.closest('.form-group');

    if (!validTypes.includes(file.type)) {
      toast.show("Please upload a valid image (JPG, PNG, or WebP).", "error");
      parentGroup.classList.add('error');
      photoErrorMsg.style.display = 'block';
      photoErrorMsg.textContent = 'Only JPG, PNG and WebP files are accepted.';
      return;
    }

    if (file.size > maxBytes) {
      toast.show("File size exceeds 5MB limit.", "error");
      parentGroup.classList.add('error');
      photoErrorMsg.style.display = 'block';
      photoErrorMsg.textContent = 'Image must be smaller than 5MB.';
      return;
    }

    selectedPhotoFile = file;
    parentGroup.classList.remove('error');
    parentGroup.classList.add('success');
    photoErrorMsg.style.display = 'none';

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      uploadZone.style.display = 'none';
      previewContainer.classList.add('active');
    };
    reader.readAsDataURL(file);
  }

  // Skills input helper
  function setupSkillsTags() {
    skillsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const value = skillsInput.value.trim().replace(/,/g, '');
        if (value && !skillsList.includes(value)) {
          addSkillTag(value);
        }
        skillsInput.value = '';
      }
    });

    // Also support adding on focusout
    skillsInput.addEventListener('focusout', () => {
      const value = skillsInput.value.trim().replace(/,/g, '');
      if (value && !skillsList.includes(value)) {
        addSkillTag(value);
      }
      skillsInput.value = '';
    });
  }

  function addSkillTag(skill) {
    skillsList.push(skill);
    skillsDataInput.value = JSON.stringify(skillsList);

    const tag = document.createElement('div');
    tag.className = 'skill-tag';
    tag.innerHTML = `
      <span>${skill}</span>
      <span class="skill-tag-remove" data-skill="${skill}">&times;</span>
    `;

    skillsContainer.insertBefore(tag, skillsInput);

    tag.querySelector('.skill-tag-remove').addEventListener('click', (e) => {
      const skillToRemove = e.target.getAttribute('data-skill');
      skillsList = skillsList.filter(s => s !== skillToRemove);
      skillsDataInput.value = JSON.stringify(skillsList);
      tag.remove();
    });
  }

  // Multi-step Navigation Logic
  function navigatePrevious() {
    if (currentStep > 1) {
      document.getElementById(`step-panel-${currentStep}`).classList.remove('active');
      document.getElementById(`step-node-${currentStep}`).classList.remove('active');
      currentStep--;
      document.getElementById(`step-panel-${currentStep}`).classList.add('active');
      updateStepperUI();
    }
  }

  function navigateNext() {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        document.getElementById(`step-panel-${currentStep}`).classList.remove('active');
        document.getElementById(`step-node-${currentStep}`).classList.add('completed');
        currentStep++;
        document.getElementById(`step-panel-${currentStep}`).classList.add('active');
        document.getElementById(`step-node-${currentStep}`).classList.add('active');
        updateStepperUI();
      } else {
        submitForm();
      }
    } else {
      toast.show("Please fix validation errors before moving forward.", "error");
    }
  }

  function updateStepperUI() {
    // Update navigation button states
    prevBtn.disabled = currentStep === 1;

    if (currentStep === totalSteps) {
      nextBtn.innerHTML = `
        Submit Profile
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      `;
    } else {
      nextBtn.innerHTML = `
        Next
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      `;
    }

    // Update progress bar width
    const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.getElementById('stepper-progress').style.width = `${progressWidth}%`;
  }

  // Validation routines per step
  function validateStep(step) {
    let isValid = true;

    if (step === 1) {
      // 1. Validate name
      const name = document.getElementById('full-name');
      isValid = validateField(name, name.value.trim().length > 0) && isValid;

      // 2. Validate photo file upload
      const parentGroup = photoInput.closest('.form-group');
      if (!selectedPhotoFile) {
        isValid = false;
        parentGroup.classList.add('error');
        photoErrorMsg.style.display = 'block';
        photoErrorMsg.textContent = 'A profile photo is required.';
      } else {
        parentGroup.classList.remove('error');
        photoErrorMsg.style.display = 'none';
      }

      // 3. Validate department
      const dept = document.getElementById('department');
      isValid = validateField(dept, dept.value !== "") && isValid;
    }

    if (step === 2) {
      // 1. Phone number (10 digits)
      const phone = document.getElementById('phone-number');
      const phoneRegex = /^[6-9]\d{9}$/; // Standard Indian mobile phone validation
      isValid = validateField(phone, phoneRegex.test(phone.value.trim())) && isValid;

      // 2. Email validation
      const email = document.getElementById('email');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      isValid = validateField(email, emailRegex.test(email.value.trim())) && isValid;

      // 3. LinkedIn (Optional URL)
      const linkedin = document.getElementById('linkedin-url');
      if (linkedin.value.trim().length > 0) {
        isValid = validateField(linkedin, isValidURL(linkedin.value.trim())) && isValid;
      } else {
        clearFieldStatus(linkedin);
      }

      // 4. Optional URLs (Validate only if filled)
      const insta = document.getElementById('instagram-url');
      if (insta.value.trim().length > 0) {
        isValid = validateField(insta, isValidURL(insta.value.trim())) && isValid;
      } else {
        clearFieldStatus(insta);
      }

      const github = document.getElementById('github-url');
      if (github.value.trim().length > 0) {
        isValid = validateField(github, isValidURL(github.value.trim())) && isValid;
      } else {
        clearFieldStatus(github);
      }

      const portfolio = document.getElementById('portfolio-url');
      if (portfolio.value.trim().length > 0) {
        isValid = validateField(portfolio, isValidURL(portfolio.value.trim())) && isValid;
      } else {
        clearFieldStatus(portfolio);
      }

      // 5. About Me (10 - 200 chars, required)
      const len = aboutMe.value.trim().length;
      isValid = validateField(aboutMe, len >= 10 && len <= 200) && isValid;
    }

    return isValid;
  }

  function validateField(inputElement, condition) {
    const formGroup = inputElement.closest('.form-group');
    if (!formGroup) return condition;

    if (condition) {
      formGroup.classList.remove('error');
      formGroup.classList.add('success');
      return true;
    } else {
      formGroup.classList.add('error');
      formGroup.classList.remove('success');
      return false;
    }
  }

  function clearFieldStatus(inputElement) {
    const formGroup = inputElement.closest('.form-group');
    if (formGroup) {
      formGroup.classList.remove('error');
      formGroup.classList.remove('success');
    }
  }

  function isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Handle live inputs to clear errors when corrected
  const allInputs = form.querySelectorAll('input, select, textarea');
  allInputs.forEach(input => {
    input.addEventListener('input', () => {
      const formGroup = input.closest('.form-group');
      if (formGroup && formGroup.classList.contains('error')) {
        // Simple instant validate triggers
        if (input.id === 'phone-number') {
          validateField(input, /^[6-9]\d{9}$/.test(input.value.trim()));
        } else if (input.id === 'email') {
          validateField(input, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()));
        } else if (input.type === 'url') {
          validateField(input, isValidURL(input.value.trim()));
        } else if (input.id === 'about-me') {
          const l = input.value.trim().length;
          validateField(input, l >= 10 && l <= 200);
        } else {
          validateField(input, input.value.trim().length > 0);
        }
      }
    });
  });

  // Submit profile details to api layer
  async function submitForm() {
    // Final check — re-validate the last step (step 2) before submitting
    if (!validateStep(2)) {
      toast.show("Please correct the form fields.", "error");
      return;
    }

    // Activate loading screen
    loadingOverlay.classList.add('active');
    loadingText.textContent = "Uploading profile photo to storage server...";

    try {
      // 1. Upload photo to ImageBB (gets URL)
      const photoUrl = await uploadProfilePhoto(selectedPhotoFile);

      // 2. Prepare payload
      loadingText.textContent = "Saving profile information...";
      const profileData = {
        fullName: document.getElementById('full-name').value.trim(),
        photoUrl: photoUrl,
        college: document.getElementById('college').value.trim(),
        department: document.getElementById('department').value,
        phoneNumber: document.getElementById('phone-number').value.trim(),
        email: document.getElementById('email').value.trim(),
        linkedinUrl: document.getElementById('linkedin-url').value.trim(),
        instagramUrl: document.getElementById('instagram-url').value.trim(),
        githubUrl: document.getElementById('github-url').value.trim(),
        portfolioUrl: document.getElementById('portfolio-url').value.trim(),
        skills: skillsList,
        aboutMe: aboutMe.value.trim()
      };

      // 3. Save details to Firestore (or localMock)
      const profileId = await saveStudentProfile(profileData);
      
      console.log("Successfully generated profile ID: ", profileId);
      
      // Delay briefly to allow complete rendering
      setTimeout(() => {
        loadingOverlay.classList.remove('active');
        // Redirect to success page
        window.location.href = './success.html';
      }, 1000);

    } catch (err) {
      console.error(err);
      loadingOverlay.classList.remove('active');
      toast.show("Submission failed: " + err.message, "error");
    }
  }
});
