# LAN File Share

A simple, real-time file sharing application for local networks. Share files between devices on the same network with a modern, dark-themed interface.

## Features

- 🚀 **Real-time file sharing** - Upload and download files instantly
- 👥 **2-user sessions** - Connect with one other person for secure transfers
- ⏱️ **5-minute sessions** - Auto-expires for security, files are deleted
- 📱 **LAN access** - Any device on your network can connect
- 🎨 **Modern UI** - Dark theme with glassmorphism effects

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  index.html    │    styles.css    │    app.js                   │
│  - UI Layout   │    - Dark theme  │    - WebSocket client       │
│  - User slots  │    - Animations  │    - File upload/download   │
│  - File list   │    - Responsive  │    - Session timer          │
└────────────────┴─────────────────┴──────────────────────────────┘
                              │
                    HTTP / WebSocket
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       Server (Node.js)                           │
├─────────────────────────────────────────────────────────────────┤
│  Express.js                    │  WebSocket (ws)                 │
│  - POST /upload                │  - User connections            │
│  - GET /files                  │  - Real-time updates           │
│  - GET /download/:file         │  - Session management          │
│  - DELETE /files/:file         │  - 2-user limit                │
├────────────────────────────────┴─────────────────────────────────┤
│  Multer (File uploads)         │  File Metadata (Map)           │
│  - 500MB limit                 │  - Tracks sender per file      │
│  - Auto-rename duplicates      │  - Cleared on session end      │
└────────────────────────────────┴─────────────────────────────────┘
                              │
                         File System
                              │
                    ┌─────────────────┐
                    │    /uploads     │
                    │  (temp storage) │
                    └─────────────────┘
```

## Project Structure

```
basic file share/
├── server.js          # Express + WebSocket server
├── package.json       # Dependencies
├── uploads/           # Temporary file storage
└── public/
    ├── index.html     # Main app page
    ├── scan.html      # Network scanner page
    ├── styles.css     # All styling
    └── app.js         # Frontend logic
```

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Then open:
- **Local**: http://localhost:3000
- **Network**: http://YOUR_IP:3000 (shown in terminal)

## Session Flow

1. First user connects → Session starts (5 min timer begins)
2. Second user can join → Session is now full
3. Both users can upload/download files
4. When session expires OR both users quit:
   - All connections closed
   - All files deleted
   - Ready for new session

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /upload | Upload a file (multipart/form-data) |
| GET | /files | List all files with metadata |
| GET | /download/:filename | Download a file |
| DELETE | /files/:filename | Delete a file |
| GET | /users | Get connected users |
| GET | /server-info | Server status for scanning |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| join | Client→Server | Join session with name |
| joined | Server→Client | Confirmation with user list |
| users_update | Server→Client | User list changed |
| session_expired | Server→Client | Session ended |
| file_added | Server→Client | New file uploaded |
| file_deleted | Server→Client | File was deleted |

## Tech Stack

- **Backend**: Node.js, Express, Multer, ws (WebSocket)
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: CSS variables, glassmorphism, gradients
