const Database = require('better-sqlite3');
const db = new Database('studybuddy.db');

db.exec(`
-- DROP TABLES
DROP TABLE IF EXISTS rankings;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS users;

-- TABLE 1: USERS
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    course        VARCHAR(50)   NOT NULL DEFAULT 'BCA',
    semester      VARCHAR(20)   NOT NULL DEFAULT 'Semester IV',
    avatar_url    VARCHAR(255)           DEFAULT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: NOTES
CREATE TABLE notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INT          NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    uploaded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- TABLE 3: TASKS
CREATE TABLE tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INT          NOT NULL,
    task_title   VARCHAR(200) NOT NULL,
    due_date     DATE         NOT NULL,
    is_completed INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- TABLE 4: REMINDERS
CREATE TABLE reminders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INT          NOT NULL,
    title         VARCHAR(200) NOT NULL,
    reminder_date DATE         NOT NULL,
    reminder_time TIME         NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- TABLE 5: MESSAGES
CREATE TABLE messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id   INT  NOT NULL,
    receiver_id INT  NOT NULL,
    content     TEXT NOT NULL,
    sent_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- TABLE 6: RANKINGS
CREATE TABLE rankings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INT         NOT NULL,
    points     INT         NOT NULL DEFAULT 0,
    week_label VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SAMPLE DATA
INSERT INTO users (name, email, password_hash, course, semester) VALUES
('Student',     'student@email.com', 'hashed_pass_1', 'BCA', 'Semester IV'),
('Rahul Das',   'rahul@email.com',   'hashed_pass_2', 'BCA', 'Semester IV'),
('Anita',       'anita@email.com',   'hashed_pass_3', 'BCA', 'Semester IV'),
('Amit Kumar',  'amit@email.com',    'hashed_pass_4', 'BCA', 'Semester IV'),
('Sneha Patel', 'sneha@email.com',   'hashed_pass_5', 'BCA', 'Semester IV');

INSERT INTO notes (user_id, subject_name, file_name, file_path) VALUES
(1, 'Software Engineering', 'Unit-1.pdf', 'uploads/notes/unit1_se.pdf'),
(2, 'DBMS',                 'Unit-3.pdf', 'uploads/notes/unit3_dbms.pdf');

INSERT INTO tasks (user_id, task_title, due_date, is_completed) VALUES
(1, 'DBMS Assignment',          '2026-02-10', 0),
(1, 'Software Engineering Lab', '2026-03-05', 0),
(2, 'Computer Networks Notes',  '2026-02-15', 1);

INSERT INTO reminders (user_id, title, reminder_date, reminder_time) VALUES
(1, 'Submit DBMS Assignment', '2026-02-10', '09:00:00'),
(1, 'Group Study Session',    '2026-02-12', '14:00:00');

INSERT INTO messages (sender_id, receiver_id, content) VALUES
(1, 3, 'Hi! Have you completed DBMS notes?'),
(3, 1, 'Yes, I finished Unit-3 today!');

INSERT INTO rankings (user_id, points, week_label) VALUES
(4, 420, '2026-W09'),
(5, 395, '2026-W09'),
(2, 370, '2026-W09'),
(1, 350, '2026-W09');
`);

// Verify tables were created
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
console.log('✅ Database created successfully!');
console.log('📋 Tables created:');
tables.forEach(t => console.log('   -', t.name));