// ---------- CONFIG ----------
// Paste your Firebase config exactly as in index.html
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBjkSg5mcAdcNLtNXVEt3OWBnyJYc0kSM4",
  authDomain: "captcha-e2954.firebaseapp.com",
  projectId: "captcha-e2954",
  storageBucket: "captcha-e2954.appspot.com",
  messagingSenderId: "564130348715",
  appId: "1:564130348715:web:f36424d02592a94406c1ee"
};

// Set the admin email who can access this panel:
const ADMIN_EMAIL = "raman.rnandhu@gmail.com"; // <- change this

// ---------- INIT ----------
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();

const usersTableBody = document.querySelector('#usersTable tbody');
const adminInfo = document.getElementById('adminInfo');
const btnReload = document.getElementById('btnReload');
const btnExportCSV = document.getElementById('btnExportCSV');
const dateFromEl = document.getElementById('dateFrom');
const dateToEl = document.getElementById('dateTo');
const minCountEl = document.getElementById('minCount');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const btnExportUserCSV = document.getElementById('btnExportUserCSV');
const modalClose = document.getElementById('modalClose');

const statUsers = document.getElementById('stat-users');
const statCaptchas = document.getElementById('stat-captchas');
const statToday = document.getElementById('stat-today');

let snapshotUsers = []; // cache
let loadedTxForUser = []; // for modal

// ---------- Auth & Access Control ----------
auth.onAuthStateChanged(user => {
  if (!user) {
    adminInfo.innerText = 'Not signed in — redirecting to login...';
    setTimeout(()=> location.href = 'index.html', 900);
    return;
  }
  if (user.email !== ADMIN_EMAIL) {
    adminInfo.innerText = `Signed in as ${user.email}. Not admin — redirecting...`;
    setTimeout(()=> location.href = 'index.html', 900);
    return;
  }
  adminInfo.innerText = `Signed in as ${user.email} (admin)`;
  // load users after confirmed admin
  loadUsers();
});

// Sign out button
document.getElementById('btnSignOut')?.addEventListener('click', async () => {
  await auth.signOut();
  location.href = 'index.html';
});

// ---------- Helpers ----------
function formatDate(ts) {
  if (!ts) return '-';
  // ts could be firebase Timestamp or ISO string
  let d;
  if (ts.seconds !== undefined) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  return d.toLocaleString();
}
function formatDayKey(ts) {
  let d;
  if (!ts) return '';
  if (ts.seconds !== undefined) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(cell => `"${(String(cell)).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Load users & aggregate ----------
async function loadUsers() {
  usersTableBody.innerHTML = '<tr><td colspan="7" class="muted">Loading users and transactions...</td></tr>';
  snapshotUsers = [];
  try {
    const usersSnap = await db.collection('users').get();
    const users = [];
    // gather users
    for (const udoc of usersSnap.docs) {
      const data = udoc.data();
      users.push({ uid: udoc.id, email: data.email || '', name: data.name || '', points: data.points || 0, role: data.role || 'user' });
    }

    // For each user fetch transactions subcollection (limit maybe large; you can paginate in prod)
    const allPromises = users.map(async user => {
      const txSnap = await db.collection('users').doc(user.uid).collection('transactions').orderBy('createdAt','desc').get();
      const txs = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // compute aggregates: total count, counts by day, last timestamp
      const totalCount = txs.length;
      const byDay = {};
      let last = null;
      for (const t of txs) {
        if (!t.createdAt) continue;
        const day = formatDayKey(t.createdAt);
        byDay[day] = (byDay[day] || 0) + 1;
        if (!last) last = t.createdAt;
      }
      return {...user, transactions: txs, totalCount, byDay, last};
    });

    const usersWithTx = await Promise.all(allPromises);
    snapshotUsers = usersWithTx;
    renderTable(usersWithTx);
    renderStats(usersWithTx);
  } catch (err) {
    console.error(err);
    usersTableBody.innerHTML = `<tr><td colspan="7" class="muted">Error loading: ${err.message}</td></tr>`;
  }
}

// ---------- Render ----------
function renderTable(users) {
  const from = dateFromEl.value ? new Date(dateFromEl.value) : null;
  const to = dateToEl.value ? new Date(dateToEl.value) : null; if (to) to.setHours(23,59,59,999);
  const minCount = Number(minCountEl.value || 0);

  const rows = users.filter(u=>{
    if (u.totalCount < minCount) return false;
    if (from || to) {
      // check transactions date intersect
      const hasInRange = u.transactions.some(t=>{
        if (!t.createdAt) return false;
        const dt = t.createdAt.seconds ? new Date(t.createdAt.seconds*1000) : new Date(t.createdAt);
        if (from && dt < from) return false;
        if (to && dt > to) return false;
        return true;
      });
      if (!hasInRange) return false;
    }
    return true;
  });

  if (rows.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="7" class="muted">No users match the filter</td></tr>';
    return;
  }

  usersTableBody.innerHTML = '';
  for (const u of rows) {
    const lastStr = u.last ? formatDate(u.last) : '-';
    // today count
    const todayKey = formatDayKey(new Date());
    const todayCount = u.byDay && u.byDay[todayKey] ? u.byDay[todayKey] : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Email">${u.email || '-'}</td>
      <td data-label="Name">${u.name || '-'}</td>
      <td data-label="Points">${Number(u.points).toFixed(6)}</td>
      <td data-label="Total Captchas">${u.totalCount}</td>
      <td data-label="Today">${todayCount}</td>
      <td data-label="Last Activity">${lastStr}</td>
      <td class="right" data-label="Actions">
        <button class="view-btn" data-uid="${u.uid}">View</button>
        <button class="csv-btn" data-uid="${u.uid}">CSV</button>
      </td>
    `;
    usersTableBody.appendChild(tr);
  }

  // attach handlers
  document.querySelectorAll('.view-btn').forEach(btn=>{
    btn.onclick = async (e) => {
      const uid = e.currentTarget.dataset.uid;
      const user = snapshotUsers.find(s => s.uid === uid);
      if (!user) return alert('User not found');
      openTxModal(user);
    };
  });
  document.querySelectorAll('.csv-btn').forEach(btn=>{
    btn.onclick = (e) => {
      const uid = e.currentTarget.dataset.uid;
      const user = snapshotUsers.find(s => s.uid === uid);
      if (!user) return alert('User not found');
      exportUserCSV(user);
    };
  });
}

