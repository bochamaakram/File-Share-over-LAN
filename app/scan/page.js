'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const ComputerIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const XIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

const LoginIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
);

export default function ScanPage() {
    const [username, setUsername] = useState('');
    const [hostAddress, setHostAddress] = useState('Loading...');
    const [userCount, setUserCount] = useState('0/2 users');
    const [scanIp, setScanIp] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    useEffect(() => {
        const savedName = localStorage.getItem('username');
        if (savedName) setUsername(savedName);

        async function getHostInfo() {
            try {
                const response = await fetch('/api/server-info');
                const info = await response.json();
                setHostAddress(window.location.host);
                setUserCount(`${info.users}/${info.maxUsers} users`);
            } catch {
                setHostAddress(window.location.host);
                setUserCount('Unknown');
            }
        }
        getHostInfo();
    }, []);

    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
        localStorage.setItem('username', e.target.value);
    };

    const handleScan = async () => {
        const ip = scanIp.trim();
        if (!ip) {
            showToast('Please enter an IP address', 'error');
            return;
        }

        setScanning(true);
        setScanResult(null);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`http://${ip}:3000/api/server-info`, { signal: controller.signal });
            clearTimeout(timeout);

            if (response.ok) {
                const info = await response.json();
                setScanResult({ found: true, info, ip });
            }
        } catch {
            setScanResult({ found: false, ip });
        }

        setScanning(false);
    };

    return (
        <>
            <div className="container" style={{ display: 'block' }}>
                <header className="header">
                    <div className="logo">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2">
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#7c3aed" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4" />
                            <path d="M12 8h.01" />
                        </svg>
                        <h1>Network Scanner</h1>
                    </div>
                    <p className="subtitle">Find and connect to file sharing hosts</p>
                </header>

                {/* Username Input */}
                <section className="username-section">
                    <div className="input-group">
                        <label htmlFor="usernameInput">Your Name</label>
                        <input
                            type="text"
                            id="usernameInput"
                            value={username}
                            onChange={handleUsernameChange}
                            placeholder="Enter your name..."
                            maxLength={20}
                        />
                    </div>
                </section>

                {/* Current Host Info */}
                <section className="host-info-section">
                    <div className="host-card current-host">
                        <div className="host-icon"><ComputerIcon /></div>
                        <div className="host-info">
                            <h3>This Device</h3>
                            <p>{hostAddress}</p>
                        </div>
                        <div className="host-status">
                            <span className="status-dot"></span>
                            <span>{userCount}</span>
                        </div>
                    </div>
                </section>

                {/* Scan Input */}
                <section className="scan-section">
                    <div className="scan-header">
                        <h2>Scan for Hosts</h2>
                    </div>
                    <div className="scan-input-group">
                        <input
                            type="text"
                            value={scanIp}
                            onChange={(e) => setScanIp(e.target.value)}
                            placeholder="Enter IP address (e.g., 192.168.1.100)"
                            onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                        />
                        <button className="scan-btn" onClick={handleScan} disabled={scanning}>
                            <SearchIcon />
                            {scanning ? 'Scanning...' : 'Check'}
                        </button>
                    </div>
                    <div className="scan-result">
                        {scanResult && scanResult.found && (
                            <div className="host-card found">
                                <div className="host-icon"><ComputerIcon /></div>
                                <div className="host-info">
                                    <h3>{scanResult.info.name}</h3>
                                    <p>{scanResult.ip}:3000</p>
                                </div>
                                <div className={`host-status ${scanResult.info.canJoin ? 'available' : 'full'}`}>
                                    <span className="status-dot"></span>
                                    <span>{scanResult.info.users}/{scanResult.info.maxUsers} users</span>
                                </div>
                                {scanResult.info.canJoin ? (
                                    <a href={`http://${scanResult.ip}:3000/`} className="connect-btn">Connect</a>
                                ) : (
                                    <span className="full-badge">Full</span>
                                )}
                            </div>
                        )}
                        {scanResult && !scanResult.found && (
                            <div className="host-card not-found">
                                <div className="host-icon"><XIcon /></div>
                                <div className="host-info">
                                    <h3>No Host Found</h3>
                                    <p>{scanResult.ip}:3000 is not responding</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <Link href="/" className="back-btn">
                        <LoginIcon />
                        Connect to This Host
                    </Link>
                </div>
            </div>

            {/* Toast */}
            <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>
                {toast.message}
            </div>
        </>
    );
}
