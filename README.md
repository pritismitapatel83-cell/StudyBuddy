# Study Buddy

A web-based study management system to manage tasks, notes, reminders, and student interactions.

---

## 🚀 Features
- Task planner
- Notes upload system
- Reminders
- Student chat system
- Profile management
- Progress tracking

---

## 🛠 Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js
- Data Storage: JSON files

---

## 📁 Project Structure
studybuddy/
│
├── server.js
├── package.json
├── package-lock.json
│
├── public/
│   ├── api.js
│   ├── dashboard.html
│   ├── notes.html
│   ├── planner.html
│   ├── reminder.html
│   ├── studentconnect.html
│   └── profile.html
│
├── uploads/
├── data/

---

## ⚙️ Setup Instructions

### 1. Install Node.js
Download and install Node.js (LTS version)

### 2. Install dependencies
npm install

### 3. Start the server
node server.js

### 4. Open in browser
http://127.0.0.1:5500/dashboard.html

---

## 🔌 Connect Frontend to Backend

Add this inside <head> of every HTML file:
<script src="api.js"></script>

---

## 📌 Important Notes
- uploads/ and data/ folders are auto-created
- Do not upload unnecessary files to GitHub
- Make sure server is running before opening frontend

---

## ⚠️ Troubleshooting
- Port already in use → Change port in server.js
- Server not connecting → Run node server.js first
- Upload not working → Check uploads/ folder exists

---

## 👨‍💻 Author
ANUSTHAN