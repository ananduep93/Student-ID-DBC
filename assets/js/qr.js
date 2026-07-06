import { getStudentProfile } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const loadingView = document.getElementById('loading-view');
  const errorView = document.getElementById('error-view');
  const qrView = document.getElementById('qr-view');
  const actionPanel = document.getElementById('action-panel');
  
  // Front Card DOM
  const frontStudentPhoto = document.getElementById('front-student-photo');
  const frontAvatarPlaceholder = document.getElementById('front-avatar-placeholder');
  const frontStudentName = document.getElementById('front-student-name');
  const frontStudentDept = document.getElementById('front-student-dept');
  const frontStudentBatch = document.getElementById('front-student-batch');
  const frontBgLayer = document.getElementById('front-bg-layer');
  
  // Back Card DOM
  const backBgLayer = document.getElementById('back-bg-layer');
  const backLogoContainer = document.getElementById('back-logo-container');
  const backFooterDecor = document.getElementById('back-footer-decor');
  const qrContainer = document.getElementById('qrcode-id');
  
  // Action Buttons
  const downloadFrontBtn = document.getElementById('download-front-btn');
  const downloadBackBtn = document.getElementById('download-back-btn');
  const printBtn = document.getElementById('print-btn');

  // SVG Common Path for Jet Airplane
  const planePath = "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5L21 16z";

  // 1. Parse ID parameter
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('id');

  if (!studentId) {
    showError();
    return;
  }

  try {
    // 2. Fetch student details from Supabase
    const student = await getStudentProfile(studentId);
    if (!student) {
      showError();
      return;
    }

    // 3. Detect Department Theme
    const rawDept = student.department ? student.department.toUpperCase() : "";
    let theme = 'AVIATION'; // Fallback / default
    let deptDisplayName = "BBA AVIATION & LOGISTICS";
    let batchYears = "2025-2028";
    
    // Academic start year from database (fallback to current year)
    const startYear = student.submissionDate ? new Date(student.submissionDate).getFullYear() : 2025;
    const databaseBatch = student.courseYear;

    if (rawDept.includes("ARTIFICIAL") || rawDept.includes("AI")) {
      theme = 'AI_DS';
      deptDisplayName = "B.SC ARTIFICIAL INTELLIGENCE & DATA SCIENCE";
      batchYears = databaseBatch || `${startYear}-${startYear + 4}`; // 4-year B.Sc
    } else if (rawDept.includes("HOSPITAL") || rawDept.includes("HEALTH")) {
      theme = 'HOSPITAL';
      deptDisplayName = "B.SC HOSPITAL ADMINISTRATION & HEALTH CARE";
      batchYears = databaseBatch || `${startYear}-${startYear + 3}`; // 3-year B.Sc
    } else {
      theme = 'AVIATION';
      deptDisplayName = "BBA AVIATION & LOGISTICS";
      batchYears = databaseBatch || `${startYear}-${startYear + 3}`; // 3-year BBA
    }

    // 4. Populate Front Card Fields
    frontStudentName.textContent = student.fullName;
    frontStudentDept.textContent = deptDisplayName;
    frontStudentBatch.textContent = `BATCH: ${batchYears}`;

    if (student.photoUrl && student.photoUrl.startsWith('http')) {
      frontStudentPhoto.src = student.photoUrl;
      frontStudentPhoto.style.display = 'block';
      frontAvatarPlaceholder.style.display = 'none';
    } else {
      const initialLetter = student.fullName ? student.fullName.trim().charAt(0).toUpperCase() : 'S';
      frontAvatarPlaceholder.textContent = initialLetter;
      frontAvatarPlaceholder.style.display = 'flex';
      frontStudentPhoto.style.display = 'none';
    }

    // 5. Generate Theme-Specific Front Background
    generateFrontBackground(theme);

    // 6. Generate Theme-Specific Back Background & Branding
    generateBackBackground(theme);

    // 7. Generate QR Code on the Back
    const profileUrl = getProfileURL(studentId);
    const qrCode = new QRCodeStyling({
      width: 140,
      height: 140,
      type: "svg", // SVG gives sharp printing
      data: profileUrl,
      dotsOptions: {
        type: "square",
        color: "#000000"
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersSquareOptions: {
        type: "square",
        color: "#000000"
      },
      cornersDotOptions: {
        type: "square",
        color: "#000000"
      }
    });

    qrCode.append(qrContainer);

    // 8. Display Card Wrapper & Action panel
    loadingView.style.display = 'none';
    qrView.style.display = 'flex';
    actionPanel.style.display = 'block';

    // 9. Attach HTML-to-Image Exporter (html2canvas)
    setupExportHandlers(student.fullName);

  } catch (error) {
    console.error("Error generating student ID card:", error);
    showError();
  }

  function showError() {
    loadingView.style.display = 'none';
    errorView.style.display = 'block';
    actionPanel.style.display = 'none';
  }

  function getProfileURL(id) {
    const loc = window.location;
    const pathSegments = loc.pathname.split('/');
    pathSegments[pathSegments.length - 1] = 'profile.html';
    const newPathName = pathSegments.join('/');
    return `${loc.protocol}//${loc.host}${newPathName}?id=${id}`;
  }

  // ─── BACKGROUND GENERATOR FUNCTIONS ──────────────────────────────────────────

  function generateFrontBackground(theme) {
    if (theme === 'AVIATION') {
      frontBgLayer.innerHTML = `<img src="./assets/images/aviation_front.png" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
    } else if (theme === 'AI_DS') {
      frontBgLayer.innerHTML = `<img src="./assets/images/ai_front.png" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
    } else if (theme === 'HOSPITAL') {
      frontBgLayer.innerHTML = `
        <svg viewBox="0 0 330 530" xmlns="http://www.w3.org/2000/svg">
          <!-- Light teal background -->
          <rect width="330" height="530" fill="#f0fdfa" />
          
          <!-- Diagonal medical teal bottom polygon -->
          <path d="M 0 370 L 330 290 L 330 530 L 0 530 Z" fill="#0f766e" />
          
          <!-- ECG Heartbeat waves -->
          <path d="M-20 120 L 60 120 L 70 100 L 75 140 L 80 115 L 85 125 L 90 120 L 180 120" fill="none" stroke="#0f766e" stroke-width="1.5" opacity="0.18" />
          <path d="M120 440 L 180 440 L 190 420 L 195 460 L 200 435 L 205 445 L 210 440 L 350 440" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.18" />
          
          <!-- Medical symbols outlines -->
          <g fill="none" stroke="#0f766e" stroke-width="1" opacity="0.12">
            <!-- Shield / Cross -->
            <rect x="250" y="50" width="30" height="30" rx="8" />
            <path d="M 265 55 L 265 75 M 255 65 L 275 65" />
            
            <rect x="40" y="200" width="24" height="24" rx="6" />
            <path d="M 52 204 L 52 220 M 46 212 L 58 212" />
          </g>

          <g fill="none" stroke="#ffffff" stroke-width="1" opacity="0.18">
            <rect x="250" y="380" width="30" height="30" rx="8" />
            <path d="M 265 385 L 265 405 M 255 395 L 275 395" />
          </g>
        </svg>
      `;
    }
  }

  function generateBackBackground(theme) {
    if (theme === 'AVIATION') {
      backBgLayer.innerHTML = `<img src="./assets/images/aviation_back.png" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
      backLogoContainer.innerHTML = '';
      backFooterDecor.innerHTML = '';
    } else if (theme === 'AI_DS') {
      backBgLayer.innerHTML = `<img src="./assets/images/ai_back.png" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
      backLogoContainer.innerHTML = '';
      backFooterDecor.innerHTML = `
        <p class="triangles-decor" style="color: #ffffff; opacity: 0.8; letter-spacing: 12px; font-weight: 800; font-size: 13px;">▼▲▼▲▼</p>
      `;
    } else if (theme === 'HOSPITAL') {
      backBgLayer.innerHTML = `
        <svg viewBox="0 0 330 530" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="backGradHosp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#115e59" />
              <stop offset="50%" stop-color="#0f766e" />
              <stop offset="100%" stop-color="#115e59" />
            </linearGradient>
          </defs>
          
          <rect width="330" height="530" fill="url(#backGradHosp)" />
          
          <!-- Concentric medical rings -->
          <circle cx="165" cy="265" r="140" fill="none" stroke="#2dd4bf" stroke-width="1.2" opacity="0.12" />
          <path d="M-20 265 L 100 265 L 115 240 L 125 290 L 130 255 L 135 270 L 140 265 L 350 265" fill="none" stroke="#2dd4bf" stroke-width="1.5" opacity="0.15" />
        </svg>
      `;

      backLogoContainer.innerHTML = `
        <svg viewBox="0 0 250 150" class="back-logo-svg" xmlns="http://www.w3.org/2000/svg">
          <text x="125" y="115" font-family="'Outfit', sans-serif" font-size="95" font-weight="900" fill="#2dd4bf" text-anchor="middle" letter-spacing="-3">HA</text>
          <!-- Cross behind logo -->
          <path d="M 125 35 L 125 125 M 80 80 L 170 80" stroke="rgba(45, 212, 191, 0.15)" stroke-width="14" stroke-linecap="round" />
        </svg>
      `;

      backFooterDecor.innerHTML = `
        <p class="triangles-decor" style="color: #2dd4bf; letter-spacing: 8px;">● ○ ● ○ ●</p>
      `;
    }
  }

  // ─── HTML-TO-IMAGE EXPORTER (html2canvas) ───────────────────────────────────

  function setupExportHandlers(studentName) {
    const filenameBase = studentName.replace(/\s+/g, '_');

    // 1. Download Front Side Card
    downloadFrontBtn.addEventListener('click', () => {
      const frontCard = document.getElementById('front-card');
      
      // Use html2canvas to capture elements, enabling CORS for dynamic web images (like ImgBB link)
      html2canvas(frontCard, {
        useCORS: true,
        scale: 2, // Double scale for high-res output
        backgroundColor: null // Transparent corners
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${filenameBase}_Front_ID.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    // 2. Download Back Side Card
    downloadBackBtn.addEventListener('click', () => {
      const backCard = document.getElementById('back-card');
      
      html2canvas(backCard, {
        useCORS: true,
        scale: 2,
        backgroundColor: null
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${filenameBase}_Back_ID.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    // 3. Print ID Cards
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
});
