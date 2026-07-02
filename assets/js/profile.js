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
  const profileImg = document.getElementById('profile-img');
  const profileFirstName = document.getElementById('profile-first-name');
  const profileLastName = document.getElementById('profile-last-name');
  const profileDesignation = document.getElementById('profile-designation');
  const profileDept = document.getElementById('profile-dept');
  const profileCollege = document.getElementById('profile-college');
  const profileBio = document.getElementById('profile-bio');
  const profileSkills = document.getElementById('profile-skills');
  const skillsSection = document.getElementById('skills-section');

  // Action Anchors
  const contactPhone = document.getElementById('contact-phone');
  const contactEmail = document.getElementById('contact-email');
  const profilePhone = document.getElementById('profile-phone');
  const profileEmail = document.getElementById('profile-email');

  const socialLinkedin = document.getElementById('social-linkedin');
  const socialInstagram = document.getElementById('social-instagram');
  const socialGithub = document.getElementById('social-github');
  const socialPortfolio = document.getElementById('social-portfolio');

  // Interactive buttons
  const downloadQrBtn = document.getElementById('download-qr-btn');
  const downloadVcardBtn = document.getElementById('download-vcard-btn');
  const shareProfileBtn = document.getElementById('share-profile-btn');

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
    // Basic Details
    profileImg.src = student.photoUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=256&auto=format&fit=crop';
    
    // Split full name into first and last name
    const nameParts = (student.fullName || "").trim().split(/\s+/);
    let firstName = student.fullName || "";
    let lastName = "";
    if (nameParts.length > 1) {
      lastName = nameParts.pop();
      firstName = nameParts.join(" ");
    }
    profileFirstName.textContent = firstName;
    profileLastName.textContent = lastName;

    // Designation and Department mapping
    if (student.department === "AI & DS") {
      profileDesignation.textContent = "B.Sc";
      profileDept.textContent = "AI & DS";
    } else if (student.department === "AVIATION") {
      profileDesignation.textContent = "BBA";
      profileDept.textContent = "AVIATION & LOGISTICS";
    } else {
      profileDesignation.textContent = "Student";
      profileDept.textContent = student.department || "";
    }

    profileCollege.textContent = student.college || "DON BOSCO COLLEGE MAMPETTA";
    profileBio.textContent = student.aboutMe;

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

    // Social Links visibility
    let visibleSocials = 0;
    
    if (student.linkedinUrl) {
      socialLinkedin.href = student.linkedinUrl;
      socialLinkedin.style.display = 'flex';
      visibleSocials++;
    } else {
      socialLinkedin.style.display = 'none';
    }

    if (student.instagramUrl) {
      socialInstagram.href = student.instagramUrl;
      socialInstagram.style.display = 'flex';
      visibleSocials++;
    } else {
      socialInstagram.style.display = 'none';
    }

    if (student.githubUrl) {
      socialGithub.href = student.githubUrl;
      socialGithub.style.display = 'flex';
      visibleSocials++;
    } else {
      socialGithub.style.display = 'none';
    }

    if (student.portfolioUrl) {
      socialPortfolio.href = student.portfolioUrl;
      socialPortfolio.style.display = 'flex';
      visibleSocials++;
    } else {
      socialPortfolio.style.display = 'none';
    }

    // Generate QR Code client-side
    generateQRCode();

    // Wire share and download handlers
    setupActionButtons(student);

    // Switch views
    loadingView.style.display = 'none';
    profileView.style.display = 'flex';
  }

  // 4. Client-side QR Code builder
  function generateQRCode() {
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ''; // clear

    try {
      // Initialize QRCode library helper (loaded globally via CDN in HTML)
      new QRCode(qrContainer, {
        text: window.location.href,
        width: 120,
        height: 120,
        colorDark: "#0b0f19",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (e) {
      console.error("QR Code library generation error: ", e);
      // Fallback: Google Chart API as backup in case library fails
      const encodedUrl = encodeURIComponent(window.location.href);
      qrContainer.innerHTML = `<img src="https://chart.googleapis.com/chart?cht=qr&chs=120x120&chl=${encodedUrl}" alt="QR code" style="width:100%">`;
    }
  }

  // 5. Wire action logic
  function setupActionButtons(student) {
    // Download QR Code
    downloadQrBtn.addEventListener('click', () => {
      try {
        const qrContainer = document.getElementById('qrcode');
        // QRCode.js creates a canvas and an image
        const canvas = qrContainer.querySelector('canvas');
        const img = qrContainer.querySelector('img');
        
        let dataUrl = '';
        if (canvas) {
          dataUrl = canvas.toDataURL("image/png");
        } else if (img && img.src) {
          dataUrl = img.src;
        } else {
          throw new Error("QR elements not rendered yet.");
        }

        const link = document.createElement('a');
        link.download = `student_qrcode_${student.fullName.replace(/\s+/g, '_').toLowerCase()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.show("QR Code downloaded successfully.", "success");
      } catch (err) {
        toast.show("Download failed. Try taking a screenshot instead.", "error");
        console.error(err);
      }
    });

    // Share Profile Link
    shareProfileBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: `${student.fullName} - Student Digital Profile`,
          text: `Check out the academic digital profile card of ${student.fullName} at Don Bosco College Mampetta.`,
          url: window.location.href
        }).catch(err => {
          console.log("Sharing cancelled", err);
        });
      } else {
        // Fallback: Copy link
        navigator.clipboard.writeText(window.location.href).then(() => {
          toast.show("Profile link copied to clipboard for sharing!", "success");
        }).catch(err => {
          toast.show("Could not copy link: " + err, "error");
        });
      }
    });

    // Download contact card (.vcf)
    downloadVcardBtn.addEventListener('click', () => {
      try {
        // Build clean vCard string format
        const vcardLines = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${student.fullName}`,
          `N:${student.fullName.split(' ').reverse().join(';')};;;`,
          `ORG:${student.college}`,
          `TITLE:${student.department}`,
          `TEL;TYPE=CELL:${student.phoneNumber}`,
          `EMAIL;TYPE=PREF,INTERNET:${student.email}`,
          `NOTE:${student.aboutMe}`,
        ];

        if (student.linkedinUrl) vcardLines.push(`URL;TYPE=LinkedIn:${student.linkedinUrl}`);
        if (student.instagramUrl) vcardLines.push(`URL;TYPE=Instagram:${student.instagramUrl}`);
        if (student.githubUrl) vcardLines.push(`URL;TYPE=GitHub:${student.githubUrl}`);
        if (student.portfolioUrl) vcardLines.push(`URL;TYPE=Portfolio:${student.portfolioUrl}`);

        vcardLines.push("END:VCARD");
        
        const vcardContent = vcardLines.join("\r\n");
        const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `${student.fullName.replace(/\s+/g, '_').toLowerCase()}_contact.vcf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.show("Contact vCard downloaded successfully.", "success");
      } catch (err) {
        toast.show("Contact card compilation failed: " + err.message, "error");
      }
    });
  }
});
