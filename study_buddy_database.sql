-- ============================================
--   STUDY BUDDY - Complete Database Script
--   Run this in phpMyAdmin or MySQL Workbench
-- ============================================

-- Step 1: Create and select the database
CREATE DATABASE IF NOT EXISTS study_buddy;
USE study_buddy;

-- ============================================
-- TABLE 1: USERS
-- Stores all student login & profile info
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,L
    course VARCHAR(50) DEFAULT 'BCA',
    semester VARCHAR(20) DEFAULT 'Semester IV',
    avatar_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 2: NOTES
-- Stores uploaded study notes/files
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 3: TASKS
-- Stores Study Planner tasks
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_title VARCHAR(200) NOT NULL,
    due_date DATE NOT NULL,
    is_completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 4: REMINDERS
-- Stores date & time reminders for students
-- ============================================
CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    reminder_date DATE NOT NULL,
    reminder_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 5: MESSAGES
-- Stores Student Connect chat messages
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 6: RANKINGS
-- Stores weekly study points/leaderboard
-- ============================================
CREATE TABLE IF NOT EXISTS rankings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    points INT DEFAULT 0,
    week_label VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- SAMPLE DATA (for testing your project)
-- ============================================

-- Insert sample students
INSERT INTO users (name, email, password_hash, course, semester) VALUES
('Student',    'student@email.com',  'hashed_pass_1', 'BCA', 'Semester IV'),
('Rahul Das',  'rahul@email.com',    'hashed_pass_2', 'BCA', 'Semester IV'),
('Anita',      'anita@email.com',    'hashed_pass_3', 'BCA', 'Semester IV'),
('Amit Kumar', 'amit@email.com',     'hashed_pass_4', 'BCA', 'Semester IV'),
('Sneha Patel','sneha@email.com',    'hashed_pass_5', 'BCA', 'Semester IV');

-- Insert sample notes
INSERT INTO notes (user_id, subject_name, file_name, file_path) VALUES
(1, 'Software Engineering', 'Unit-1.pdf', 'uploads/notes/unit1_se.pdf'),
(2, 'DBMS',                 'Unit-3.pdf', 'uploads/notes/unit3_dbms.pdf');

-- Insert sample tasks
INSERT INTO tasks (user_id, task_title, due_date, is_completed) VALUES
(1, 'DBMS Assignment',          '2026-02-10', 0),
(1, 'Software Engineering Lab', '2026-03-05', 0),
(2, 'Computer Networks Notes',  '2026-02-15', 1);

-- Insert sample reminders
INSERT INTO reminders (user_id, title, reminder_date, reminder_time) VALUES
(1, 'Submit DBMS Assignment', '2026-02-10', '09:00:00'),
(1, 'Group Study Session',    '2026-02-12', '14:00:00');

-- Insert sample messages
INSERT INTO messages (sender_id, receiver_id, content) VALUES
(1, 3, 'Hi! Have you completed DBMS notes?'),
(3, 1, 'Yes, I finished Unit-3 today!');

-- Insert sample rankings (current week)
INSERT INTO rankings (user_id, points, week_label) VALUES
(4, 420, '2026-W09'),
(5, 395, '2026-W09'),
(2, 370, '2026-W09'),
(1, 350, '2026-W09');

-- ============================================
-- VERIFY: Check all tables were created
-- ============================================
SHOW TABLES;
