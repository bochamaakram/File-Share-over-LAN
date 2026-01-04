const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = 3000;
const MAX_USERS = 2;
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

// Connected users storage
const connectedUsers = new Map();
let sessionTimer = null;
let sessionStartTime = null;

// File metadata storage (tracks who uploaded each file)
const fileMetadata = new Map();

// Enable CORS for LAN access
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static('public'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
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

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get sender name from body (from FormData)
    const senderName = req.body.senderName || 'Unknown';
    console.log('Upload received - File:', req.file.filename, 'Sender:', senderName, 'Body:', req.body);

    // Store file metadata
    fileMetadata.set(req.file.filename, {
        sender: senderName,
        uploadedAt: new Date().toISOString()
    });

    // Notify all connected users about new file
    broadcastToAll({
        type: 'file_added',
        filename: req.file.filename,
        sender: senderName
    });

    res.json({
        success: true,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        sender: senderName
    });
});

// List all files
app.get('/files', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read files' });
        }

        const fileList = files
            .filter(file => !file.startsWith('.'))
            .map(file => {
                const filePath = path.join(uploadsDir, file);
                const stats = fs.statSync(filePath);
                const metadata = fileMetadata.get(file) || { sender: 'Unknown' };
                return {
                    name: file,
                    size: stats.size,
                    modified: stats.mtime,
                    sender: metadata.sender
                };
            })
            .sort((a, b) => new Date(b.modified) - new Date(a.modified));

        res.json(fileList);
    });
});

// Download file
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, filename);
});

// Delete file
app.delete('/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete file' });
        }

        // Clean up file metadata
        fileMetadata.delete(filename);

        // Notify all connected users about deleted file
        broadcastToAll({
            type: 'file_deleted',
            filename: filename
        });

        res.json({ success: true, message: 'File deleted' });
    });
});

// Get connected users
app.get('/users', (req, res) => {
    const users = Array.from(connectedUsers.values());
    res.json({
        users,
        maxUsers: MAX_USERS,
        canJoin: users.length < MAX_USERS
    });
});

// Get server info for scanning
app.get('/server-info', (req, res) => {
    const users = Array.from(connectedUsers.values());
    res.json({
        name: 'LAN File Share',
        users: users.length,
        maxUsers: MAX_USERS,
        canJoin: users.length < MAX_USERS
    });
});

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

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Broadcast to all connected clients
function broadcastToAll(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// Send updated user list to all clients
function broadcastUserList() {
    const users = Array.from(connectedUsers.values());
    broadcastToAll({
        type: 'users_update',
        users,
        maxUsers: MAX_USERS
    });
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    let userId = null;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            if (message.type === 'join') {
                // Check if room is full
                if (connectedUsers.size >= MAX_USERS) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Room is full (max 2 users)'
                    }));
                    ws.close();
                    return;
                }

                // Add user
                userId = Date.now().toString();
                connectedUsers.set(userId, {
                    id: userId,
                    name: message.name || 'Anonymous',
                    ip: clientIP,
                    joinedAt: new Date().toISOString()
                });

                ws.userId = userId;

                // Start session timer when first user joins
                if (connectedUsers.size === 1) {
                    startSessionTimer();
                }

                // Send confirmation with session info
                const timeRemaining = sessionStartTime ?
                    Math.max(0, SESSION_TIMEOUT - (Date.now() - sessionStartTime)) : SESSION_TIMEOUT;

                ws.send(JSON.stringify({
                    type: 'joined',
                    userId,
                    users: Array.from(connectedUsers.values()),
                    sessionTimeout: SESSION_TIMEOUT,
                    timeRemaining: timeRemaining
                }));

                // Broadcast updated user list
                broadcastUserList();

                console.log(`User joined: ${message.name} (${connectedUsers.size}/${MAX_USERS})`);
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        if (ws.userId && connectedUsers.has(ws.userId)) {
            const user = connectedUsers.get(ws.userId);
            connectedUsers.delete(ws.userId);
            broadcastUserList();
            console.log(`User left: ${user.name} (${connectedUsers.size}/${MAX_USERS})`);

            // Clear session timer if no users left
            if (connectedUsers.size === 0) {
                clearSessionTimer();
            }
        }
    });
});

// Session timer functions
function startSessionTimer() {
    sessionStartTime = Date.now();
    console.log('⏱️  Session started - will expire in 5 minutes');

    // Broadcast session start to all clients
    broadcastToAll({
        type: 'session_started',
        timeout: SESSION_TIMEOUT,
        startTime: sessionStartTime
    });

    sessionTimer = setTimeout(() => {
        endSession();
    }, SESSION_TIMEOUT);
}

function clearSessionTimer() {
    if (sessionTimer) {
        clearTimeout(sessionTimer);
        sessionTimer = null;
    }
    sessionStartTime = null;
    console.log('⏱️  Session timer cleared (no users)');
}

function endSession() {
    console.log('\n⏰ Session expired! Disconnecting all users...\n');

    // Notify all users that session is ending
    broadcastToAll({
        type: 'session_expired',
        message: 'Session has expired after 5 minutes'
    });

    // Close all WebSocket connections
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.close();
        }
    });

    // Clear all users
    connectedUsers.clear();

    // Clear session timer
    sessionTimer = null;
    sessionStartTime = null;

    // Optionally clear uploaded files
    clearUploadedFiles();

    console.log('🔄 Session ended. Ready for new connections.\n');
}

function clearUploadedFiles() {
    // Clear file metadata
    fileMetadata.clear();

    // Delete all uploaded files
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

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 LAN File Share Server Running!\n');
    console.log(`   Local:   http://localhost:${PORT}`);

    const ips = getLocalIPs();
    ips.forEach(ip => {
        console.log(`   Network: http://${ip}:${PORT}`);
    });

    console.log(`\n👥 Max users per session: ${MAX_USERS}`);
    console.log(`⏱️  Session duration: 5 minutes`);
    console.log('📁 Share files with any device on your network!\n');
});
