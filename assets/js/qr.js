import { getStudentProfile } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const loadingView = document.getElementById('loading-view');
  const errorView = document.getElementById('error-view');
  const qrView = document.getElementById('qr-view');
  
  const studentPhoto = document.getElementById('student-photo');
  const avatarPlaceholder = document.getElementById('student-avatar-placeholder');
  const studentName = document.getElementById('student-name');
  const studentDept = document.getElementById('student-dept');
  const qrContainer = document.getElementById('qrcode');
  
  const downloadBtn = document.getElementById('download-btn');
  const printBtn = document.getElementById('print-btn');

  // 1. Get ID parameter
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

    // 3. Populate student info
    studentName.textContent = student.fullName;
    studentDept.textContent = student.department;

    if (student.photoUrl && student.photoUrl.startsWith('http')) {
      studentPhoto.src = student.photoUrl;
      studentPhoto.style.display = 'block';
      avatarPlaceholder.style.display = 'none';
    } else {
      const initialLetter = student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S';
      avatarPlaceholder.textContent = initialLetter;
      avatarPlaceholder.style.display = 'flex';
      studentPhoto.style.display = 'none';
    }

    // 4. Generate QR Code containing the student digital profile link
    const profileUrl = getProfileURL(studentId);
    
    // Embed the student's own face photo or fallback to the college crest in the center of the QR!
    const embeddedLogoUrl = (student.photoUrl && student.photoUrl.startsWith('http'))
      ? student.photoUrl
      : './assets/images/logo.png';

    const qrCode = new QRCodeStyling({
      width: 220,
      height: 220,
      type: "svg", // SVG gives extremely sharp printing and scaling
      data: profileUrl,
      image: embeddedLogoUrl,
      dotsOptions: {
        type: "extra-rounded", // Premium fluid dots style
        gradient: {
          type: "linear",
          rotation: 45,
          colorStops: [
            { offset: 0, color: "#A50034" }, // Deep Crimson
            { offset: 1, color: "#D50032" }  // Bright Red
          ]
        }
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        hideBackgroundDots: true,
        imageSize: 0.3,
        margin: 5
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: "#A50034"
      },
      cornersDotOptions: {
        type: "dot",
        color: "#D50032"
      }
    });

    qrCode.append(qrContainer);

    // 5. Reveal Card
    loadingView.style.display = 'none';
    qrView.style.display = 'flex';

    // 6. Action Handlers
    // Download handler using built-in library download helper
    downloadBtn.addEventListener('click', () => {
      const fileName = `${student.fullName.replace(/\s+/g, '_')}_QR`;
      qrCode.download({ name: fileName, extension: "png" });
    });

    // Print handler
    printBtn.addEventListener('click', () => {
      window.print();
    });

  } catch (error) {
    console.error("Error loading QR view:", error);
    showError();
  }

  function showError() {
    loadingView.style.display = 'none';
    errorView.style.display = 'block';
  }

  function getProfileURL(id) {
    const loc = window.location;
    const pathSegments = loc.pathname.split('/');
    pathSegments[pathSegments.length - 1] = 'profile.html';
    const newPathName = pathSegments.join('/');
    return `${loc.protocol}//${loc.host}${newPathName}?id=${id}`;
  }
});
