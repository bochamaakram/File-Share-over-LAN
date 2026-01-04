// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');
const refreshBtn = document.getElementById('refreshBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const toast = document.getElementById('toast');
const usernameModal = document.getElementById('usernameModal');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const userSlot1 = document.getElementById('userSlot1');
const userSlot2 = document.getElementById('userSlot2');
const timerDisplay = document.getElementById('timerDisplay');
const sessionTimer = document.getElementById('sessionTimer');
const quitBtn = document.getElementById('quitBtn');

// WebSocket connection
let ws = null;
let currentUser = null;
let sessionTimerInterval = null;
let sessionEndTime = null;
let shouldReconnect = true; // Flag to control auto-reconnect

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFiles();
    setupEventListeners();
    checkSavedUser();
});

// Check for saved username
function checkSavedUser() {
    const savedName = localStorage.getItem('username');
    if (savedName) {
        usernameInput.value = savedName;
        connectWebSocket(savedName);
    } else {
        showModal();
    }
}

// Show username modal
function showModal() {
    usernameModal.classList.add('show');
}

// Hide modal
function hideModal() {
    usernameModal.classList.remove('show');
}

// Event Listeners
function setupEventListeners() {
    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadFiles(e.target.files);
        }
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            uploadFiles(e.dataTransfer.files);
        }
    });

    // Refresh button
    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        loadFiles().then(() => {
            setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
        });
    });

    // Join button
    joinBtn.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (!name) {
            showToast('Please enter your name', 'error');
            return;
        }
        localStorage.setItem('username', name);
        hideModal();
        connectWebSocket(name);
    });

    // Enter key to join
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinBtn.click();
    });

    // Quit button
    if (quitBtn) {
        quitBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to quit the session?')) {
                quitSession();
            }
        });
    }
}

// Quit session
function quitSession() {
    shouldReconnect = false; // Don't auto-reconnect after quitting
    localStorage.removeItem('username');
    stopSessionCountdown();

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }

    currentUser = null;
    updateUserSlots([]);
    showModal();
    showToast('You left the session', 'success');
}

