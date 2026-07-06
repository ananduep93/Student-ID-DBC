import toast from './toast.js';
import { saveStudentProfile } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('student-form');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');

  // Skills Tag Elements
  const skillsInput = document.getElementById('skills-input');
  const skillsContainer = document.getElementById('skills-container');
  const skillsDataInput = document.getElementById('skills-data');
  let skillsList = [];

  // Bio Elements
  const aboutMe = document.getElementById('about-me');
  const charCounter = document.getElementById('char-counter');

  // Pre-fill / Setup inputs
  setupSkillsTags();
  setupBioCounter();

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

  // Form Validation Routine
  function validateForm() {
    let isValid = true;

    // 1. Validate name
    const name = document.getElementById('full-name');
    isValid = validateField(name, name.value.trim().length > 0) && isValid;

    // 2. Validate department
    const dept = document.getElementById('department');
    isValid = validateField(dept, dept.value !== "") && isValid;

    // 3. Phone number (10 digits)
    const phone = document.getElementById('phone-number');
    const phoneRegex = /^[6-9]\d{9}$/; // Standard Indian mobile phone validation
    isValid = validateField(phone, phoneRegex.test(phone.value.trim())) && isValid;

    // 4. Email validation
    const email = document.getElementById('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    isValid = validateField(email, emailRegex.test(email.value.trim())) && isValid;

    // Validate DOB (required)
    const dobElement = document.getElementById('dob');
    isValid = validateField(dobElement, dobElement.value !== "") && isValid;

    // Validate course year (required)
    const courseYearElement = document.getElementById('course-year');
    isValid = validateField(courseYearElement, courseYearElement.value !== "") && isValid;

    // 5. LinkedIn (Optional URL)
    const linkedin = document.getElementById('linkedin-url');
    if (linkedin.value.trim().length > 0) {
      isValid = validateField(linkedin, isValidURL(linkedin.value.trim())) && isValid;
    } else {
      clearFieldStatus(linkedin);
    }

    // 6. Optional URLs (Validate only if filled)
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

    // 7. About Me (10 - 200 chars, optional)
    const len = aboutMe.value.trim().length;
    if (len > 0) {
      isValid = validateField(aboutMe, len >= 10 && len <= 200) && isValid;
    } else {
      clearFieldStatus(aboutMe);
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
          if (l > 0) {
            validateField(input, l >= 10 && l <= 200);
          } else {
            clearFieldStatus(input);
          }
        } else {
          validateField(input, input.value.trim().length > 0);
        }
      }
    });
  });

  // Submit profile details to api layer
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.show("Please fix validation errors before submitting.", "error");
      return;
    }

    // Activate loading screen
    loadingOverlay.classList.add('active');
    loadingText.textContent = "Saving profile information...";

    try {
      // 1. Prepare payload
      const profileData = {
        fullName: document.getElementById('full-name').value.trim(),
        college: document.getElementById('college').value.trim(),
        department: document.getElementById('department').value,
        phoneNumber: document.getElementById('phone-number').value.trim(),
        email: document.getElementById('email').value.trim(),
        dob: document.getElementById('dob').value,
        courseYear: document.getElementById('course-year').value,
        linkedinUrl: document.getElementById('linkedin-url').value.trim(),
        instagramUrl: document.getElementById('instagram-url').value.trim(),
        githubUrl: document.getElementById('github-url').value.trim(),
        portfolioUrl: document.getElementById('portfolio-url').value.trim(),
        skills: skillsList,
        aboutMe: aboutMe.value.trim(),
        bloodGroup: document.getElementById('blood-group').value,
        address: document.getElementById('address').value.trim()
      };

      // 2. Save details to Firestore (or localMock)
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
  });
});
