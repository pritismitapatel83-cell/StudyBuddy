# 🏗️ Study Buddy Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Public folder)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  index.html      register.html      dashboard.html           │
│  (Login)         (Signup)           (Student view)           │
│       │               │                    │                 │
│       └───────────────┴────────────────────┘                 │
│                    ↓                                          │
│              api.js (Client-side API)                        │
│         • Manages authentication                             │
│         • Makes fetch requests                               │
│         • Stores JWT tokens                                  │
│         • Handles responses                                  │
│                                                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ↓ (HTTP/JSON)
              
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express.js)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  server.js                                                   │
│  ├── Authentication Routes                                   │
│  │   ├── POST /api/auth/login         (verify user)         │
│  │   ├── POST /api/auth/register      (create account)      │
│  │   └── POST /api/auth/logout        (destroy session)      │
│  │                                                            │
│  ├── Student Routes                                          │
│  │   ├── GET  /api/dashboard          (get questions)       │
│  │   ├── GET  /api/questions/:id      (get details)         │
│  │   └── POST /api/questions/:id/submit (submit answer)     │
│  │                                                            │
│  ├── Admin Routes                                            │
│  │   ├── POST   /api/admin/questions  (upload Q)            │
│  │   ├── GET    /api/admin/questions  (list Q)              │
│  │   ├── DELETE /api/admin/questions/:id                    │
│  │   └── GET    /api/admin/submissions (view answers)       │
│  │                                                            │
│  └── Authentication Middleware                              │
│      └── Validates JWT tokens before allowing access         │
│                                                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ↓ (SQL Queries via better-sqlite3)
              
┌─────────────────────────────────────────────────────────────┐
│            DATABASE (SQLite3 - studybuddy.db)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📋 Users Table                                              │
│  ├── id (PRIMARY KEY)                                        │
│  ├── name                                                    │
│  ├── email (UNIQUE)                                          │
│  ├── password_hash                                           │
│  ├── role (admin/student)                                    │
│  ├── course                                                  │
│  ├── semester                                                │
│  └── created_at                                              │
│                                                               │
│  ❓ Questions Table                                           │
│  ├── id (PRIMARY KEY)                                        │
│  ├── admin_id (FOREIGN KEY → Users)                          │
│  ├── subject                                                 │
│  ├── title                                                   │
│  ├── description                                             │
│  ├── question_text                                           │
│  ├── difficulty                                              │
│  ├── due_date                                                │
│  ├── points                                                  │
│  └── created_at                                              │
│                                                               │
│  📝 Student_Submissions Table                                │
│  ├── id (PRIMARY KEY)                                        │
│  ├── question_id (FOREIGN KEY → Questions)                   │
│  ├── student_id (FOREIGN KEY → Users)                        │
│  ├── answer_text                                             │
│  ├── is_completed (0/1)                                      │
│  └── submitted_at                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Complete User Journey

### 🔐 Flow 1: Student Registration & Login

```
User fills form (name, email, password, course, semester)
          ↓
    Click "Create Account"
          ↓
  POST /api/auth/register
          ↓
  server.js validates input
          ↓
  INSERT into Users table
          ↓
  "Registration successful"
          ↓
  Click "Sign In"
          ↓
  POST /api/auth/login
          ↓
  server.js checks email & password in Users table
          ↓
  Creates JWT token
          ↓
  Returns token + user object
          ↓
  localStorage stores token
          ↓
  Redirect to dashboard.html
```

### 📚 Flow 2: Admin Creates Question

```
Admin logs in with admin@studybuddy.com
          ↓
  Auth verified (role = 'admin')
          ↓
  Redirect to admin-dashboard.html
          ↓
  Admin fills question form:
  - Subject: "DBMS"
  - Title: "Database Design"
  - Question Text: "Design a database..."
  - Due Date: "2026-04-15"
  - Points: 20
          ↓
  Click "Upload Question"
          ↓
  POST /api/admin/questions (with token)
          ↓
  server.js validates:
    • Token is valid (authMiddleware)
    • User role is 'admin'
    • All required fields present
          ↓
  INSERT into Questions table:
  - admin_id: 1 (logged-in admin's ID)
  - subject, title, question_text, etc.
          ↓
  "Question uploaded!"
          ↓
  Question appears in "Your Questions" list
```