function renderStats(users) {
  statUsers.innerText = `Users: ${users.length}`;
  let totalCaptchas = 0;
  let todayTotal = 0;
  const todayKey = formatDayKey(new Date());
  for (const u of users) {
    totalCaptchas += (u.totalCount || 0);
    if (u.byDay && u.byDay[todayKey]) todayTotal += u.byDay[todayKey];
  }
  statCaptchas.innerText = `Captchas (all time): ${totalCaptchas}`;
  statToday.innerText = `Captchas today: ${todayTotal}`;
}

// ---------- Modal (transactions) ----------
function openTxModal(user) {
  modalTitle.innerText = `Transactions — ${user.email}`;
  const tbody = modalBody.querySelector('tbody');
  tbody.innerHTML = '';
  loadedTxForUser = (user.transactions || []).slice().sort((a,b)=>{
    const as = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
    const bs = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
    return bs - as;
  });
  if (loadedTxForUser.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="muted">No transactions</td></tr>';
  } else {
    for (const t of loadedTxForUser) {
      const ts = t.createdAt ? formatDate(t.createdAt) : '-';
      const amount = t.amount !== undefined ? t.amount : '-';
      const id = t.id || '-';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${amount}</td><td>${ts}</td><td>${id}</td>`;
      tbody.appendChild(tr);
    }
  }
  modalBackdrop.style.display = 'flex';
}

// close modal
modalClose.addEventListener('click', ()=> modalBackdrop.style.display='none');

// export user CSV (transactions)
function exportUserCSV(user) {
  const rows = [['email','timestamp','amount','txId']];
  for (const t of (user.transactions || [])) {
    const ts = t.createdAt ? (t.createdAt.seconds ? new Date(t.createdAt.seconds*1000).toISOString() : new Date(t.createdAt).toISOString()) : '';
    rows.push([user.email || '', ts, t.amount || '', t.id || '']);
  }
  downloadCSV(`transactions_${user.email || user.uid}.csv`, rows);
}

// ---------- Export global CSV ----------
btnExportCSV.addEventListener('click', () => {
  const rows = [['email','name','points','totalCaptchas','lastActivity','byDay_JSON']];
  for (const u of snapshotUsers) {
    rows.push([u.email||'', u.name||'', u.points||0, u.totalCount||0, u.last ? (u.last.seconds ? new Date(u.last.seconds*1000).toISOString() : new Date(u.last).toISOString()) : '', JSON.stringify(u.byDay || {})]);
  }
  downloadCSV('users_overview.csv', rows);
});

// reload with filters
btnReload.addEventListener('click', loadUsers);
dateFromEl.addEventListener('change', loadUsers);
dateToEl.addEventListener('change', loadUsers);
minCountEl.addEventListener('change', loadUsers);

// export modal user csv (from transaction view)
btnExportUserCSV.addEventListener('click', () => {
  // using current modal title to find user email
  const title = modalTitle.innerText.replace('Transactions — ','');
  const user = snapshotUsers.find(u => u.email === title);
  if (user) exportUserCSV(user);
  else alert('Could not find user for export');
});

// ---------- initial check: require admin logged in ----------
(async function ensureSignedIn() {
  // if user already signed-in, auth.onAuthStateChanged will handle
  // else show status: sign-in required
  // We leave sign-in process to index.html. This admin page expects admin to sign in from index or to use a tool to sign in.
})();
