const Database = require('better-sqlite3');
const db = new Database('studybuddy.db');

db.exec(`
-- DROP TABLES
DROP TABLE IF EXISTS student_submissions;
DROP TABLE IF EXISTS student_questions;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS rankings;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS users;

-- TABLE 1: USERS (with role: admin or student)
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL DEFAULT 'student',
    course        VARCHAR(50)   DEFAULT 'BCA',
    semester      VARCHAR(20)   DEFAULT 'Semester IV',
    avatar_url    VARCHAR(255)  DEFAULT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: QUESTIONS (uploaded by admin)
CREATE TABLE questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id        INT          NOT NULL,
    subject         VARCHAR(100) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    question_text   TEXT         NOT NULL,
    difficulty      VARCHAR(20)  DEFAULT 'Medium',
    due_date        DATE         NOT NULL,
    points          INTEGER      DEFAULT 10,
    option_a        TEXT,
    option_b        TEXT,
    option_c        TEXT,
    option_d        TEXT,
    correct_option  VARCHAR(1),
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- TABLE 3: STUDENT SUBMISSIONS (student answers to questions)
CREATE TABLE student_submissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INT  NOT NULL,
    student_id  INT  NOT NULL,
    answer_text TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_completed INTEGER DEFAULT 0,
    score        INTEGER DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (student_id) REFERENCES users(id),
    UNIQUE(question_id, student_id)
);

-- TABLE 4: NOTES (student uploaded)
CREATE TABLE notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INT          NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    uploaded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- TABLE 5: TASKS (student personal tasks)
CREATE TABLE tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INT          NOT NULL,
    task_title   VARCHAR(200) NOT NULL,
    due_date     DATE         NOT NULL,
    is_completed INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- TABLE 6: REMINDERS
CREATE TABLE reminders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INT          NOT NULL,
    title         VARCHAR(200) NOT NULL,
    reminder_date DATE         NOT NULL,
    reminder_time TIME         NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- TABLE 7: MESSAGES
CREATE TABLE messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id   INT  NOT NULL,
    receiver_id INT  NOT NULL,
    content     TEXT NOT NULL,
    sent_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- TABLE 8: RANKINGS
CREATE TABLE rankings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INT         NOT NULL,
    points     INT         NOT NULL DEFAULT 0,
    week_label VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- TABLE 9: CONNECTION REQUESTS (for student connections)
CREATE TABLE connection_requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id       INT       NOT NULL,
    receiver_id     INT       NOT NULL,
    subject         VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'pending',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at    TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id),
    UNIQUE(sender_id, receiver_id)
);

-- TABLE 10: CONNECTIONS (accepted connections)
CREATE TABLE connections (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id_1       INT       NOT NULL,
    user_id_2       INT       NOT NULL,
    subject         VARCHAR(100),
    connected_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id_1) REFERENCES users(id),
    FOREIGN KEY (user_id_2) REFERENCES users(id),
    UNIQUE(user_id_1, user_id_2)
);

-- TABLE 11: STUDY GROUPS
CREATE TABLE study_groups (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            VARCHAR(150) NOT NULL,
    subject         VARCHAR(100),
    created_by      INT          NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- TABLE 12: GROUP MEMBERS
CREATE TABLE group_members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id        INT          NOT NULL,
    user_id         INT          NOT NULL,
    joined_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES study_groups(id),
    FOREIGN KEY (user_id)  REFERENCES users(id),
    UNIQUE(group_id, user_id)
);

-- TABLE 13: GROUP MESSAGES
CREATE TABLE group_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id        INT          NOT NULL,
    sender_id       INT          NOT NULL,
    content         TEXT         NOT NULL,
    attachment_url  VARCHAR(500),
    sent_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id)  REFERENCES study_groups(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- TABLE 14: DIRECT MESSAGES (Real-time messaging)
CREATE TABLE direct_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id       INT          NOT NULL,
    receiver_id     INT          NOT NULL,
    content         TEXT         NOT NULL,
    attachment_url  VARCHAR(500),
    is_read         INTEGER      DEFAULT 0,
    sent_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- INITIAL DATA: Create one admin account
INSERT INTO users (name, email, password_hash, role, course, semester) VALUES
('Admin', 'admin@studybuddy.com', 'admin123', 'admin', NULL, NULL);
`);

// Verify tables were created
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
console.log('✅ Database created successfully!');
console.log('📋 Tables created:');
tables.forEach(t => console.log('   -', t.name));
console.log('\n📌 Initial Admin Account:');
console.log('   Email: admin@studybuddy.com');
console.log('   Password: admin123');