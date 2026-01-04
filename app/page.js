'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// SVG Icons as components
const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const UploadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const FolderIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// File icons
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
  const videoExts = ['mp4', 'webm', 'avi', 'mov', 'mkv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
  const zipExts = ['zip', 'rar', '7z', 'tar', 'gz'];
  const docExts = ['doc', 'docx', 'txt', 'rtf', 'odt'];

  if (ext === 'pdf') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
  if (imageExts.includes(ext)) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
  if (videoExts.includes(ext)) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>;
  if (audioExts.includes(ext)) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
  if (zipExts.includes(ext)) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
  if (docExts.includes(ext)) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function Home() {
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [timerDisplay, setTimerDisplay] = useState('--:--');
  const [timerClass, setTimerClass] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [dragover, setDragover] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const wsRef = useRef(null);
  const fileInputRef = useRef(null);
  const sessionEndTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }, []);

  const updateTimerDisplay = useCallback(() => {
    if (!sessionEndTimeRef.current) return;
    const remaining = Math.max(0, sessionEndTimeRef.current - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    setTimerDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);

    if (remaining <= 60000) setTimerClass('critical');
    else if (remaining <= 120000) setTimerClass('warning');
    else setTimerClass('');

    if (remaining === 0 && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  }, []);

  const startSessionCountdown = useCallback((timeRemaining) => {
    if (!timeRemaining) return;
    sessionEndTimeRef.current = Date.now() + timeRemaining;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    updateTimerDisplay();
    timerIntervalRef.current = setInterval(updateTimerDisplay, 1000);
  }, [updateTimerDisplay]);

  const stopSessionCountdown = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    sessionEndTimeRef.current = null;
    setTimerDisplay('0:00');
    setTimerClass('critical');
  }, []);

  const connectWebSocket = useCallback((name) => {
    shouldReconnectRef.current = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', name }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'joined':
          setCurrentUser(message.userId);
          setUsers(message.users);
          setSessionStarted(message.sessionStarted || false);
          if (message.timeRemaining) {
            startSessionCountdown(message.timeRemaining);
          }
          showToast('Connected successfully!', 'success');
          break;
        case 'users_update':
          setUsers(message.users);
          setSessionStarted(message.sessionStarted || false);
          if (message.timeRemaining) {
            startSessionCountdown(message.timeRemaining);
          }
          break;
        case 'session_started':
          setSessionStarted(true);
          startSessionCountdown(message.timeout);
          showToast('Session started!', 'success');
          break;
        case 'session_expired':
          shouldReconnectRef.current = false;
          stopSessionCountdown();
          showToast('Session expired! Please rejoin.', 'error');
          setShowModal(true);
          break;
        case 'error':
          showToast(message.message, 'error');
          setShowModal(true);
          break;
        case 'file_added':
        case 'file_deleted':
          loadFiles();
          break;
      }
    };

    ws.onclose = () => {
      if (shouldReconnectRef.current) {
        setTimeout(() => {
          const savedName = localStorage.getItem('username');
          if (savedName) connectWebSocket(savedName);
        }, 3000);
      }
    };
  }, [loadFiles, showToast, startSessionCountdown, stopSessionCountdown]);

  useEffect(() => {
    loadFiles();
    const savedName = localStorage.getItem('username');
    if (savedName) {
      setUsername(savedName);
      connectWebSocket(savedName);
    } else {
      setShowModal(true);
    }

    // Handle page refresh/close - close WebSocket cleanly
    const handleBeforeUnload = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Page refresh');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (wsRef.current) wsRef.current.close(1000, 'Component unmount');
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [loadFiles, connectWebSocket]);

  const handleJoin = () => {
    if (!username.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    localStorage.setItem('username', username);
    setShowModal(false);
    connectWebSocket(username);
  };

  const handleQuit = () => {
    if (confirm('Are you sure you want to quit the session?')) {
      shouldReconnectRef.current = false;
      localStorage.removeItem('username');
      stopSessionCountdown();
      setSessionStarted(false);
      if (wsRef.current) wsRef.current.close();
      setCurrentUser(null);
      setUsers([]);
      setShowModal(true);
      showToast('You left the session', 'success');
    }
  };

  const handleStartSession = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_session' }));
    }
  };

  const handleRefresh = async () => {
    setSpinning(true);
    await loadFiles();
    setTimeout(() => setSpinning(false), 500);
  };

  const handleUpload = async (fileList) => {
    setUploading(true);
    const senderName = localStorage.getItem('username') || 'Unknown';
    let completed = 0;
    const total = fileList.length;

    for (const file of fileList) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('senderName', senderName);
        setProgressText(`Uploading ${file.name}...`);

        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Upload failed');

        completed++;
        setProgress((completed / total) * 100);
      } catch (error) {
        showToast(`Failed to upload ${file.name}`, 'error');
      }
    }

    setTimeout(() => {
      setUploading(false);
      setProgress(0);
      loadFiles();
      showToast(`${completed} file(s) uploaded successfully!`, 'success');
    }, 500);
  };

  const handleDownload = (filename) => {
    const link = document.createElement('a');
    link.href = `/api/download/${encodeURIComponent(filename)}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Delete "${filename}"?`)) return;
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      showToast('File deleted', 'success');
      loadFiles();
    } catch (error) {
      showToast('Failed to delete file', 'error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    if (e.dataTransfer.files.length > 0) handleUpload(Array.from(e.dataTransfer.files));
  };

  const renderUserSlot = (index) => {
    const user = users[index];
    if (user) {
      const isYou = user.id === currentUser;
      return (
        <div className={`user-slot connected ${isYou ? 'you' : ''}`}>
          <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <span className="user-name">{user.name}{isYou ? ' (You)' : ''}</span>
        </div>
      );
    }
    return (
      <div className="user-slot empty">
        <div className="user-avatar"><UserIcon /></div>
        <span className="user-name">Waiting...</span>
      </div>
    );
  };

  return (
    <>
      <div className="container">
        {/* Users Section */}
        <section className="users-section">
          <div className="users-header">
            <h2>Connected Users</h2>
            <div className={`session-timer ${timerClass}`}>
              <ClockIcon />
              <span>{timerDisplay}</span>
            </div>
            <Link href="/scan" className="scan-link">
              <SearchIcon />
              Scan Network
            </Link>
          </div>
          <div className="users-grid">
            {renderUserSlot(0)}
            {renderUserSlot(1)}
          </div>
          {sessionStarted ? (
            <button className="quit-btn" onClick={handleQuit}>
              <LogoutIcon />
              Quit Session
            </button>
          ) : (
            <button className="start-btn" onClick={handleStartSession}>
              <PlayIcon />
              Start Session
            </button>
          )}
        </section>

        {/* Main Content */}
        <main className="main-content">
          <div
            className={`upload-zone ${uploading ? 'uploading' : ''} ${dragover ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragover(false); }}
            onDrop={handleDrop}
          >
            <div className="upload-content">
              <div className="upload-icon"><UploadIcon /></div>
              <p className="upload-text">Drag & drop files here</p>
              <p className="upload-subtext">or click to browse</p>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                hidden
                onChange={(e) => e.target.files?.length && handleUpload(Array.from(e.target.files))}
              />
            </div>
            <div className="upload-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="progress-text">{progressText}</p>
            </div>
          </div>

          <section className="files-section">
            <div className="files-header">
              <h2>Shared Files</h2>
              <button className={`refresh-btn ${spinning ? 'spinning' : ''}`} onClick={handleRefresh} title="Refresh">
                <RefreshIcon />
              </button>
            </div>
            <div className="files-list">
              {files.length === 0 ? (
                <div className="empty-state">
                  <FolderIcon />
                  <p>No files shared yet</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Drop some files to get started!</p>
                </div>
              ) : (
                files.map((file) => (
                  <div className="file-item" key={file.name}>
                    <div className="file-icon">{getFileIcon(file.name)}</div>
                    <div className="file-info">
                      <div className="file-name" title={file.name}>{file.name}</div>
                      <div className="file-meta">
                        {formatFileSize(file.size)} • {new Date(file.modified).toLocaleDateString()}
                        <span className="file-sender">{file.sender}</span>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button className="action-btn download-btn" onClick={() => handleDownload(file.name)}>
                        <DownloadIcon /> Download
                      </button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(file.name)}>
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Username Modal */}
      <div className={`modal ${showModal ? 'show' : ''}`}>
        <div className="modal-content">
          <h2>Welcome!</h2>
          <p>Enter your name to connect</p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name..."
            maxLength={20}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <button className="modal-btn" onClick={handleJoin}>Join Session</button>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>
        {toast.message}
      </div>
    </>
  );
}
