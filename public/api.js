// ============================================================
//  api.js — Frontend API Helper for Study Buddy v2.0
// ============================================================

const API = 'http://127.0.0.1:3000/api';

// ── Helper: Get Auth Token from localStorage ──────────────────
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// ── Helper: Make Authenticated Request ────────────────────────
async function fetchAPI(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API}${endpoint}`, {
      ...options,
      headers
    });
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    return { success: false, error: 'Network error' };
  }
}

// ── AUTHENTICATION ────────────────────────────────────────────

async function registerStudent() {
  const name = document.getElementById('reg-name')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim();
  const password = document.getElementById('reg-password')?.value;
  const course = document.getElementById('reg-course')?.value;
  const semester = document.getElementById('reg-semester')?.value;

  if (!name || !email || !password || !course || !semester) {
    alert('All fields required');
    return;
  }

  const data = await fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, course, semester })
  });

  if (data.success) {
    alert('Registration successful! Please login.');
    window.location.href = 'index.html';
  } else {
    alert(data.error || 'Registration failed');
  }
}

async function loginUser() {
  const email = document.getElementById('username')?.value?.trim();
  const password = document.getElementById('password')?.value;

  if (!email || !password) {
    alert('Enter email and password');
    return;
  }

  const data = await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (data.success) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    alert('Login successful!');
    
    // Redirect based on role
    if (data.user.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  } else {
    alert(data.error || 'Login failed');
  }
}

function logoutUser() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function checkAuth() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = 'index.html';
  }
}

// ── DASHBOARD ─────────────────────────────────────────────────

async function loadDashboard() {
  checkAuth();
  const data = await fetchAPI('/dashboard');

  if (!data.profile) {
    alert('Failed to load dashboard');
    return;
  }

  const profile = data.profile;
  const nameEl = document.getElementById('welcome-name');
  const infoEl = document.getElementById('welcome-info');

  if (nameEl) nameEl.textContent = 'Welcome, ' + profile.name + ' 🔥';
  if (infoEl) infoEl.textContent = profile.course + ' | ' + profile.semester;

  // Load Questions
  const questionList = document.getElementById('question-list');
  if (questionList && data.questions) {
    questionList.innerHTML = '';
    data.questions.forEach(q => {
      const statusClass = q.submitted ? 'submitted' : 'pending';
      const statusText = q.submitted ? '✅ Submitted' : '⏳ Pending';
      const row = document.createElement('div');
      row.className = 'question-item ' + statusClass;
      row.innerHTML = `
        <div class="question-header">
          <h4>${q.title}</h4>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <p class="question-meta"><strong>${q.subject}</strong> | ${q.difficulty} | ${q.points} pts | Due: ${q.due_date}</p>
        <p>${q.description || q.question_text.substring(0, 80) + '...'}</p>
        <button class="btn-blue" onclick="openQuestion(${q.id})">View & Submit</button>`;
      questionList.appendChild(row);
    });
  }

  // Load Progress
  const progEl = document.getElementById('progress-list');
  if (progEl && data.progress) {
    const prog = data.progress;
    progEl.innerHTML = `
      <div class="prog-item">
        <span>Questions Completed</span>
        <div class="prog-bar-bg">
          <div class="prog-bar" style="width:${prog.percent}%"></div>
        </div>
        <span>${prog.completed}/${prog.total}</span>
      </div>`;
  }
}

function openQuestion(questionId) {
  localStorage.setItem('current_question_id', questionId);
  window.location.href = 'question-detail.html';
}

async function loadQuestionDetail() {
  checkAuth();
  const questionId = localStorage.getItem('current_question_id');

  if (!questionId) {
    alert('No question selected');
    window.location.href = 'dashboard.html';
    return;
  }

  const data = await fetchAPI(`/questions/${questionId}`);

  if (!data.success) {
    alert('Question not found');
    window.location.href = 'dashboard.html';
    return;
  }

  const q = data.question;
  const detailEl = document.getElementById('question-detail');
  if (detailEl) {
    detailEl.innerHTML = `
      <h2>${q.title}</h2>
      <p class="meta"><strong>${q.subject}</strong> | ${q.difficulty} | ${q.points} pts | Due: ${q.due_date}</p>
      <p>${q.description || ''}</p>
      <div class="question-text">
        ${q.question_text}
      </div>`;
  }

  // Load previous submission if exists
  const answerEl = document.getElementById('answer-input');
  if (answerEl && data.submission) {
    answerEl.value = data.submission.answer_text;
  }

  // Store question ID for submission
  window.currentQuestionId = questionId;
}

async function submitAnswer() {
  const questionId = window.currentQuestionId;
  const answer = document.getElementById('answer-input')?.value?.trim();

  if (!answer) {
    alert('Please enter your answer');
    return;
  }

  const data = await fetchAPI(`/questions/${questionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answer })
  });

  if (data.success) {
    alert('Answer submitted successfully!');
    window.location.href = 'dashboard.html';
  } else {
    alert(data.error || 'Submission failed');
  }
}