### 👨‍🎓 Flow 3: Student Views Dashboard

```
Student logs in with their account
          ↓
  Token stored, redirect to dashboard.html
          ↓
  Page loads, calls: GET /api/dashboard
          ↓
  server.js:
    1. Validates token (authMiddleware)
    2. Gets user profile: SELECT * FROM users WHERE id = ?
    3. Gets ALL questions: SELECT * FROM questions
    4. Gets student's submissions: SELECT * FROM student_submissions WHERE student_id = ?
    5. Calculates progress:
       - Total questions = COUNT(questions)
       - Completed = COUNT(submissions where is_completed = 1)
       - Percent = (completed / total) * 100
          ↓
  Returns JSON with:
    {
      profile: {name, course, semester, ...},
      questions: [{id, title, subject, due_date, points, submitted: 0/1}, ...],
      progress: {completed, total, percent}
    }
          ↓
  Frontend js/dashboard.html displays:
    - Welcome message with student name
    - Progress bar and counter
    - Question cards with status badges
    - "View & Submit" buttons
```

### ✍️ Flow 4: Student Submits Answer

```
Student clicks question on dashboard
          ↓
  Question ID: 1
          ↓
  Redirect to question-detail.html?id=1
          ↓
  Calls: GET /api/questions/1
          ↓
  server.js fetches question from database
  SELECT * FROM questions WHERE id = 1
          ↓
  Returns question details
          ↓
  Student reads question, writes answer in textarea
          ↓
  Clicks "Submit Answer"
          ↓
  POST /api/questions/1/submit
  Body: {answer: "My answer text..."}
          ↓
  server.js:
    1. Validates token
    2. Checks if submission exists:
       SELECT * FROM student_submissions 
       WHERE question_id = 1 AND student_id = 2
          ↓
    3a. If exists: UPDATE submission
    3b. If not exists: INSERT new submission
          ↓
  Database updated
          ↓
  "Answer submitted!"
          ↓
  Redirect back to dashboard
          ↓
  Dashboard reloads:
    - Question now shows "✅ Completed"
    - Progress bar updates to 100%
    - Progress counter: "1 of 1 completed"
```

### 📋 Flow 5: Admin Views Submissions

```
Admin logs in
          ↓
  Redirect to admin-dashboard.html
          ↓
  Page loads, calls: GET /api/admin/submissions
          ↓
  server.js:
    1. Validates token & role (admin only)
    2. Joins tables:
       SELECT ss.*, q.title, u.name, u.email
       FROM student_submissions ss
       JOIN questions q ON ss.question_id = q.id
       JOIN users u ON ss.student_id = u.id
          ↓
  Returns array of submissions:
    [
      {
        question_id: 1,
        student_id: 2,
        answer_text: "...",
        submitted_at: "2026-03-28 10:30:00",
        is_completed: 1,
        title: "Database Design Assignment",
        name: "Alice Johnson",
        email: "alice@email.com"
      },
      ...
    ]
          ↓
  Frontend displays in table:
    | Question | Student | Email | Status | Answer | Time |
    | Database | Alice   | ... | ✅ | ... | 10:30 |
```

---

## Authentication & Security Flow

