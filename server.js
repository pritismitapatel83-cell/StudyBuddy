// ============================================================
//  api.js — Frontend helper for Study Buddy backend
// ============================================================

const API = 'http://127.0.0.1:3000/api';

// ── LOGIN ────────────────────────────────────────────────
async function loginUser() {
  const email = document.getElementById('username')?.value;
  const password = document.getElementById('password')?.value;

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
      alert("Login successful");
      window.location.href = "dashboard.html";
    } else {
      alert(data.error || "Login failed");
    }
  } catch (err) {
    console.error(err);
    alert("Server error or backend not running");
  }
}

// ── Dashboard ────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res  = await fetch(`${API}/dashboard`);
    const data = await res.json();

    const profile = data.profile;
    const nameEl  = document.getElementById('welcome-name');
    const infoEl  = document.getElementById('welcome-info');

    if (nameEl) nameEl.textContent = 'Welcome, ' + profile.name + ' 🔥';
    if (infoEl) infoEl.textContent = profile.course + ' | ' + profile.semester;

    const rankList = document.getElementById('ranking-list');
    if (rankList) {
      rankList.innerHTML = '';
      data.ranking.forEach(r => {
        const row = document.createElement('div');
        row.className = 'rank-row' + (r.isCurrentUser ? ' current-user' : '');
        row.innerHTML = `
          <span class="rank-num">${r.rank}</span>
          <span class="rank-name">${r.name}</span>
          <span class="rank-pts">${r.points} pts</span>`;
        rankList.appendChild(row);
      });
    }

    const progEl = document.getElementById('progress-list');
    if (progEl) {
      progEl.innerHTML = '';
      data.progress.forEach(p => {
        progEl.innerHTML += `
          <div class="prog-item">
            <span>${p.subject}</span>
            <div class="prog-bar-bg">
              <div class="prog-bar" style="width:${p.percent}%"></div>
            </div>
          </div>`;
      });
    }
  } catch (err) {
    console.error(err);
  }
}

// ── Profile ──────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res  = await fetch(`${API}/profile`);
    const data = await res.json();

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setInp = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

    setVal('profile-name', data.name);
    setVal('profile-course', data.course + ' | ' + data.semester);
    setVal('profile-email', 'Email: ' + data.email);

    setInp('input-name', data.name);
    setInp('input-course', data.course);
    setInp('input-semester', data.semester);
    setInp('input-email', data.email);
  } catch (err) {
    console.error(err);
  }
}

async function saveProfile() {
  const body = {
    name: document.getElementById('input-name')?.value,
    course: document.getElementById('input-course')?.value,
    semester: document.getElementById('input-semester')?.value,
    email: document.getElementById('input-email')?.value
  };

  const res = await fetch(`${API}/profile`, {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.success) {
    alert('Profile updated!');
    loadProfile();
  }
}

// ── Notes ────────────────────────────────────────────────────
async function loadNotes() {
  const res   = await fetch(`${API}/notes`);
  const notes = await res.json();

  const tbody = document.getElementById('notes-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  notes.forEach(n => {
    tbody.innerHTML += `
      <tr>
        <td>${n.subject}</td>
        <td>${n.fileName}</td>
        <td>
          <a href="${n.downloadUrl}" download>
            <button class="btn-blue">Download</button>
          </a>
          <button class="btn-red" onclick="deleteNote('${n.id}')">Delete</button>
        </td>
      </tr>`;
  });
}

async function uploadNote() {
  const subject = document.getElementById('note-subject')?.value?.trim();
  const fileInp = document.getElementById('note-file');

  if (!subject || !fileInp?.files[0]) {
    alert('Enter subject and choose file');
    return;
  }

  const formData = new FormData();
  formData.append('subject', subject);
  formData.append('file', fileInp.files[0]);

  const res = await fetch(`${API}/notes`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (data.success) {
    alert('Uploaded!');
    loadNotes();
  }
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  await fetch(`${API}/notes/${id}`, { method: 'DELETE' });
  loadNotes();
}

// ── Planner ──────────────────────────────────────────────────
async function loadPlanner() {
  const res   = await fetch(`${API}/planner`);
  const tasks = await res.json();

  const list = document.getElementById('task-list');
  if (!list) return;

  list.innerHTML = '';
  if (tasks.length === 0) {
    list.innerHTML = '<p>No upcoming tasks.</p>';
    return;
  }

  tasks.forEach(t => {
    list.innerHTML += `
      <div class="task-item ${t.completed ? 'done' : ''}">
        <span onclick="toggleTask('${t.id}')">
          ${t.completed ? '✅' : '⬜'}
        </span>
        <span>${t.task}</span>
        <span>${t.dueDate}</span>
        <button onclick="deleteTask('${t.id}')">✕</button>
      </div>`;
  });
}

async function addTask() {
  const task = document.getElementById('task-input')?.value?.trim();
  const dueDate = document.getElementById('task-date')?.value;

  if (!task || !dueDate) return alert('Enter task and date');

  const res = await fetch(`${API}/planner`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ task, dueDate })
  });

  const data = await res.json();
  if (data.success) {
    loadPlanner();
  }
}

async function toggleTask(id) {
  await fetch(`${API}/planner/${id}`, { method: 'PATCH' });
  loadPlanner();
}

async function deleteTask(id) {
  await fetch(`${API}/planner/${id}`, { method: 'DELETE' });
  loadPlanner();
}

// ── Reminders ────────────────────────────────────────────────
async function loadReminders() {
  const res = await fetch(`${API}/reminders`);
  const reminders = await res.json();

  const list = document.getElementById('reminder-list');
  if (!list) return;

  list.innerHTML = '';
  reminders.forEach(r => {
    list.innerHTML += `
      <div>
        <strong>${r.title}</strong>
        <span>${r.date} ${r.time}</span>
        <button onclick="deleteReminder('${r.id}')">✕</button>
      </div>`;
  });
}

async function addReminder() {
  const title = document.getElementById('reminder-title')?.value;
  const date  = document.getElementById('reminder-date')?.value;
  const time  = document.getElementById('reminder-time')?.value;

  const res = await fetch(`${API}/reminders`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ title, date, time })
  });

  const data = await res.json();
  if (data.success) loadReminders();
}

async function deleteReminder(id) {
  await fetch(`${API}/reminders/${id}`, { method: 'DELETE' });
  loadReminders();
}