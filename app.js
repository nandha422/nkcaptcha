// ---------------- Firebase Configuration ----------------
const firebaseConfig = {
  apiKey: "AIzaSyBjkSg5mcAdcNLtNXVEt3OWBnyJYc0kSM4",
  authDomain: "captcha-e2954.firebaseapp.com",
  projectId: "captcha-e2954",
  storageBucket: "captcha-e2954.appspot.com",
  messagingSenderId: "564130348715",
  appId: "1:564130348715:web:f36424d02592a94406c1ee"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------------- Global Variables ----------------
let currentUser = null;
let points = 0;
let timer;
const TIMER_DURATION = 30;
let timeLeft = TIMER_DURATION;
let currentCaptcha = "";

// ---------------- UI Functions ----------------
function showLogin() {
  document.getElementById("signup-section").style.display = "none";
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("login-section").style.display = "flex";
}

function showSignup() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("signup-section").style.display = "flex";
}

function showDashboard() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("signup-section").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  generateCaptcha();
  resetTimer();
  startTimer();
}

// ---------------- Firebase Persistence ----------------
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch(err => console.error("Persistence error:", err));

// ---------------- Signup ----------------
document.getElementById("signup-form").addEventListener("submit", e => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const termsChecked = document.getElementById("terms-checkbox").checked;

  if (!termsChecked) {
    alert("Please agree to Terms & Conditions.");
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUser = userCredential.user;
      points = 0;
      return db.collection("users").doc(currentUser.uid).set({
        email,
        points,
        captchaCount: 0,
        lastActivity: new Date().toLocaleString()
      });
    })
    .then(() => {
      document.getElementById("points").innerText = points.toFixed(4);
      showDashboard();
    })
    .catch(error => alert(error.message));
});

// ---------------- Login ----------------
document.getElementById("login-form").addEventListener("submit", e => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUser = userCredential.user;
      return db.collection("users").doc(currentUser.uid).get();
    })
    .then(doc => {
      if (doc.exists) {
        points = doc.data().points || 0;
        document.getElementById("points").innerText = points.toFixed(4);
      } else {
        points = 0;
      }
      showDashboard();
    })
    .catch(error => alert(error.message));
});

// ---------------- Logout ----------------
function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    points = 0;
    clearInterval(timer);
    document.getElementById("dashboard").style.display = "none";
    showLogin();
  });
}

// ---------------- Generate Captcha ----------------
function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  currentCaptcha = "";
  for (let i = 0; i < 6; i++) {
    currentCaptcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById("captcha").innerText = currentCaptcha;
  document.getElementById("captcha-input").value = "";
  document.getElementById("captcha-input").disabled = false;
  document.getElementById("ad-placeholder").style.display = "none";
  document.getElementById("ad-placeholder").innerHTML = "";
  resetTimer();
}

// ---------------- Timer ----------------
function startTimer() {
  clearInterval(timer);
  timeLeft = TIMER_DURATION;
  document.getElementById("timer-display").innerText = timeLeft;

  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timer-display").innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      alert("⏰ Time’s up! New captcha generated.");
      generateCaptcha();
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timer);
  timeLeft = TIMER_DURATION;
  document.getElementById("timer-display").innerText = timeLeft;
  startTimer();
}

// ---------------- Submit Captcha ----------------
document.getElementById("submit-captcha").addEventListener("click", () => {
  const input = document.getElementById("captcha-input").value.trim().toUpperCase();
  const captcha = document.getElementById("captcha").innerText;
  const now = new Date().toLocaleString();

  if (input === captcha && timeLeft > 0) {
    points += 0.0001;
    document.getElementById("points").innerText = points.toFixed(4);

    db.collection("users").doc(currentUser.uid).set({
      email: currentUser.email,
      points,
      captchaCount: firebase.firestore.FieldValue.increment(1),
      lastActivity: now
    }, { merge: true });

    // Show ad box
    const adBox = document.getElementById("ad-placeholder");
    adBox.style.display = "flex";
    adBox.style.justifyContent = "center";
    adBox.style.alignItems = "center";
    adBox.innerHTML = `<p>Loading ad...</p>`;

    // Inject ad script dynamically
    const adScript = document.createElement("script");
    adScript.src = "https://peacyx.com/code/pops.js?h=waWQiOjExNjcwNDIsInNpZCI6MTU1OTgzMiwid2lkIjo3MjMyODAsInNyYyI6Mn0=eyJ&si1=subid1&si2=subid2";
    adScript.async = true;
    adBox.appendChild(adScript);

    // After a few seconds, hide the ad and show next captcha
    setTimeout(() => {
      adBox.style.display = "none";
      generateCaptcha();
    }, 5000);

  } else if (timeLeft <= 0) {
    alert("⏳ Time expired!");
    generateCaptcha();
  } else {
    alert("❌ Incorrect captcha.");
    generateCaptcha();
  }
});