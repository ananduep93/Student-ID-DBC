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
      frontBgLayer.innerHTML = `
        <svg viewBox="0 0 330 530" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="av-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#df2847" />
              <stop offset="60%" stop-color="#b0132b" />
              <stop offset="100%" stop-color="#690515" />
            </linearGradient>
          </defs>
          <rect width="330" height="530" fill="url(#av-bg)" />
          
          <!-- Curved dashed flight trails -->
          <path d="M-50 180 Q 90 110 230 70" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="6,6" opacity="0.15" />
          <path d="M100 450 Q 220 380 380 410" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="6,6" opacity="0.12" />
          <path d="M40 280 T 290 190" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="6,6" opacity="0.1" />

          <!-- Floating airplane silhouettes -->
          <g fill="#ffffff" opacity="0.08">
            <path d="${planePath}" transform="translate(40, 90) rotate(-35) scale(0.9)" />
            <path d="${planePath}" transform="translate(260, 110) rotate(15) scale(0.7)" />
            <path d="${planePath}" transform="translate(140, 40) rotate(-65) scale(0.8)" />
            <path d="${planePath}" transform="translate(90, 220) rotate(35) scale(0.65)" />
            <path d="${planePath}" transform="translate(230, 310) rotate(-15) scale(0.85)" />
            <path d="${planePath}" transform="translate(60, 410) rotate(45) scale(0.75)" />
            <path d="${planePath}" transform="translate(270, 440) rotate(-45) scale(1.0)" />
          </g>
          
          <!-- Small decorative glowing stars/nodes -->
          <g fill="#ffffff" opacity="0.3">
            <circle cx="160" cy="140" r="1.5" />
            <circle cx="280" cy="50" r="1" />
            <circle cx="50" cy="300" r="1" />
            <circle cx="120" cy="460" r="1.5" />
          </g>
        </svg>
      `;
    } else if (theme === 'AI_DS') {
      frontBgLayer.innerHTML = `
        <svg viewBox="0 0 330 530" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ai-glow" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#0c2e7a" />
              <stop offset="60%" stop-color="#051236" />
              <stop offset="100%" stop-color="#020718" />
            </radialGradient>
            <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.7" fill="#00ffff" opacity="0.12" />
            </pattern>
          </defs>
          
          <rect width="330" height="530" fill="url(#ai-glow)" />
          <rect width="330" height="530" fill="url(#dot-grid)" />
          
          <!-- Left Hexagon Cluster -->
          <g stroke="#00d8ff" stroke-width="1.2" fill="none" opacity="0.3">
            <polygon points="10,250 25,241.3 40,250 40,267.3 25,276 10,267.3" />
            <polygon points="25,276 40,267.3 55,276 55,293.3 40,302 25,293.3" />
            <polygon points="-5,276 10,267.3 25,276 25,293.3 10,302 -5,293.3" opacity="0.5" />
            <polygon points="10,302 25,293.3 40,302 40,319.3 25,328 10,319.3" />
          </g>
          
          <!-- Right Hexagon Cluster -->
          <g stroke="#00d8ff" stroke-width="1.2" fill="none" opacity="0.35">
            <polygon points="290,120 305,111.3 320,120 320,137.3 305,146 290,137.3" />
            <polygon points="305,146 320,137.3 335,146 335,163.3 320,172 305,163.3" />
            <polygon points="275,146 290,137.3 305,146 305,163.3 290,172 275,163.3" />
            <polygon points="290,172 305,163.3 320,172 320,189.3 305,198 290,189.3" />
            <polygon points="260,172 275,163.3 290,172 290,189.3 275,198 260,189.3" opacity="0.4" />
          </g>
          
          <!-- Glowing Tech lines / Circuits -->
          <g stroke="#00ffcc" stroke-width="1.2" fill="none" opacity="0.4">
            <path d="M 40 370 L 290 370" />
            <circle cx="290" cy="370" r="3" fill="#00ffcc" />
            <circle cx="40" cy="370" r="3" fill="#00ffcc" />
            <path d="M 20 80 L 60 80 L 80 100" />
            <circle cx="20" cy="80" r="2.5" fill="#00ffcc" />
            <path d="M 310 320 L 280 320 L 260 340 L 220 340" />
            <circle cx="310" cy="320" r="2.5" fill="#00ffcc" />
          </g>

          <!-- Side Blue Bars -->
          <g fill="#00d8ff" opacity="0.7">
            <rect x="10" y="325" width="4" height="12" rx="2" />
            <rect x="10" y="341" width="4" height="12" rx="2" />
            <rect x="10" y="357" width="4" height="12" rx="2" />
            <rect x="10" y="373" width="4" height="12" rx="2" />
            <rect x="10" y="389" width="4" height="12" rx="2" />
          </g>
          
          <!-- Subtle glowing blue particle nodes -->
          <g fill="#ffffff" opacity="0.6">
            <circle cx="165" cy="50" r="2" />
            <circle cx="260" cy="85" r="1.5" />
            <circle cx="70" cy="220" r="1.5" />
            <circle cx="250" cy="300" r="2" />
          </g>
        </svg>
      `;
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
      // 1. Back Background Gradient & Repeated Plane Pattern
      backBgLayer.innerHTML = `
        <svg viewBox="0 0 330 530" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="back-av-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="55%" stop-color="#f8fafc" />
              <stop offset="85%" stop-color="#b0132b" />
              <stop offset="100%" stop-color="#690515" />
            </linearGradient>
            <pattern id="aviation-plane-pattern" width="50" height="50" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
              <path d="${planePath}" fill="#b0132b" opacity="0.07" transform="scale(0.85)" />
            </pattern>
          </defs>
          
          <!-- Background Gradient -->
          <rect width="330" height="530" fill="url(#back-av-grad)" />
          
          <!-- Repeated Airplane Pattern -->
          <rect width="330" height="530" fill="url(#aviation-plane-pattern)" />
          
          <!-- Bottom Left Dotted Plane -->
          <g fill="#ffffff" opacity="0.8">
            <circle cx="55" cy="465" r="2.5" />
            <circle cx="65" cy="455" r="2.5" />
            <circle cx="75" cy="445" r="2.5" />
            <circle cx="85" cy="435" r="2.5" />
            <circle cx="95" cy="425" r="2.5" />
            <circle cx="105" cy="415" r="2.5" />
            <circle cx="45" cy="475" r="2.5" />
            <circle cx="40" cy="470" r="2" />
            <circle cx="50" cy="480" r="2" />
            <!-- Wing 1 (Up-Left) -->
            <circle cx="65" cy="435" r="2.5" />
            <circle cx="60" cy="425" r="2.5" />
            <circle cx="55" cy="415" r="2.5" />
            <!-- Wing 2 (Down-Right) -->
            <circle cx="85" cy="455" r="2.5" />
            <circle cx="90" cy="465" r="2.5" />
            <circle cx="95" cy="475" r="2.5" />
          </g>
        </svg>
      `;

      // 2. Clear Monogram Logo
      backLogoContainer.innerHTML = '';

      // 3. Clear Footer Triangles (already styled inside SVGs/Background)
      backFooterDecor.innerHTML = '';

    } else if (theme === 'AI_DS') {
      // AI & DS Theme Back Card
      backBgLayer.innerHTML = `
        <svg viewBox="0 0 330 530" xmlns="http://www.w3.org/2000/svg">
          <!-- Dark navy/black background -->
          <rect width="330" height="530" fill="#020718" />
          
          <!-- Tech nodes and circular glow -->
          <circle cx="165" cy="265" r="180" fill="none" stroke="#00d8ff" stroke-width="1" opacity="0.08" />
          <circle cx="165" cy="265" r="130" fill="none" stroke="#00d8ff" stroke-width="1.2" stroke-dasharray="5,5" opacity="0.1" />

          <!-- Top Left Circuit -->
          <path d="M 15 40 H 80 Q 90 40 95 35 L 105 25" stroke="#00e5ff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.7" />
          <circle cx="15" cy="40" r="3.5" fill="#00e5ff" opacity="0.8" />
          <circle cx="105" cy="25" r="3" fill="#00e5ff" opacity="0.8" />

          <!-- Top Right Circuit -->
          <g stroke="#00e5ff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7">
            <path d="M 315 20 V 120 M 303 20 V 100 M 291 20 V 60" />
            <circle cx="315" cy="120" r="3" fill="#00e5ff" />
            <circle cx="303" cy="100" r="3" fill="#00e5ff" />
            <rect x="288" y="70" width="6" height="15" fill="#00e5ff" opacity="0.5" stroke="none" />
          </g>

          <!-- Bottom Left Circuit -->
          <g stroke="#00e5ff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7">
            <path d="M 15 410 V 510 M 27 430 V 510 M 39 450 V 510" />
            <circle cx="15" cy="410" r="3" fill="#00e5ff" />
            <circle cx="27" cy="430" r="3" fill="#00e5ff" />
            <rect x="36" y="465" width="6" height="15" fill="#00e5ff" opacity="0.5" stroke="none" />
          </g>

          <!-- Bottom Right Circuit -->
          <path d="M 315 490 H 260 Q 250 490 245 495 L 235 505" stroke="#00e5ff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.7" />
          <circle cx="315" cy="490" r="3.5" fill="#00e5ff" opacity="0.8" />
          <circle cx="235" cy="505" r="3" fill="#00e5ff" opacity="0.8" />
        </svg>
      `;

      // Clear Monogram Logo
      backLogoContainer.innerHTML = '';

      // Set Bottom center triangles
      backFooterDecor.innerHTML = `
        <p class="triangles-decor" style="color: #ffffff; opacity: 0.8; letter-spacing: 12px; font-weight: 800; font-size: 13px;">▼▲▼▲▼</p>
      `;

    } else if (theme === 'HOSPITAL') {
      // Hospital Admin Theme Back Card
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
