// ============================================================
//  Study Buddy Backend Server v2.0
//  Express.js with Enhanced Auth & Admin Features
// ============================================================

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3000;

// ── WebSocket Connection Store ───────────────────────────────
const wsConnections = new Map(); // userId -> ws connection
const userSessions = new Map();  // token -> userId

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ── Database Connection ──────────────────────────────────────
const db = new Database('studybuddy.db');
db.pragma('journal_mode = WAL');

// ── Database Auto-Migrations for MCQs ────────────────────────
try {
  db.prepare('SELECT option_a FROM questions LIMIT 1').get();
} catch (err) {
  console.log('🔄 Migrating Database: Adding MCQ columns to questions table...');
  db.exec(`
    ALTER TABLE questions ADD COLUMN option_a TEXT;
    ALTER TABLE questions ADD COLUMN option_b TEXT;
    ALTER TABLE questions ADD COLUMN option_c TEXT;
    ALTER TABLE questions ADD COLUMN option_d TEXT;
    ALTER TABLE questions ADD COLUMN correct_option VARCHAR(1);
  `);
}

try {
  db.prepare('SELECT score FROM student_submissions LIMIT 1').get();
} catch (err) {
  console.log('🔄 Migrating Database: Adding score column to student_submissions...');
  db.exec(`ALTER TABLE student_submissions ADD COLUMN score INTEGER DEFAULT 0;`);
}

// ── Session Store (In-memory for demo, use Redis in production) ──
const sessions = new Map();

// ── File Upload Setup ────────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// ── Middleware: Get User from Session ────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token || !sessions.has(token)) {
    return res.json({ success: false, error: 'Unauthorized', code: 401 });
  }

  req.user = sessions.get(token);
  next();
};

// ── AUTHENTICATION ENDPOINTS ─────────────────────────────────

