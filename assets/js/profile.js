import toast from './toast.js';
import { getStudentProfile } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Query parameter extraction
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('id');

  // DOM Views
  const loadingView = document.getElementById('loading-view');
  const errorView = document.getElementById('error-view');
  const profileView = document.getElementById('profile-view');

  // Data Elements
  const profileFullName = document.getElementById('profile-full-name');

  const profileImg = document.getElementById('profile-img');
  const profileAvatar = document.getElementById('profile-avatar');
  const profileCollege = document.getElementById('profile-college');
  const profileDept = document.getElementById('profile-dept');
  const profileYear = document.getElementById('profile-year');
  const detailsCollapsibleWrapper = document.getElementById('details-collapsible-wrapper');
  const detailsTrigger = document.getElementById('details-trigger');
  const detailsContent = document.getElementById('details-content');
  const detailRowBio = document.getElementById('detail-row-bio');
  const detailValBio = document.getElementById('detail-val-bio');
  const detailRowBlood = document.getElementById('detail-row-blood');
  const detailValBlood = document.getElementById('detail-val-blood');
  const detailRowAddress = document.getElementById('detail-row-address');
  const detailValAddress = document.getElementById('detail-val-address');
  const profileSkills = document.getElementById('profile-skills');
  const skillsSection = document.getElementById('skills-section');

  // Action Anchors
  const contactPhone = document.getElementById('contact-phone');
  const contactEmail = document.getElementById('contact-email');

  const socialLinkedin = document.getElementById('social-linkedin');
  const socialInstagram = document.getElementById('social-instagram');
  const socialWhatsapp = document.getElementById('social-whatsapp');
  const socialGithub = document.getElementById('social-github');
  const socialPortfolio = document.getElementById('social-portfolio');

  // Lightbox Elements
  const lightbox = document.getElementById('photo-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const closeBtn = document.querySelector('.lightbox-close');
  const photoContainer = document.getElementById('open-lightbox-trigger');

  // 1. Validate ID exists
  if (!studentId) {
    showError();
    return;
  }

  // 2. Fetch Student record
  try {
    const student = await getStudentProfile(studentId);
    if (!student) {
      showError();
      return;
    }
    renderProfileCard(student);
  } catch (err) {
    console.error(err);
    toast.show("Failed to load profile: " + err.message, "error");
    showError();
  }

  function showError() {
    loadingView.style.display = 'none';
    profileView.style.display = 'none';
    errorView.style.display = 'flex';
  }

  // 3. Render Profile
  function renderProfileCard(student) {
    profileFullName.textContent = student.fullName || "Student Profile";
    


    // Set College Name (Only display if entered)
    if (student.college && student.college.trim() !== "") {
      profileCollege.textContent = student.college.toUpperCase();
      profileCollege.style.display = 'block';
    } else {
      profileCollege.style.display = 'none';
    }

    // Set Department directly
    if (student.department === "AI & DS") {
      profileDept.textContent = "AI & DS";
    } else if (student.department === "AVIATION") {
      profileDept.textContent = "AVIATION AND LOGISTICS";
    } else {
      profileDept.textContent = student.department ? student.department.toUpperCase() : "";
    }

    // Set dynamic academic year range based on submission date (default 4-year span, e.g. 2024 — 2028)
    const startYear = student.submissionDate ? new Date(student.submissionDate).getFullYear() : 2024;
    const endYear = startYear + 4;
    profileYear.textContent = `${startYear} — ${endYear}`;

    // Render photo or default initials-based avatar
    const hasPhoto = student.photoUrl && student.photoUrl.startsWith('http');
    if (hasPhoto) {
      profileImg.src = student.photoUrl;
      profileImg.style.display = 'block';
      profileAvatar.style.display = 'none';
      
      // Enable Lightbox Trigger
      photoContainer.style.cursor = 'zoom-in';
      photoContainer.addEventListener('click', () => {
        lightbox.style.display = 'block';
        lightboxImg.src = student.photoUrl;
      });
    } else {
      profileImg.style.display = 'none';
      const initialLetter = student.fullName ? student.fullName.trim().charAt(0).toUpperCase() : 'S';
      profileAvatar.textContent = initialLetter;
      profileAvatar.style.display = 'flex';
      photoContainer.style.cursor = 'default';
    }

    // 3D Tilt Parallax Animation
    setup3DTiltEffect();

    // Personal Details Collapsible Render
    let hasPersonalDetails = false;

    // 1. Bio
    if (student.aboutMe && student.aboutMe.trim() !== "") {
      detailValBio.textContent = student.aboutMe;
      detailRowBio.style.display = 'flex';
      hasPersonalDetails = true;
    } else {
      detailRowBio.style.display = 'none';
    }

    // 2. Blood Group
    if (student.bloodGroup && student.bloodGroup.trim() !== "") {
      detailValBlood.textContent = student.bloodGroup;
      detailRowBlood.style.display = 'flex';
      hasPersonalDetails = true;
    } else {
      detailRowBlood.style.display = 'none';
    }

    // 3. Address
    if (student.address && student.address.trim() !== "") {
      detailValAddress.textContent = student.address;
      detailRowAddress.style.display = 'flex';
      hasPersonalDetails = true;
    } else {
      detailRowAddress.style.display = 'none';
    }

    // Toggle Collapsible Section Visibility
    if (hasPersonalDetails) {
      detailsCollapsibleWrapper.style.display = 'block';
      setupCollapsibleAccordion();
    } else {
      detailsCollapsibleWrapper.style.display = 'none';
    }

    // Skills Render (using .skill-tag class)
    profileSkills.innerHTML = '';
    const skillsArray = Array.isArray(student.skills) ? student.skills : [];
    if (skillsArray.length > 0) {
      skillsSection.style.display = 'block';
      skillsArray.forEach(skill => {
        const span = document.createElement('span');
        span.className = 'skill-tag';
        span.textContent = skill;
        profileSkills.appendChild(span);
      });
    } else {
      skillsSection.style.display = 'none';
    }

    // Click to Call / Email setups
    contactPhone.href = `tel:${student.phoneNumber}`;
    contactEmail.href = `mailto:${student.email}`;

    // WhatsApp dynamic link construction (links to wa.me)
    if (student.phoneNumber && student.phoneNumber.trim() !== "") {
      const cleanPhone = student.phoneNumber.replace(/\D/g, '');
      const prefixedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      socialWhatsapp.href = `https://wa.me/${prefixedPhone}`;
      socialWhatsapp.style.display = 'flex';
    } else {
      socialWhatsapp.style.display = 'none';
    }

    // Social Links visibility (only show entered details)
    if (student.linkedinUrl && student.linkedinUrl.trim() !== "") {
      socialLinkedin.href = student.linkedinUrl;
      socialLinkedin.style.display = 'flex';
    } else {
      socialLinkedin.style.display = 'none';
    }

    if (student.instagramUrl && student.instagramUrl.trim() !== "") {
      socialInstagram.href = student.instagramUrl;
      socialInstagram.style.display = 'flex';
    } else {
      socialInstagram.style.display = 'none';
    }

    if (student.githubUrl && student.githubUrl.trim() !== "") {
      socialGithub.href = student.githubUrl;
      socialGithub.style.display = 'flex';
    } else {
      socialGithub.style.display = 'none';
    }

    if (student.portfolioUrl && student.portfolioUrl.trim() !== "") {
      socialPortfolio.href = student.portfolioUrl;
      socialPortfolio.style.display = 'flex';
    } else {
      socialPortfolio.style.display = 'none';
    }

    // Switch views
    loadingView.style.display = 'none';
    profileView.style.display = 'block';
  }

  // 3D Tilt interactive animation calculation
  function setup3DTiltEffect() {
    photoContainer.addEventListener('mousemove', (e) => {
      const rect = photoContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      const angleX = (yc - y) / 8; // Rotates slightly based on vertical position
      const angleY = (x - xc) / 8; // Rotates slightly based on horizontal position
      
      photoContainer.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(1.06)`;
      photoContainer.style.boxShadow = `${-angleY * 1.5}px ${angleX * 1.5}px 32px rgba(15, 76, 129, 0.28)`;
    });

    photoContainer.addEventListener('mouseleave', () => {
      photoContainer.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
      photoContainer.style.boxShadow = `0 8px 30px rgba(0,0,0,0.12)`;
    });
  }

  // Lightbox Close controls
  closeBtn.addEventListener('click', () => {
    lightbox.style.display = 'none';
  });

  // Accordion toggle logic with smooth max-height animation
  function setupCollapsibleAccordion() {
    const trigger = document.getElementById('details-trigger');
    const content = document.getElementById('details-content');
    const arrow = trigger.querySelector('.contact-arrow-toggle');

    // Remove existing listener to prevent duplicates
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);
    const newArrow = newTrigger.querySelector('.contact-arrow-toggle');

    newTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = content.classList.contains('open');
      if (isOpen) {
        content.classList.remove('open');
        content.style.maxHeight = '0px';
        newArrow.style.transform = 'rotate(0deg)';
      } else {
        content.classList.add('open');
        content.style.maxHeight = content.scrollHeight + 'px';
        newArrow.style.transform = 'rotate(180deg)';
      }
    });
  }
});
