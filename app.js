// Firebase configuration
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

let currentUser = null, points = 0, timer, timeLeft = 30;

// UI Functions
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
  resetTimer();
  startAutoTimer();
}

// Signup
document.getElementById("signup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const termsChecked = document.getElementById("terms-checkbox").checked;
  if(!termsChecked){ alert("Please agree to Terms & Conditions."); return; }

  auth.createUserWithEmailAndPassword(email,password)
    .then(userCredential => {
      currentUser = userCredential.user;
      points = 0;
      db.collection("users").doc(currentUser.uid).set({points})
        .then(() => showDashboard());
      document.getElementById("points").innerText = points.toFixed(4);
    })
    .catch(error => alert(error.message));
});

// Login
document.getElementById("login-form").addEventListener("submit", (e)=>{
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  auth.signInWithEmailAndPassword(email,password)
    .then(userCredential=>{
      currentUser = userCredential.user;
      db.collection("users").doc(currentUser.uid).get()
        .then(doc=>{
          points = doc.exists ? doc.data().points : 0;
          document.getElementById("points").innerText = points.toFixed(4);
        })
        .finally(()=> showDashboard());
    })
    .catch(error=> alert(error.message));
});

// Logout
function logout() {
  auth.signOut();
  currentUser = null;
  points = 0;
  clearInterval(timer);
  document.getElementById("dashboard").style.display = "none";
  showLogin();
}

// Generate captcha
function generateCaptcha() {
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code="";
  for(let i=0;i<6;i++){ code+=chars.charAt(Math.floor(Math.random()*chars.length)); }
  document.getElementById("captcha").innerText = code;
  document.getElementById("captcha-input").value = "";
  document.getElementById("captcha-input").disabled = false;
  document.getElementById("ad-placeholder").style.display = "none";
  resetTimer();
}

// Auto timer starts for each new captcha
let timerInterval;
const progressBar = document.getElementById("progress-bar");
const timeLeftDisplay = document.getElementById("time-left");
const captchaText = document.getElementById("captcha-text");
const captchaInput = document.getElementById("captcha-input");
const pointsDisplay = document.getElementById("points");

let totalTime = 10; // seconds
let currentCaptcha = "";

// Start Timer
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
      generateCaptcha(); // regenerate automatically
    }
  }, 1000);
}

// Generate Captcha
function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  currentCaptcha = "";
  for (let i = 0; i < 5; i++) {
    currentCaptcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  captchaText.textContent = currentCaptcha;
  captchaInput.value = "";
  captchaInput.disabled = false; // make sure input is enabled

  startCaptchaTimer(); // start timer automatically
}

// Verify Captcha
document.getElementById("verify-btn").addEventListener("click", () => {
  if (captchaInput.value.trim() === currentCaptcha) {
    alert("✅ Correct Captcha!");
    pointsDisplay.textContent = parseInt(pointsDisplay.textContent) + 1;
    generateCaptcha();
  } else {
    alert("❌ Wrong Captcha, try again!");
  }
});

// Show Dashboard After Login
document.getElementById("login-btn").addEventListener("click", () => {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  generateCaptcha(); // first captcha & timer auto-start
});

// Submit captcha
document.getElementById("submit-captcha").addEventListener("click",()=>{
  const input = document.getElementById("captcha-input").value.trim().toUpperCase();
  const captcha = document.getElementById("captcha").innerText;
  if(input === captcha && timeLeft>0){
    points += 0.0001;
    document.getElementById("points").innerText = points.toFixed(4);
    db.collection("users").doc(currentUser.uid).update({points});
    document.getElementById("ad-placeholder").style.display="block";
  } else if(timeLeft<=0) {
    alert("Time expired! New captcha generated.");
  } else {
    alert("Incorrect captcha. Try again.");
  }
  generateCaptcha(); // automatically generate new captcha
});
db.collection("users").doc(currentUser.uid).set({
  email: currentUser.email,
  points: points,
  captchaCount: firebase.firestore.FieldValue.increment(1),
  lastActivity: firebase.firestore.FieldValue.serverTimestamp()
}, {merge:true});

  // Show ad placeholder before checking captcha
  const ad = document.getElementById("ad-placeholder");
  ad.style.display = "block";

  if(input === captcha && timeLeft > 0){
    points += 0.0001;
    document.getElementById("points").innerText = points.toFixed(4);

    const now = new Date().toLocaleString();
 // Permanent store in Firestore
    // Update points and captcha count atomically
    await userRef.set({
      email: currentUser.email,
      lastActivity: now
    }, { merge: true }); // merge ensures email and lastActivity are updated

    await userRef.update({
      points: firebase.firestore.FieldValue.increment(0.0001),
      captchaCount: firebase.firestore.FieldValue.increment(1)
    });
    alert("Correct! +0.0001 earned.");
  } else if(timeLeft <= 0){
    alert("Time expired!");
  } else {
    alert("Incorrect captcha.");
  }


  generateCaptcha(); // Refresh captcha for next round
});
// Reset Timer
function resetTimer(){
  clearInterval(timer);
  timeLeft = 30;
  document.getElementById("timer-display").innerText = timeLeft;
}
