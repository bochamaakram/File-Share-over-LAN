const express = require('express');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Handle WebSocket errors from page refresh (invalid close codes)
process.on('uncaughtException', (error) => {
    if (error.code === 'WS_ERR_INVALID_CLOSE_CODE') {
        // Silently ignore invalid WebSocket close codes (happens during page refresh)
        return;
    }
    // Re-throw other errors
    console.error('Uncaught Exception:', error);
});

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;
const MAX_USERS = 2;
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Connected users storage
const connectedUsers = new Map();
let sessionTimer = null;
let sessionStartTime = null;

// File metadata storage
const fileMetadata = new Map();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        let filename = file.originalname;
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filename);
            const name = path.basename(filename, ext);
            filename = `${name}_${Date.now()}${ext}`;
        }
        cb(null, filename);
    }
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Get local IP addresses
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

// WebSocket broadcast functions
let wss = null;

function broadcastToAll(message) {
    if (!wss) return;
    const data = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

function broadcastUserList() {
    const users = Array.from(connectedUsers.values());
    const timeRemaining = sessionStartTime ? Math.max(0, SESSION_TIMEOUT - (Date.now() - sessionStartTime)) : null;
    const sessionStarted = sessionStartTime !== null;
    broadcastToAll({ type: 'users_update', users, maxUsers: MAX_USERS, timeRemaining, sessionStarted });
}

// Session timer functions
function startSessionTimer() {
    sessionStartTime = Date.now();
    console.log('⏱️  Session started - will expire in 5 minutes');
    broadcastToAll({ type: 'session_started', timeout: SESSION_TIMEOUT, startTime: sessionStartTime });
    sessionTimer = setTimeout(endSession, SESSION_TIMEOUT);
}

function clearSessionTimer() {
    if (sessionTimer) {
        clearTimeout(sessionTimer);
        sessionTimer = null;
    }
    sessionStartTime = null;
    console.log('⏱️  Session timer cleared');
}

function endSession() {
    console.log('\n⏰ Session expired! Disconnecting all users...\n');
    broadcastToAll({ type: 'session_expired', message: 'Session has expired after 5 minutes' });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.close();
    });
    connectedUsers.clear();
    sessionTimer = null;
    sessionStartTime = null;
    clearUploadedFiles();
    console.log('🔄 Session ended. Ready for new connections.\n');
}

function clearUploadedFiles() {
    fileMetadata.clear();
    fs.readdir(uploadsDir, (err, files) => {
        if (err) return;
        files.forEach(file => {
            if (!file.startsWith('.')) {
                fs.unlink(path.join(uploadsDir, file), (err) => {
                    if (!err) console.log(`   Deleted: ${file}`);
                });
            }
        });
    });
}

app.prepare().then(() => {
    const server = express();
    server.use(cors());
    server.use(express.json());

    // API Routes
    server.post('/api/upload', upload.single('file'), (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const senderName = req.body.senderName || 'Unknown';
        fileMetadata.set(req.file.filename, { sender: senderName, uploadedAt: new Date().toISOString() });
        broadcastToAll({ type: 'file_added', filename: req.file.filename, sender: senderName });
        res.json({ success: true, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size, sender: senderName });
    });

    server.get('/api/files', (req, res) => {
        fs.readdir(uploadsDir, (err, files) => {
            if (err) return res.status(500).json({ error: 'Failed to read files' });
            const fileList = files.filter(f => !f.startsWith('.')).map(file => {
                const filePath = path.join(uploadsDir, file);
                const stats = fs.statSync(filePath);
                const metadata = fileMetadata.get(file) || { sender: 'Unknown' };
                return { name: file, size: stats.size, modified: stats.mtime, sender: metadata.sender };
            }).sort((a, b) => new Date(b.modified) - new Date(a.modified));
            res.json(fileList);
        });
    });

    server.get('/api/download/:filename', (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(uploadsDir, filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        res.download(filePath, filename);
    });

    server.delete('/api/files/:filename', (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(uploadsDir, filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        fs.unlink(filePath, (err) => {
            if (err) return res.status(500).json({ error: 'Failed to delete file' });
            fileMetadata.delete(filename);
            broadcastToAll({ type: 'file_deleted', filename });
            res.json({ success: true, message: 'File deleted' });
        });
    });

    server.get('/api/users', (req, res) => {
        const users = Array.from(connectedUsers.values());
        res.json({ users, maxUsers: MAX_USERS, canJoin: users.length < MAX_USERS });
    });

    server.get('/api/server-info', (req, res) => {
        const users = Array.from(connectedUsers.values());
        res.json({ name: 'LAN File Share', users: users.length, maxUsers: MAX_USERS, canJoin: users.length < MAX_USERS });
    });

    // Handle all other routes with Next.js
    server.use((req, res) => {
        const parsedUrl = parse(req.url, true);
        return handle(req, res, parsedUrl);
    });

    const httpServer = createServer(server);

    // WebSocket server with permissive settings for page refresh handling
    wss = new WebSocket.Server({
        server: httpServer,
        // Skip UTF8 validation which can cause issues with abnormal closes
        skipUTF8Validation: true
    });

    // Handle WebSocket server errors
    wss.on('error', (error) => {
        console.log('WebSocket Server Error:', error.message);
    });

    wss.on('connection', (ws, req) => {
        const clientIP = req.socket.remoteAddress;
        let userId = null;

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                if (message.type === 'join') {
                    if (connectedUsers.size >= MAX_USERS) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Room is full (max 2 users)' }));
                        ws.close();
                        return;
                    }
                    userId = Date.now().toString();
                    connectedUsers.set(userId, { id: userId, name: message.name || 'Anonymous', ip: clientIP, joinedAt: new Date().toISOString() });
                    ws.userId = userId;
                    // Don't auto-start session - wait for user to click Start
                    const timeRemaining = sessionStartTime ? Math.max(0, SESSION_TIMEOUT - (Date.now() - sessionStartTime)) : null;
                    const sessionStarted = sessionStartTime !== null;
                    ws.send(JSON.stringify({ type: 'joined', userId, users: Array.from(connectedUsers.values()), sessionTimeout: SESSION_TIMEOUT, timeRemaining, sessionStarted }));
                    broadcastUserList();
                    console.log(`User joined: ${message.name} (${connectedUsers.size}/${MAX_USERS})`);
                }

                // Handle manual session start
                if (message.type === 'start_session') {
                    if (!sessionStartTime) {
                        startSessionTimer();
                        console.log('▶️  Session manually started by user');
                    }
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        });

        ws.on('error', (error) => {
            // Silently handle WebSocket errors (e.g., invalid close codes from page refresh)
            console.log('WebSocket error (likely page refresh):', error.code || error.message);
        });

        ws.on('close', () => {
            if (ws.userId && connectedUsers.has(ws.userId)) {
                const user = connectedUsers.get(ws.userId);
                connectedUsers.delete(ws.userId);
                broadcastUserList();
                console.log(`User left: ${user.name} (${connectedUsers.size}/${MAX_USERS})`);
                if (connectedUsers.size === 0) clearSessionTimer();
            }
        });
    });

    httpServer.listen(port, hostname, () => {
        console.log('\n🚀 LAN File Share Server Running!\n');
        console.log(`   Local:   http://localhost:${port}`);
        getLocalIPs().forEach(ip => console.log(`   Network: http://${ip}:${port}`));
        console.log(`\n👥 Max users per session: ${MAX_USERS}`);
        console.log(`⏱️  Session duration: 5 minutes`);
        console.log('📁 Share files with any device on your network!\n');
    });
});