// ── PROFILE ───────────────────────────────────────────────────

async function loadProfile() {
  checkAuth();
  const data = await fetchAPI('/profile');

  if (!data.id) {
    alert('Failed to load profile');
    return;
  }

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setInp = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  setVal('profile-name', data.name);
  setVal('profile-course', data.course + ' | ' + data.semester);
  setVal('profile-email', 'Email: ' + data.email);

  setInp('input-name', data.name);
  setInp('input-course', data.course);
  setInp('input-semester', data.semester);
}

async function saveProfile() {
  const body = {
    name: document.getElementById('input-name')?.value,
    course: document.getElementById('input-course')?.value,
    semester: document.getElementById('input-semester')?.value
  };

  const data = await fetchAPI('/profile', {
    method: 'PUT',
    body: JSON.stringify(body)
  });

  if (data.success) {
    alert('Profile updated!');
    loadProfile();
  } else {
    alert(data.error || 'Update failed');
  }
}

// ── NOTES ─────────────────────────────────────────────────────

async function loadNotes() {
  const notes = await fetchAPI('/notes');

  const tbody = document.getElementById('notes-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!Array.isArray(notes)) return;

  notes.forEach(n => {
    tbody.innerHTML += `
      <tr>
        <td>${n.subject}</td>
        <td>${n.fileName}</td>
        <td>
          <a href="${n.downloadUrl}" download>
            <button class="btn-blue">Download</button>
          </a>
          <button class="btn-red" onclick="deleteNote(${n.id})">Delete</button>
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
    headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    body: formData
  });

  const data = await res.json();
  if (data.success) {
    alert('Uploaded!');
    loadNotes();
  } else {
    alert(data.error || 'Upload failed');
  }
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;

  const data = await fetchAPI(`/notes/${id}`, { method: 'DELETE' });
  if (data.success) {
    loadNotes();
  }
}

// ── TASKS ─────────────────────────────────────────────────────

async function loadTasks() {
  const tasks = await fetchAPI('/tasks');

  const list = document.getElementById('task-list');
  if (!list) return;

  list.innerHTML = '';
  if (!Array.isArray(tasks)) {
    list.innerHTML = '<p>No tasks yet.</p>';
    return;
  }

  if (tasks.length === 0) {
    list.innerHTML = '<p>No upcoming tasks.</p>';
    return;
  }

  tasks.forEach(t => {
    list.innerHTML += `
      <div class="task-item ${t.completed ? 'done' : ''}">
        <span onclick="toggleTask(${t.id})">
          ${t.completed ? '✅' : '⬜'}
        </span>
        <span>${t.task}</span>
        <span>${t.dueDate}</span>
        <button onclick="deleteTask(${t.id})">✕</button>
      </div>`;
  });
}

async function addTask() {
  const task = document.getElementById('task-input')?.value?.trim();
  const dueDate = document.getElementById('task-date')?.value;

  if (!task || !dueDate) {
    alert('Enter task and date');
    return;
  }

  const data = await fetchAPI('/tasks', {
    method: 'POST',
    body: JSON.stringify({ task, dueDate })
  });

  if (data.success) {
    document.getElementById('task-input').value = '';
    document.getElementById('task-date').value = '';
    loadTasks();
  }
}

async function toggleTask(id) {
  await fetchAPI(`/tasks/${id}`, { method: 'PATCH' });
  loadTasks();
}

async function deleteTask(id) {
  await fetchAPI(`/tasks/${id}`, { method: 'DELETE' });
  loadTasks();
}

// ── REMINDERS ─────────────────────────────────────────────────

async function loadReminders() {
  const reminders = await fetchAPI('/reminders');

  const list = document.getElementById('reminder-list');
  if (!list) return;

  list.innerHTML = '';
  if (!Array.isArray(reminders)) return;

  reminders.forEach(r => {
    list.innerHTML += `
      <div>
        <strong>${r.title}</strong>
        <span>${r.date} ${r.time}</span>
        <button onclick="deleteReminder(${r.id})">✕</button>
      </div>`;
  });
}

async function addReminder() {
  const title = document.getElementById('reminder-title')?.value;
  const date = document.getElementById('reminder-date')?.value;
  const time = document.getElementById('reminder-time')?.value;

  if (!title || !date || !time) {
    alert('All fields required');
    return;
  }

  const data = await fetchAPI('/reminders', {
    method: 'POST',
    body: JSON.stringify({ title, date, time })
  });

  if (data.success) {
    document.getElementById('reminder-title').value = '';
    document.getElementById('reminder-date').value = '';
    document.getElementById('reminder-time').value = '';
    loadReminders();
  }
}

async function deleteReminder(id) {
  await fetchAPI(`/reminders/${id}`, { method: 'DELETE' });
  loadReminders();
}

// ── ADMIN: QUESTIONS ──────────────────────────────────────────

async function loadAdminQuestions() {
  checkAuth();
  const questions = await fetchAPI('/admin/questions');

  const list = document.getElementById('admin-questions-list');
  if (!list) return;

  list.innerHTML = '';
  if (!Array.isArray(questions)) {
    list.innerHTML = '<p>No questions uploaded yet.</p>';
    return;
  }

  questions.forEach(q => {
    const row = document.createElement('div');
    row.className = 'question-item';
    row.innerHTML = `
      <div class="question-header">
        <h4>${q.title}</h4>
        <span class="difficulty-badge">${q.difficulty}</span>
      </div>
      <p><strong>${q.subject}</strong> | ${q.points} pts | Due: ${q.due_date}</p>
      <button class="btn-red" onclick="deleteAdminQuestion(${q.id})">Delete</button>`;
    list.appendChild(row);
  });
}

async function uploadQuestion() {
  const subject = document.getElementById('q-subject')?.value?.trim();
  const title = document.getElementById('q-title')?.value?.trim();
  const description = document.getElementById('q-description')?.value?.trim();
  const question_text = document.getElementById('q-text')?.value?.trim();
  const difficulty = document.getElementById('q-difficulty')?.value;
  const due_date = document.getElementById('q-due-date')?.value;
  const points = document.getElementById('q-points')?.value;
  
  const option_a = document.getElementById('q-opt-a')?.value?.trim();
  const option_b = document.getElementById('q-opt-b')?.value?.trim();
  const option_c = document.getElementById('q-opt-c')?.value?.trim();
  const option_d = document.getElementById('q-opt-d')?.value?.trim();
  const correct_option = document.getElementById('q-correct-opt')?.value;

  if (!subject || !title || !question_text || !due_date) {
    alert('Required fields missing');
    return;
  }

  const formData = new FormData();
  formData.append('subject', subject);
  formData.append('title', title);
  formData.append('description', description);
  formData.append('question_text', question_text);
  formData.append('difficulty', difficulty);
  formData.append('due_date', due_date);
  formData.append('points', points);
  
  if (option_a) formData.append('option_a', option_a);
  if (option_b) formData.append('option_b', option_b);
  if (option_c) formData.append('option_c', option_c);
  if (option_d) formData.append('option_d', option_d);
  if (correct_option) formData.append('correct_option', correct_option);

  const res = await fetch(`${API}/admin/questions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    body: formData
  });

  const data = await res.json();
  if (data.success) {
    alert('Question uploaded!');
    document.getElementById('q-subject').value = '';
    document.getElementById('q-title').value = '';
    document.getElementById('q-description').value = '';
    document.getElementById('q-text').value = '';
    document.getElementById('q-due-date').value = '';
    
    // Clear MCQ options
    const optIds = ['q-opt-a', 'q-opt-b', 'q-opt-c', 'q-opt-d'];
    optIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const correctEl = document.getElementById('q-correct-opt');
    if (correctEl) correctEl.value = '';
    
    loadAdminQuestions();
  } else {
    alert(data.error || 'Upload failed');
  }
}

async function deleteAdminQuestion(id) {
  if (!confirm('Delete this question?')) return;

  const data = await fetchAPI(`/admin/questions/${id}`, { method: 'DELETE' });
  if (data.success) {
    loadAdminQuestions();
  }
}

async function loadAdminSubmissions() {
  const submissions = await fetchAPI('/admin/submissions');

  const tbody = document.getElementById('submissions-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!Array.isArray(submissions)) return;

  submissions.forEach(s => {
    const statusClass = s.is_completed ? 'completed' : 'pending';
    const scoreDisplay = s.is_completed ? `<strong>${s.score || 0} / ${s.points || 0}</strong>` : '—';
    
    tbody.innerHTML += `
      <tr>
        <td>${s.title}</td>
        <td>${s.name}</td>
        <td>${s.email}</td>
        <td><span class="${statusClass}">${s.is_completed ? '✅ Submitted' : '⏳ Pending'}</span></td>
        <td>${scoreDisplay}</td>
        <td class="answer-cell">${s.answer_text?.substring(0, 50) || '—'}...</td>
        <td>${new Date(s.submitted_at).toLocaleDateString()}</td>
      </tr>`;
  });
}
