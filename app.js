<script type="module">
// ================= FIREBASE INIT =================
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

let currentUser = null;
let points = 0;
let timerInterval;
let currentCaptcha = "";
let totalTime = 10; // seconds per captcha

// ================= UI HANDLERS =================
function showLogin() {
  document.getElementById("signup-section").style.display = "none";
  document.getElementById("login-section").style.display = "block";
}
function showSignup() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("signup-section").style.display = "block";
}
function showDashboard() {
  document.getElementById("signup-section").style.display = "none";
  document.getElementById("login-section").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  generateCaptcha();
}

// ================= AUTH =================
document.getElementById("signup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const termsChecked = document.getElementById("terms-checkbox").checked;
  if (!termsChecked) { alert("Please agree to Terms & Conditions."); return; }

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUser = userCredential.user;
      points = 0;
      return db.collection("users").doc(currentUser.uid).set({
        email: currentUser.email,
        points: points,
        captchaCount: 0,
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      document.getElementById("points").innerText = points.toFixed(4);
      showDashboard();
    })
    .catch(error => alert(error.message));
});

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUser = userCredential.user;
      return db.collection("users").doc(currentUser.uid).get();
    })
    .then(doc => {
      points = doc.exists ? doc.data().points : 0;
      document.getElementById("points").innerText = points.toFixed(4);
      showDashboard();
    })
    .catch(error => alert(error.message));
});

function logout() {
  auth.signOut();
  currentUser = null;
  points = 0;
  clearInterval(timerInterval);
  document.getElementById("dashboard").style.display = "none";
  showLogin();
}

// ================= CAPTCHA =================
const captchaText = document.getElementById("captcha-text");
const captchaInput = document.getElementById("captcha-input");
const pointsDisplay = document.getElementById("points");
const progressBar = document.getElementById("progress-bar");
const timeLeftDisplay = document.getElementById("time-left");
const adBox = document.getElementById("ad-placeholder");

function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  currentCaptcha = "";
  for (let i = 0; i < 5; i++) {
    currentCaptcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  captchaText.textContent = currentCaptcha;
  captchaInput.value = "";
  captchaInput.disabled = false;
  adBox.style.display = "none";
  startCaptchaTimer();
}

function startCaptchaTimer() {
  clearInterval(timerInterval);
  let timeLeft = totalTime;
  progressBar.style.width = "0%";
  timeLeftDisplay.textContent = `${timeLeft}s`;

  timerInterval = setInterval(() => {
    timeLeft--;
    let progress = ((totalTime - timeLeft) / totalTime) * 100;
    progressBar.style.width = progress + "%";
    timeLeftDisplay.textContent = `${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert("⏰ Time’s up! New captcha generated.");
      generateCaptcha();
    }
  }, 1000);
}

// ================= VERIFY =================
document.getElementById("verify-btn").addEventListener("click", async () => {
  const input = captchaInput.value.trim().toUpperCase();
  if (input === currentCaptcha) {
    points += 0.0001;
    pointsDisplay.textContent = points.toFixed(4);
    adBox.style.display = "block"; // show ad after success

    if (currentUser) {
      const userRef = db.collection("users").doc(currentUser.uid);
      await userRef.set({
        email: currentUser.email,
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await userRef.update({
        points: firebase.firestore.FieldValue.increment(0.0001),
        captchaCount: firebase.firestore.FieldValue.increment(1)
      });
    }
    alert("✅ Correct! +0.0001 earned.");
    generateCaptcha();
  } else {
    alert("❌ Wrong captcha. Try again!");
  }
});
</script>