// Student Registration
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, course, semester } = req.body;

  if (!name || !email || !password || !course || !semester) {
    return res.json({ success: false, error: 'All fields required' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.json({ success: false, error: 'Email already registered' });
    }

    db.prepare(`
      INSERT INTO users (name, email, password_hash, role, course, semester)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, email, password, 'student', course, semester);

    res.json({ success: true, message: 'Registration successful. Please login.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Login (Admin or Student)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, error: 'Email and password required' });
  }

  try {
    const user = db.prepare('SELECT id, name, email, role, course, semester FROM users WHERE email = ? AND password_hash = ?')
      .get(email, password);

    if (!user) {
      return res.json({ success: false, error: 'Invalid email or password' });
    }

    // Create session token
    const token = uuidv4();
    sessions.set(token, user);
    userSessions.set(token, user.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Logout
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) sessions.delete(token);
  res.json({ success: true });
});

// Get Current User
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── STUDENT DASHBOARD ENDPOINTS ──────────────────────────────

// Get Dashboard Data
app.get('/api/dashboard', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const profile = db.prepare('SELECT id, name, course, semester, email FROM users WHERE id = ?').get(userId);

    // Get assigned questions
    const questions = db.prepare(`
      SELECT id, subject, title, description, difficulty, due_date, points
      FROM questions
      ORDER BY due_date ASC
    `).all();

    // Get student submissions
    const submissions = db.prepare(`
      SELECT question_id, is_completed
      FROM student_submissions
      WHERE student_id = ?
    `).all(userId);

    const submissionMap = new Map();
    submissions.forEach(s => {
      submissionMap.set(s.question_id, s.is_completed);
    });

    // Enhance questions with submission status
    const questionsWithStatus = questions.map(q => ({
      ...q,
      submitted: submissionMap.get(q.id) || 0
    }));

    // Calculate progress
    const totalQuestions = questionsWithStatus.length;
    const completedQuestions = questionsWithStatus.filter(q => q.submitted).length;
    const progressPercent = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;

    res.json({
      profile,
      questions: questionsWithStatus,
      progress: {
        completed: completedQuestions,
        total: totalQuestions,
        percent: progressPercent
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Single Question
app.get('/api/questions/:id', authMiddleware, (req, res) => {
  try {
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
    
    if (!question) {
      return res.json({ success: false, error: 'Question not found' });
    }

    const submission = db.prepare('SELECT * FROM student_submissions WHERE question_id = ? AND student_id = ?')
      .get(req.params.id, req.user.id);

    res.json({
      success: true,
      question,
      submission: submission || null
    });
  } catch (err) {
    console.error('Question fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Submit Answer to Question
app.post('/api/questions/:id/submit', authMiddleware, (req, res) => {
  const { answer } = req.body;

  if (!answer) {
    return res.json({ success: false, error: 'Answer required' });
  }

  try {
    const existing = db.prepare('SELECT id FROM student_submissions WHERE question_id = ? AND student_id = ?')
      .get(req.params.id, req.user.id);

    if (existing) {
      db.prepare('UPDATE student_submissions SET answer_text = ?, is_completed = 1, submitted_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(answer, existing.id);
    } else {
      db.prepare('INSERT INTO student_submissions (question_id, student_id, answer_text, is_completed) VALUES (?, ?, ?, ?)')
        .run(req.params.id, req.user.id, answer, 1);
    }

    res.json({ success: true, message: 'Answer submitted!' });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── PROFILE ENDPOINTS ────────────────────────────────────────

app.get('/api/profile', authMiddleware, (req, res) => {
  try {
    const profile = db.prepare('SELECT id, name, email, course, semester FROM users WHERE id = ?').get(req.user.id);
    res.json(profile);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/profile', authMiddleware, (req, res) => {
  const { name, course, semester } = req.body;

  if (!name) {
    return res.json({ success: false, error: 'Name required' });
  }

  try {
    db.prepare('UPDATE users SET name = ?, course = ?, semester = ? WHERE id = ?')
      .run(name, course, semester, req.user.id);

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── NOTES ENDPOINTS ──────────────────────────────────────────

app.get('/api/notes', authMiddleware, (req, res) => {
  try {
    // Get ALL notes from all students (visible to everyone)
    const notes = db.prepare(`
      SELECT n.id, n.subject_name as subject, n.file_name as fileName, n.file_path, u.name as uploader, n.uploaded_at as date
      FROM notes n
      JOIN users u ON n.user_id = u.id
      ORDER BY n.uploaded_at DESC
    `).all();

    const notesWithUrl = notes.map(n => ({
      id: n.id,
      subject: n.subject,
      fileName: n.fileName,
      uploader: n.uploader,
      uploaded_at: n.date,
      downloadUrl: '/' + n.file_path.replace(/\\/g, '/')
    }));

    res.json(notesWithUrl);
  } catch (err) {
    console.error('Notes fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/notes', authMiddleware, upload.single('file'), (req, res) => {
  const { subject } = req.body;

  if (!subject || !req.file) {
    return res.json({ success: false, error: 'Subject and file required' });
  }

  try {
    const filePath = path.relative(__dirname, req.file.path);

    db.prepare('INSERT INTO notes (user_id, subject_name, file_name, file_path) VALUES (?, ?, ?, ?)')
      .run(req.user.id, subject, req.file.originalname, filePath);

    res.json({ success: true, message: 'Note uploaded' });
  } catch (err) {
    console.error('Note upload error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.delete('/api/notes/:id', authMiddleware, (req, res) => {
  try {
    const note = db.prepare('SELECT file_path FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (note) {
      const fullPath = path.join(__dirname, note.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Note delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── TASKS ENDPOINTS ──────────────────────────────────────────

app.get('/api/tasks', authMiddleware, (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT id, task_title as task, due_date as dueDate, is_completed as completed
      FROM tasks WHERE user_id = ? ORDER BY due_date ASC
    `).all(req.user.id);

    res.json(tasks);
  } catch (err) {
    console.error('Tasks fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks', authMiddleware, (req, res) => {
  const { task, dueDate } = req.body;

  if (!task || !dueDate) {
    return res.json({ success: false, error: 'Task and date required' });
  }

  try {
    db.prepare('INSERT INTO tasks (user_id, task_title, due_date, is_completed) VALUES (?, ?, ?, ?)')
      .run(req.user.id, task, dueDate, 0);

    res.json({ success: true, message: 'Task added' });
  } catch (err) {
    console.error('Task add error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.patch('/api/tasks/:id', authMiddleware, (req, res) => {
  try {
    const task = db.prepare('SELECT is_completed FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (task) {
      const newStatus = task.is_completed ? 0 : 1;
      db.prepare('UPDATE tasks SET is_completed = ? WHERE id = ? AND user_id = ?')
        .run(newStatus, req.params.id, req.user.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Task toggle error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Task delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── REMINDERS ENDPOINTS ──────────────────────────────────────

app.get('/api/reminders', authMiddleware, (req, res) => {
  try {
    const reminders = db.prepare(`
      SELECT id, title, reminder_date as date, reminder_time as time
      FROM reminders WHERE user_id = ? ORDER BY reminder_date ASC
    `).all(req.user.id);

    res.json(reminders);
  } catch (err) {
    console.error('Reminders fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/reminders', authMiddleware, (req, res) => {
  const { title, date, time } = req.body;

  if (!title || !date || !time) {
    return res.json({ success: false, error: 'Title, date, and time required' });
  }

  try {
    db.prepare('INSERT INTO reminders (user_id, title, reminder_date, reminder_time) VALUES (?, ?, ?, ?)')
      .run(req.user.id, title, date, time);

    res.json({ success: true, message: 'Reminder added' });
  } catch (err) {
    console.error('Reminder add error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.delete('/api/reminders/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Reminder delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── ADMIN ENDPOINTS ──────────────────────────────────────────

// Admin: Upload Questions (with file attachment & optional MCQ)
app.post('/api/admin/questions', authMiddleware, upload.single('file'), (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json({ success: false, error: 'Admin only' });
  }

  const { subject, title, description, question_text, difficulty, due_date, points, option_a, option_b, option_c, option_d, correct_option } = req.body;

  if (!subject || !title || !question_text || !due_date) {
    return res.json({ success: false, error: 'Required fields missing' });
  }

  try {
    db.prepare(`
      INSERT INTO questions (admin_id, subject, title, description, question_text, difficulty, due_date, points, option_a, option_b, option_c, option_d, correct_option)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id, subject, title, description, question_text, 
      difficulty || 'Medium', due_date, points || 10,
      option_a || null, option_b || null, option_c || null, option_d || null, correct_option || null
    );

    res.json({ success: true, message: 'Question uploaded!' });
  } catch (err) {
    console.error('Question upload error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Admin: Get All Questions
app.get('/api/admin/questions', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json({ success: false, error: 'Admin only' });
  }

  try {
    const questions = db.prepare('SELECT id, subject, title, difficulty, due_date, points, created_at FROM questions ORDER BY created_at DESC')
      .all();

    res.json(questions);
  } catch (err) {
    console.error('Questions fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete Question
app.delete('/api/admin/questions/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json({ success: false, error: 'Admin only' });
  }

  try {
    db.prepare('DELETE FROM student_submissions WHERE question_id = ?').run(req.params.id);
    db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'Question deleted!' });
  } catch (err) {
    console.error('Question delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Admin: View All Submissions
app.get('/api/admin/submissions', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json({ success: false, error: 'Admin only' });
  }

  try {
    const submissions = db.prepare(`
      SELECT ss.id, q.title, u.name, u.email, ss.answer_text, ss.submitted_at, ss.is_completed, ss.score, q.points
      FROM student_submissions ss
      JOIN questions q ON ss.question_id = q.id
      JOIN users u ON ss.student_id = u.id
      ORDER BY ss.submitted_at DESC
    `).all();

    res.json(submissions);
  } catch (err) {
    console.error('Submissions fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TESTS ENDPOINTS ──────────────────────────────────────────

// Student: Get Available Tests (Questions grouped by Subject)
app.get('/api/tests/available', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    // Get all admin questions
    const questions = db.prepare(`
      SELECT id, subject, title, description, question_text, difficulty, due_date, points, option_a, option_b, option_c, option_d
      FROM questions
      ORDER BY created_at ASC
    `).all();

    // Get user's submissions
    const submissions = db.prepare(`SELECT question_id, score FROM student_submissions WHERE student_id = ? AND is_completed = 1`).all(userId);
    const completedSet = new Set(submissions.map(s => s.question_id));
    
    // Group remaining (not completed) questions by Subject into "Tests"
    const groups = {};
    questions.forEach(q => {
      if (completedSet.has(q.id)) return; // skip completed

      if (!groups[q.subject]) {
        groups[q.subject] = {
          id: 'test_' + q.subject.replace(/[^a-zA-Z0-9]/g, '_'),
          title: q.subject + ' Test',
          subject: q.subject,
          questions: []
        };
      }
      
      // Filter out empty options to format as array
      const opts = [];
      if (q.option_a) opts.push({ id: 'A', text: q.option_a });
      if (q.option_b) opts.push({ id: 'B', text: q.option_b });
      if (q.option_c) opts.push({ id: 'C', text: q.option_c });
      if (q.option_d) opts.push({ id: 'D', text: q.option_d });

      groups[q.subject].questions.push({
        id: q.id,
        q: q.question_text,
        title: q.title,
        points: q.points,
        options: opts.length > 0 ? opts : null // If no MCQ options, keep null
      });
    });

    const tests = Object.values(groups);
    res.json({ success: true, tests });
  } catch (err) {
    console.error('Available tests error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Student: Submit Test
app.post('/api/tests/submit', authMiddleware, (req, res) => {
  const { test_id, answers } = req.body;
  // answers object mapping question_id -> picked option ('A','B', etc.) or text
  
  if (!answers) {
    return res.json({ success: false, error: 'Answers required' });
  }

  try {
    const userId = req.user.id;
    let scoreEarned = 0;
    let totalScore = 0;

    for (const [qId, ans] of Object.entries(answers)) {
      // Get correct option
      const question = db.prepare('SELECT correct_option, points FROM questions WHERE id = ?').get(qId);
      if (!question) continue;
      
      totalScore += question.points || 0;
      let earned = 0;

      // Grade if it's an MCQ, or just save text if it's not
      if (question.correct_option && question.correct_option === ans) {
        earned = question.points || 0;
        scoreEarned += earned;
      } else if (!question.correct_option) {
        // Not MCQ, placeholder marking completed
        earned = 0;
      }

      // Upsert into student_submissions
      const existing = db.prepare('SELECT id FROM student_submissions WHERE question_id = ? AND student_id = ?').get(qId, userId);
      
      if (existing) {
        db.prepare('UPDATE student_submissions SET answer_text = ?, is_completed = 1, score = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(String(ans), earned, existing.id);
      } else {
        db.prepare('INSERT INTO student_submissions (question_id, student_id, answer_text, is_completed, score) VALUES (?, ?, ?, 1, ?)')
          .run(qId, userId, String(ans), earned);
      }
    }
    
    // Calculate percentage
    const pct = totalScore > 0 ? Math.round((scoreEarned / totalScore) * 100) : 100;

    res.json({ success: true, message: 'Test submitted!', score: scoreEarned, total: totalScore, percent: pct });
  } catch (err) {
    console.error('Test submit error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── CONNECTION & GROUPING ENDPOINTS ──────────────────────────

// Get Students by Subject (for finding partners)
app.get('/api/students/by-subject/:subject', authMiddleware, (req, res) => {
  try {
    const subject = req.params.subject;
    const currentUserId = req.user.id;

    // Get all students taking same course who have questions in this subject
    // We'll use the course/semester as a grouping mechanism
    const students = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.email, u.course, u.semester
      FROM users u
      WHERE u.role = 'student' 
        AND u.id != ?
        AND u.course = (SELECT course FROM users WHERE id = ?)
      ORDER BY u.name ASC
    `).all(currentUserId, currentUserId);

    // Filter out already connected students
    const connectedIds = new Set();
    db.prepare(`
      SELECT user_id_2 as id FROM connections WHERE user_id_1 = ?
      UNION
      SELECT user_id_1 as id FROM connections WHERE user_id_2 = ?
    `).all(currentUserId, currentUserId).forEach(row => {
      connectedIds.add(row.id);
    });

    const available = students.filter(s => !connectedIds.has(s.id));

    res.json({
      success: true,
      subject,
      students: available
    });
  } catch (err) {
    console.error('Students fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Send Connection Request
app.post('/api/connections/request', authMiddleware, (req, res) => {
  const { receiver_id, subject } = req.body;
  const sender_id = req.user.id;

  if (!receiver_id) {
    return res.json({ success: false, error: 'Receiver ID required' });
  }

  try {
    // Check if request already exists
    const existing = db.prepare(`
      SELECT id FROM connection_requests 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).get(sender_id, receiver_id, receiver_id, sender_id);

    if (existing) {
      return res.json({ success: false, error: 'Request already exists' });
    }

    db.prepare(`
      INSERT INTO connection_requests (sender_id, receiver_id, subject, status)
      VALUES (?, ?, ?, 'pending')
    `).run(sender_id, receiver_id, subject);

    // Send notification message
    db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES (?, ?, ?)
    `).run(sender_id, receiver_id, `Connection request for ${subject || 'study partnership'}`);

    res.json({ 
      success: true, 
      message: 'Connection request sent! Waiting for confirmation...' 
    });
  } catch (err) {
    console.error('Connection request error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get Pending Connection Requests
app.get('/api/connections/requests', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    const requests = db.prepare(`
      SELECT cr.id, cr.sender_id, cr.receiver_id, cr.subject, cr.status, cr.created_at,
             u.name, u.email, u.course, u.semester
      FROM connection_requests cr
      JOIN users u ON cr.sender_id = u.id
      WHERE cr.receiver_id = ? AND cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `).all(userId);

    res.json({
      success: true,
      requests
    });
  } catch (err) {
    console.error('Requests fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Accept Connection Request
app.post('/api/connections/accept/:requestId', authMiddleware, (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.user.id;

    const request = db.prepare(`
      SELECT sender_id, receiver_id, subject FROM connection_requests 
      WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `).get(requestId, userId);

    if (!request) {
      return res.json({ success: false, error: 'Request not found' });
    }

    // Update request status
    db.prepare(`
      UPDATE connection_requests SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(requestId);

    // Create connection (ensure consistent ordering)
    const [user1, user2] = request.sender_id < request.receiver_id 
      ? [request.sender_id, request.receiver_id]
      : [request.receiver_id, request.sender_id];

    db.prepare(`
      INSERT OR IGNORE INTO connections (user_id_1, user_id_2, subject)
      VALUES (?, ?, ?)
    `).run(user1, user2, request.subject);

    // Send confirmation message
    db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES (?, ?, ?)
    `).run(userId, request.sender_id, 'Accepted your connection request! ✅');

    res.json({ 
      success: true, 
      message: 'Connection accepted! You are now connected.' 
    });
  } catch (err) {
    console.error('Accept connection error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Reject Connection Request
app.post('/api/connections/reject/:requestId', authMiddleware, (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.user.id;

    const request = db.prepare(`
      SELECT sender_id FROM connection_requests 
      WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `).get(requestId, userId);

    if (!request) {
      return res.json({ success: false, error: 'Request not found' });
    }

    db.prepare(`
      UPDATE connection_requests SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(requestId);

    res.json({ success: true, message: 'Request rejected.' });
  } catch (err) {
    console.error('Reject connection error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get All Connections for Current User
app.get('/api/connections', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    const connections = db.prepare(`
      SELECT CASE 
        WHEN user_id_1 = ? THEN user_id_2 
        ELSE user_id_1 
      END as user_id,
      subject, connected_at
      FROM connections 
      WHERE user_id_1 = ? OR user_id_2 = ?
    `).all(userId, userId, userId);

    // Get user details for each connection
    const result = connections.map(conn => {
      const user = db.prepare(`SELECT id, name, email, course, semester FROM users WHERE id = ?`).get(conn.user_id);
      return { ...conn, user };
    });

    res.json({
      success: true,
      connections: result
    });
  } catch (err) {
    console.error('Connections fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── FILE UPLOAD ENDPOINT ────────────────────────────────────

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.json({ success: false, error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    filename: req.file.filename
  });
});

// ── STUDY GROUPS ENDPOINTS ───────────────────────────────────

// Get All Groups for Current User
app.get('/api/groups', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    const groups = db.prepare(`
      SELECT DISTINCT sg.* FROM study_groups sg
      JOIN group_members gm ON sg.id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY sg.created_at DESC
    `).all(userId);

    const result = groups.map(g => {
      const memberCount = db.prepare(`SELECT COUNT(*) as count FROM group_members WHERE group_id = ?`).get(g.id).count;
      return { ...g, memberCount };
    });

    res.json({
      success: true,
      groups: result
    });
  } catch (err) {
    console.error('Groups fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create Study Group
app.post('/api/groups', authMiddleware, (req, res) => {
  const { name, subject } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.json({ success: false, error: 'Group name required' });
  }

  try {
    const groupStmt = db.prepare(`
      INSERT INTO study_groups (name, subject, created_by)
      VALUES (?, ?, ?)
    `);
    const result = groupStmt.run(name, subject, userId);

    // Add creator as first member
    db.prepare(`
      INSERT INTO group_members (group_id, user_id)
      VALUES (?, ?)
    `).run(result.lastInsertRowid, userId);

    res.json({
      success: true,
      message: 'Group created! Invite other students to join.',
      groupId: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Join Study Group
app.post('/api/groups/:groupId/join', authMiddleware, (req, res) => {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.id;

    // Check if user already in group
    const existing = db.prepare(`
      SELECT id FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(groupId, userId);

    if (existing) {
      return res.json({ success: false, error: 'Already in this group' });
    }

    db.prepare(`
      INSERT INTO group_members (group_id, user_id)
      VALUES (?, ?)
    `).run(groupId, userId);

    res.json({ success: true, message: 'Joined group!' });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Leave Study Group
app.post('/api/groups/:groupId/leave', authMiddleware, (req, res) => {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.id;

    db.prepare(`
      DELETE FROM group_members WHERE group_id = ? AND user_id = ?
    `).run(groupId, userId);

    res.json({ success: true, message: 'Left group.' });
  } catch (err) {
    console.error('Leave group error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get Group Messages
app.get('/api/groups/:groupId/messages', authMiddleware, (req, res) => {
  try {
    const groupId = req.params.groupId;

    const messages = db.prepare(`
      SELECT gm.id, gm.content, gm.sent_at,
             u.name as sender_name, u.id as sender_id
      FROM group_messages gm
      JOIN users u ON gm.sender_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.sent_at ASC
    `).all(groupId);

    res.json({
      success: true,
      messages
    });
  } catch (err) {
    console.error('Group messages fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Send Group Message
app.post('/api/groups/:groupId/messages', authMiddleware, (req, res) => {
  const { content } = req.body;
  const groupId = req.params.groupId;
  const userId = req.user.id;

  if (!content) {
    return res.json({ success: false, error: 'Message required' });
  }

  try {
    db.prepare(`
      INSERT INTO group_messages (group_id, sender_id, content)
      VALUES (?, ?, ?)
    `).run(groupId, userId, content);

    res.json({ success: true, message: 'Message sent!' });
  } catch (err) {
    console.error('Send group message error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Start Server with WebSocket ─────────────────────────────
server.listen(PORT, () => {
  console.log(`\n✅ Study Buddy Backend v2.0 running at http://127.0.0.1:${PORT}`);
  console.log(`📡 API Base: http://127.0.0.1:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://127.0.0.1:${PORT}`);
  console.log(`\n📌 Admin Access:`);
  console.log(`   Email: admin@studybuddy.com`);
  console.log(`   Password: admin123\n`);
});

// ── WebSocket Event Handlers ─────────────────────────────────
wss.on('connection', (ws, req) => {
  let userId = null;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'auth':
          // Authenticate WebSocket connection
          const token = data.token;
          userId = userSessions.get(token);
          
          if (userId) {
            wsConnections.set(userId, ws);
            ws.send(JSON.stringify({ type: 'auth', success: true }));
            console.log(`✅ User ${userId} connected to WebSocket`);
          } else {
            ws.send(JSON.stringify({ type: 'auth', success: false }));
            ws.close();
          }
          break;
          
        case 'direct_message':
          // Send direct message to another user
          handleDirectMessage(data, userId);
          break;
          
        case 'group_message':
          // Send message to group
          handleGroupMessage(data, userId);
          break;
          
        case 'typing':
          // Notify other user that someone is typing
          const targetWs = wsConnections.get(data.target_user_id);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'user_typing',
              sender_id: userId,
              sender_name: data.sender_name
            }));
          }
          break;
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });
  
  ws.on('close', () => {
    if (userId) {
      wsConnections.delete(userId);
      console.log(`❌ User ${userId} disconnected`);
    }
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// ── Direct Message Handler ──────────────────────────────────
function handleDirectMessage(data, senderId) {
  const { receiver_id, content, attachment_url } = data;
  
  try {
    // Store message in database
    const messageId = db.prepare(`
      INSERT INTO direct_messages (sender_id, receiver_id, content, attachment_url)
      VALUES (?, ?, ?, ?)
    `).run(senderId, receiver_id, content, attachment_url || null);
    
    // Get sender info
    const sender = db.prepare('SELECT id, name FROM users WHERE id = ?').get(senderId);
    
    // Send to receiver if online
    const receiverWs = wsConnections.get(receiver_id);
    if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
      receiverWs.send(JSON.stringify({
        type: 'direct_message',
        id: messageId.lastInsertRowid,
        sender_id: senderId,
        sender_name: sender.name,
        content,
        attachment_url,
        timestamp: new Date().toISOString()
      }));
    }
    
    // Confirm to sender
    const senderWs = wsConnections.get(senderId);
    if (senderWs && senderWs.readyState === WebSocket.OPEN) {
      senderWs.send(JSON.stringify({
        type: 'message_confirmed',
        message_id: messageId.lastInsertRowid,
        status: 'sent'
      }));
    }
  } catch (err) {
    console.error('Error handling direct message:', err);
  }
}

// ── Group Message Handler ──────────────────────────────────
function handleGroupMessage(data, senderId) {
  const { group_id, content, attachment_url } = data;
  
  try {
    // Store message
    db.prepare(`
      INSERT INTO group_messages (group_id, sender_id, content, attachment_url)
      VALUES (?, ?, ?, ?)
    `).run(group_id, senderId, content, attachment_url || null);
    
    // Get sender info
    const sender = db.prepare('SELECT id, name FROM users WHERE id = ?').get(senderId);
    
    // Get all group members
    const members = db.prepare(`
      SELECT DISTINCT user_id FROM group_members WHERE group_id = ?
    `).all(group_id);
    
    // Send to all online members
    members.forEach(member => {
      const memberWs = wsConnections.get(member.user_id);
      if (memberWs && memberWs.readyState === WebSocket.OPEN) {
        memberWs.send(JSON.stringify({
          type: 'group_message',
          group_id,
          sender_id: senderId,
          sender_name: sender.name,
          content,
          attachment_url,
          timestamp: new Date().toISOString()
        }));
      }
    });
  } catch (err) {
    console.error('Error handling group message:', err);
  }
}