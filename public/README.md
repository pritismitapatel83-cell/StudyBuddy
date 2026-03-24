# Study Buddy — Redesigned Frontend

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Login / Register |
| `dashboard.html` | Main dashboard — welcome, quick access cards, progress & rankings |
| `notes.html` | Upload, browse, filter & manage notes |
| `planner.html` | Add, complete, and delete study tasks |
| `test.html` | Create tests (admin mode) and take quizzes |
| `connection.html` | Find study partners, 1-on-1 chat, group chat |
| `profile.html` | View & edit profile, activity stats, avatar upload |
| `style.css` | Shared design system (fonts, colors, components) |

## Backend

Connect to `studybuddy-backend` running on **http://localhost:5500**. All API calls degrade gracefully with sample data if the server is offline.

## Setup

1. Unzip and place all files in the same folder.
2. Start backend: `npm install && node server.js`
3. Open `index.html` in a browser (or serve with Live Server).

## Design System

- **Aesthetic**: Warm academic / editorial — parchment, ink, gold accents
- **Fonts**: Playfair Display (headings) + DM Sans (body) + DM Mono (numbers)
- **Colors**: `--bg #f7f3ed`, `--gold #c9873a`, `--teal #2a7a72`