// Connect to WebSocket
function connectWebSocket(name) {
    shouldReconnect = true; // Enable auto-reconnect when explicitly connecting
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'join',
            name: name
        }));
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);

        switch (message.type) {
            case 'joined':
                currentUser = message.userId;
                console.log('Joined with userId:', currentUser, 'users:', message.users);
                updateUserSlots(message.users);
                startSessionCountdown(message.timeRemaining);
                showToast('Connected successfully!', 'success');
                break;

            case 'users_update':
                console.log('Users update:', message.users);
                updateUserSlots(message.users);
                break;

            case 'session_started':
                startSessionCountdown(message.timeout);
                break;

            case 'session_expired':
                shouldReconnect = false; // Don't auto-reconnect after session expires
                stopSessionCountdown();
                showToast('Session expired! Please rejoin.', 'error');
                showModal();
                break;

            case 'error':
                showToast(message.message, 'error');
                showModal();
                break;

            case 'file_added':
            case 'file_deleted':
                loadFiles();
                break;
        }
    };

    ws.onclose = () => {
        // Only auto-reconnect if flag is true
        if (shouldReconnect) {
            setTimeout(() => {
                const savedName = localStorage.getItem('username');
                if (savedName) {
                    connectWebSocket(savedName);
                }
            }, 3000);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Update user slots
function updateUserSlots(users) {
    const slots = [userSlot1, userSlot2];

    slots.forEach((slot, index) => {
        if (users[index]) {
            const user = users[index];
            const isYou = user.id === currentUser;
            const initial = user.name.charAt(0).toUpperCase();

            slot.className = `user-slot connected ${isYou ? 'you' : ''}`;
            slot.innerHTML = `
                <div class="user-avatar">${initial}</div>
                <span class="user-name">${user.name}${isYou ? ' (You)' : ''}</span>
            `;
        } else {
            slot.className = 'user-slot empty';
            slot.innerHTML = `
                <div class="user-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>
                <span class="user-name">Waiting...</span>
            `;
        }
    });
}

// Load files from server
async function loadFiles() {
    try {
        const response = await fetch('/files');
        const files = await response.json();

        if (files.length === 0) {
            filesList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No files shared yet</p>
                    <p style="font-size: 0.85rem; margin-top: 0.5rem;">Drop some files to get started!</p>
                </div>
            `;
            return;
        }

        filesList.innerHTML = files.map(file => createFileItem(file)).join('');

        // Add event listeners to buttons
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadFile(btn.dataset.filename);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFile(btn.dataset.filename);
            });
        });

    } catch (error) {
        console.error('Failed to load files:', error);
        filesList.innerHTML = '<div class="empty-state">Failed to load files</div>';
    }
}

// Create file item HTML
function createFileItem(file) {
    const icon = getFileIcon(file.name);
    const size = formatFileSize(file.size);
    const date = new Date(file.modified).toLocaleDateString();
    const sender = file.sender || 'Unknown';

    return `
        <div class="file-item">
            <div class="file-icon">
                ${icon}
            </div>
            <div class="file-info">
                <div class="file-name" title="${file.name}">${file.name}</div>
                <div class="file-meta">${size} • ${date} <span class="file-sender">${sender}</span></div>
            </div>
            <div class="file-actions">
                <button class="action-btn download-btn" data-filename="${file.name}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                </button>
                <button class="action-btn delete-btn" data-filename="${file.name}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// Get file icon based on extension
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();

    const icons = {
        pdf: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        doc: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        img: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        video: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
        audio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
        zip: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
        default: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'
    };

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
    const videoExts = ['mp4', 'webm', 'avi', 'mov', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
    const zipExts = ['zip', 'rar', '7z', 'tar', 'gz'];
    const docExts = ['doc', 'docx', 'txt', 'rtf', 'odt'];

    if (ext === 'pdf') return icons.pdf;
    if (imageExts.includes(ext)) return icons.img;
    if (videoExts.includes(ext)) return icons.video;
    if (audioExts.includes(ext)) return icons.audio;
    if (zipExts.includes(ext)) return icons.zip;
    if (docExts.includes(ext)) return icons.doc;

    return icons.default;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Upload files
async function uploadFiles(files) {
    uploadZone.classList.add('uploading');

    let completed = 0;
    const total = files.length;
    const senderName = localStorage.getItem('username') || 'Unknown';
    console.log('Uploading with sender name:', senderName);

    for (const file of files) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('senderName', senderName);
            console.log('FormData senderName:', formData.get('senderName'));

            progressText.textContent = `Uploading ${file.name}...`;

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            completed++;
            const progress = (completed / total) * 100;
            progressFill.style.width = progress + '%';

        } catch (error) {
            console.error('Upload error:', error);
            showToast(`Failed to upload ${file.name}`, 'error');
        }
    }

    // Reset and reload
    setTimeout(() => {
        uploadZone.classList.remove('uploading');
        progressFill.style.width = '0%';
        fileInput.value = '';
        loadFiles();
        showToast(`${completed} file(s) uploaded successfully!`, 'success');
    }, 500);
}

// Download file
function downloadFile(filename) {
    const link = document.createElement('a');
    link.href = `/download/${encodeURIComponent(filename)}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Delete file
async function deleteFile(filename) {
    if (!confirm(`Delete "${filename}"?`)) return;

    try {
        const response = await fetch(`/files/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        showToast('File deleted', 'success');
        loadFiles();

    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete file', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Session countdown timer
function startSessionCountdown(timeRemaining) {
    if (!timeRemaining) return;

    sessionEndTime = Date.now() + timeRemaining;
    console.log('Session timer started, remaining:', timeRemaining);

    // Clear any existing interval
    if (sessionTimerInterval) {
        clearInterval(sessionTimerInterval);
    }

    // Update immediately
    updateTimerDisplay();

    // Update every second
    sessionTimerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
    if (!sessionEndTime || !timerDisplay || !sessionTimer) return;

    const remaining = Math.max(0, sessionEndTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Update timer styling based on remaining time
    sessionTimer.classList.remove('warning', 'critical');
    if (remaining <= 60000) {
        sessionTimer.classList.add('critical');
    } else if (remaining <= 120000) {
        sessionTimer.classList.add('warning');
    }

    if (remaining === 0) {
        stopSessionCountdown();
    }
}

function stopSessionCountdown() {
    if (sessionTimerInterval) {
        clearInterval(sessionTimerInterval);
        sessionTimerInterval = null;
    }
    sessionEndTime = null;
    if (timerDisplay) timerDisplay.textContent = '0:00';
    if (sessionTimer) sessionTimer.classList.add('critical');
}
