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

    if (rawDept.includes("ARTIFICIAL") || rawDept.includes("AI")) {
      theme = 'AI_DS';
      deptDisplayName = "B.SC ARTIFICIAL INTELLIGENCE & DATA SCIENCE";
      batchYears = `${startYear}-${startYear + 4}`; // 4-year B.Sc
    } else if (rawDept.includes("HOSPITAL") || rawDept.includes("HEALTH")) {
      theme = 'HOSPITAL';
      deptDisplayName = "B.SC HOSPITAL ADMINISTRATION & HEALTH CARE";
      batchYears = `${startYear}-${startYear + 3}`; // 3-year B.Sc
    } else {
      theme = 'AVIATION';
      deptDisplayName = "BBA AVIATION & LOGISTICS";
      batchYears = `${startYear}-${startYear + 3}`; // 3-year BBA
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
    new QRCode(qrContainer, {
      text: profileUrl,
      width: 140,
      height: 140,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

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
          <!-- Light blue top background -->
          <rect width="330" height="530" fill="#d6e4f0" />
          
          <!-- Diagonal blue bottom polygon -->
          <path d="M 0 370 L 330 290 L 330 530 L 0 530 Z" fill="#225bb6" />
          
          <!-- Dotted flight trails -->
          <path d="M-20 180 Q 80 120 180 80" fill="none" stroke="#225bb6" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.25"/>
          <path d="M120 450 Q 220 400 350 430" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.2"/>
          <path d="M50 280 T 280 200" fill="none" stroke="#225bb6" stroke-width="1" stroke-dasharray="3,3" opacity="0.2"/>
          
          <!-- Flying Dark Planes (on light bg) -->
          <g fill="#0c2340" opacity="0.15">
            <path d="${planePath}" transform="translate(40, 100) rotate(-45) scale(0.85)" />
            <path d="${planePath}" transform="translate(140, 50) rotate(15) scale(0.65)" />
            <path d="${planePath}" transform="translate(280, 110) rotate(-70) scale(0.75)" />
            <path d="${planePath}" transform="translate(90, 180) rotate(35) scale(0.6)" />
            <path d="${planePath}" transform="translate(220, 150) rotate(-15) scale(0.7)" />
          </g>

          <!-- Flying White Planes (on dark bg) -->
          <g fill="#ffffff" opacity="0.15">
            <path d="${planePath}" transform="translate(60, 420) rotate(45) scale(0.8)" />
            <path d="${planePath}" transform="translate(260, 385) rotate(-25) scale(0.7)" />
            <path d="${planePath}" transform="translate(160, 480) rotate(10) scale(0.85)" />
            <path d="${planePath}" transform="translate(300, 460) rotate(-65) scale(0.6)" />
          </g>
        </svg>
      `;
    } else if (theme === 'AI_DS') {
      frontBgLayer.innerHTML = `
        <svg viewBox="0 0 330 530" xmlns="http://www.w3.org/2000/svg">
          <!-- Slate background -->
          <rect width="330" height="530" fill="#0f172a" />
          
          <!-- Diagonal deep purple bottom polygon -->
          <path d="M 0 370 L 330 290 L 330 530 L 0 530 Z" fill="#4c1d95" />
          
          <!-- Digital circuit connections -->
          <g stroke="#6366f1" stroke-width="1.2" opacity="0.25" fill="none">
            <path d="M 40 80 L 90 80 L 110 100 M 110 100 L 110 150" />
            <path d="M 280 60 L 220 60 L 200 80 M 200 80 L 200 120" />
            <path d="M 30 200 L 80 250 L 130 250" />
            <path d="M 300 220 L 250 270" />
          </g>
          
          <!-- Circuit Nodes (glowing circles) -->
          <g fill="#6366f1" opacity="0.4">
            <circle cx="40" cy="80" r="4" />
            <circle cx="110" cy="150" r="3" />
            <circle cx="220" cy="60" r="4" />
            <circle cx="200" cy="120" r="3" />
            <circle cx="130" cy="250" r="4" />
          </g>

          <!-- White tech patterns on dark bottom bg -->
          <g stroke="#ffffff" stroke-width="1" opacity="0.18" fill="none">
            <path d="M 50 420 L 100 470 L 180 470" />
            <path d="M 280 400 L 230 450" />
            <circle cx="180" cy="470" r="3" fill="#ffffff" />
            <circle cx="280" cy="400" r="3.5" fill="#ffffff" />
          </g>

          <!-- Binary Background text -->
          <g fill="#6366f1" font-family="Courier, monospace" font-size="10" opacity="0.15">
            <text x="30" y="50">01101001</text>
            <text x="250" y="150">1001</text>
            <text x="20" y="320">11010</text>
            <text x="270" y="340">0110</text>
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
      // 1. Back Background Gradient & Paths
      backBgLayer.innerHTML = `
        <svg viewBox="0 0 330 530" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="backGradAero" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#163774" />
              <stop offset="50%" stop-color="#2d7ac2" />
              <stop offset="100%" stop-color="#163774" />
            </linearGradient>
          </defs>
          
          <rect width="330" height="530" fill="url(#backGradAero)" />
          
          <!-- Curved flight trails -->
          <path d="M-50 250 Q 165 290 380 250" fill="none" stroke="#ffffff" stroke-dasharray="5,5" stroke-width="1.5" opacity="0.25" />
          <path d="M80 -50 Q 165 265 250 580" fill="none" stroke="#ffffff" stroke-dasharray="5,5" stroke-width="1.5" opacity="0.25" />
          <path d="M-40 430 C 100 340 230 460 370 390" fill="none" stroke="#ffffff" stroke-dasharray="4,4" stroke-width="1" opacity="0.15" />
          
          <!-- Glowing white stars -->
          <circle cx="50" cy="60" r="1.5" fill="#ffffff" opacity="0.6"/>
          <circle cx="280" cy="90" r="1.5" fill="#ffffff" opacity="0.8"/>
          <circle cx="120" cy="240" r="1.2" fill="#ffffff" opacity="0.4"/>
          <circle cx="40" cy="420" r="1.2" fill="#ffffff" opacity="0.7"/>
          <circle cx="300" cy="480" r="1.5" fill="#ffffff" opacity="0.6"/>
          
          <!-- Flying White Planes -->
          <g fill="#ffffff" opacity="0.6">
            <path d="${planePath}" transform="translate(230, 80) rotate(-35) scale(1.2)" />
            <path d="${planePath}" transform="translate(80, 180) rotate(45) scale(1.0)" />
            <path d="${planePath}" transform="translate(265, 330) rotate(-65) scale(0.9)" />
            <path d="${planePath}" transform="translate(210, 480) rotate(35) scale(1.3)" />
          </g>
        </svg>
      `;

      // 2. Monogram Logo (RR logo with aircraft swoosh)
      backLogoContainer.innerHTML = `
        <svg viewBox="0 0 250 150" class="back-logo-svg" xmlns="http://www.w3.org/2000/svg">
          <!-- Monogram Letters -->
          <text x="125" y="110" font-family="'Outfit', sans-serif" font-size="95" font-weight="900" fill="#0c2340" text-anchor="middle" letter-spacing="-3">RR</text>
          
          <!-- Cyan Swoosh -->
          <path d="M 50 120 Q 125 50 200 120" fill="none" stroke="#00b8e6" stroke-width="8" stroke-linecap="round" />
          
          <!-- Tiny jet at end of swoosh -->
          <path d="${planePath}" fill="#00b8e6" transform="translate(200, 120) rotate(45) scale(0.55)" />
        </svg>
      `;

      // 3. Footer Triangles
      backFooterDecor.innerHTML = `
        <p class="triangles-decor">▼ ▲ ▼ ▲ ▼</p>
      `;

    } else if (theme === 'AI_DS') {
      // AI & DS Theme Back Card
      backBgLayer.innerHTML = `
        <svg viewBox="0 0 330 530" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="backGradAI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0f172a" />
              <stop offset="50%" stop-color="#312e81" />
              <stop offset="100%" stop-color="#0f172a" />
            </linearGradient>
          </defs>
          
          <rect width="330" height="530" fill="url(#backGradAI)" />
          
          <!-- Tech nodes and circular rays -->
          <circle cx="165" cy="265" r="180" fill="none" stroke="#6366f1" stroke-width="1" opacity="0.1" />
          <circle cx="165" cy="265" r="120" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="5,5" opacity="0.15" />
          <circle cx="165" cy="265" r="80" fill="none" stroke="#818cf8" stroke-width="1" opacity="0.12" />

          <!-- Network connections -->
          <g stroke="#818cf8" stroke-width="1" opacity="0.2" fill="none">
            <path d="M 50 100 L 120 180 L 165 140" />
            <path d="M 280 430 L 210 350 L 165 390" />
          </g>
        </svg>
      `;

      backLogoContainer.innerHTML = `
        <svg viewBox="0 0 250 150" class="back-logo-svg" xmlns="http://www.w3.org/2000/svg">
          <text x="125" y="110" font-family="'Outfit', sans-serif" font-size="95" font-weight="900" fill="#6366f1" text-anchor="middle" letter-spacing="-3">AI</text>
          <path d="M 50 110 Q 125 140 200 110" fill="none" stroke="#a855f7" stroke-width="5" stroke-linecap="round" />
        </svg>
      `;

      backFooterDecor.innerHTML = `
        <p class="triangles-decor" style="color: #6366f1; letter-spacing: 8px;">■ □ ■ □ ■</p>
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