```
┌────────────────────────────────────────────────┐
│         Client Sends Request                   │
└────────────────────┬───────────────────────────┘
                     │
                     ↓
        POST /api/auth/login
        Body: {email, password}
                     │
                     ↓
┌────────────────────────────────────────────────┐
│    Server Validates Credentials                │
│    SELECT * FROM users                         │
│    WHERE email = ? AND password = ?            │
└────────────────────┬───────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
   ✅ Match                    ❌ No Match
       │                           │
       ↓                           ↓
  Create JWT Token        Return Error
  Set: sessions[token]    {success: false}
  Return token
       │
       ↓
┌────────────────────────────────────────────────┐
│    Client Stores Token in localStorage         │
│    localStorage.setItem('token', token)        │
└────────────────────┬───────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────┐
│  Future Requests Include Token                 │
│  Authorization: Bearer [TOKEN]                 │
└────────────────────┬───────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────┐
│   authMiddleware Validates Token               │
│   if (!sessions.has(token))                    │
│     return 401 Unauthorized                    │
│  else                                          │
│     req.user = sessions.get(token)             │
│     next()                                     │
└────────────────────┬───────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
   ✅ Valid                   ❌ Invalid
       │                           │
       ↓                           ↓
  Process Request        Return Error
       │                  {error: "Unauthorized"}
       ↓
  Check Role (if admin endpoint)
       │
       ├─ Admin? → Process
       └─ Student? → Reject
```

---

## Database Relationships (ER Diagram)

```
┌──────────────┐         ┌─────────────┐
│    users     │         │  questions  │
├──────────────┤         ├─────────────┤
│ id (PK)      │◄────┐   │ id (PK)     │
│ name         │     │   │ admin_id(FK)├───────┐
│ email        │     │   │ subject     │       │
│ password     │     │   │ title       │       │
│ role         │     │   │ question... │       │
│ course       │     └───┤ due_date    │       │
│ semester     │         │ points      │       │
└──────────────┘         └─────────────┘       │
       ▲                                         │
       │                                         │
       │                 ┌──────────────────────┘
       │                 │
       │        ┌────────█─────────┐
       │        │student_          │
       │        │submissions       │
       │        ├──────────────────┤
       │        │ id (PK)          │
       │        │ question_id(FK)──┤
       │        │ student_id (FK)──┤
       │        │ answer_text      │
       │        │ is_completed     │
       │        │ submitted_at     │
       │        └──────────────────┘
```

**Keys:**
- PK = Primary Key (unique identifier)
- FK = Foreign Key (reference to another table)
- One admin can create many questions
- One student can submit many answers
- One question can receive many submissions

---

## Session Management

```
In-Memory Session Store
(Current - for development):

sessions = Map {
  "uuid-token-1": {
    id: 1,
    name: "Admin",
    email: "admin@studybuddy.com",
    role: "admin"
  },
  "uuid-token-2": {
    id: 2,
    name: "Alice Johnson",
    email: "alice@email.com",
    role: "student"
  }
}

⚠️ Note: Sessions are lost if server restarts!

For Production:
- Use Redis for persistent sessions
- Use bcrypt for password hashing
- Use httpOnly cookies instead of localStorage
```

---

## Error Handling Flow

```
Request comes in
      │
      ↓
authMiddleware
  ├─ Token missing? → 401 Unauthorized
  └─ Session invalid? → 401 Unauthorized
      │
      ├─ (Token valid)
      ↓
Route Handler
  ├─ Missing fields? → 400 Bad Request
  ├─ Database error? → 500 Server Error
  └─ Role mismatch? → 403 Forbidden
      │
      ├─ (All valid)
      ↓
Process & Respond
  └─ Return success/error JSON
```

---

## Scalability Considerations

Current limitations & future improvements:

| Aspect | Current | Production |
|--------|---------|-----------|
| **Sessions** | In-memory | Redis |
| **Passwords** | Plain text | bcrypt |
| **Database** | SQLite | PostgreSQL |
| **Caching** | None | Redis cache |
| **API Rate Limit** | None | Rate limiter |
| **File Storage** | Local disk | Cloud (S3) |
| **Authentication** | JWT in memory | JWT + Refresh tokens |
| **Logging** | console.log | ELK stack |
| **Monitoring** | None | Prometheus + Grafana |

---