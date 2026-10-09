'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface StudentProfile {
  name: string;
  roll_number: string;
  branch: string;
  section: string;
  attendance: string;
  marks: Record<string, string>;
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

const QUICK_ACTIONS = [
  { label: 'My Marks', query: 'My Marks', icon: '📝' },
  { label: 'My Attendance', query: 'My Attendance', icon: '📊' },
  { label: "Today's Classes", query: 'time table today', icon: '🗓️' },
  { label: 'Full Time Table', query: 'Time Table', icon: '⏰' },
  { label: 'Faculty & Subjects', query: 'faculty', icon: '👩‍🏫' },
  { label: 'Syllabus', query: 'Syllabus', icon: '📚' },
  { label: 'Fees Structure', query: 'Fees Structure', icon: '💳' },
];

const nowTime = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const renderInline = (line: string) =>
  line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );

const renderMessage = (text: string) =>
  text.split('\n').map((line, i) => {
    const isBullet = /^\s*([•\-*]|\d+\.)\s+/.test(line);
    return (
      <div key={i} className={isBullet ? 'line bullet' : 'line'}>
        {line.length ? renderInline(line) : '\u00A0'}
      </div>
    );
  });

const attendanceLevel = (value: string) => {
  const n = parseInt(value, 10);
  if (isNaN(n)) return { n: 0, cls: 'mid' };
  if (n < 65) return { n, cls: 'low' };
  if (n < 75) return { n, cls: 'mid' };
  return { n, cls: 'good' };
};

const initials = (name?: string) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/* ---------- small inline icons ---------- */
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);
/* College shield logo: save your logo as  public/logo.png */
const Logo = ({ size = 24 }: { size?: number }) => (
  <img src="/logo.png" alt="Narayana logo" style={{ height: size, width: 'auto', display: 'block' }} />
);
const IconTheme = ({ dark }: { dark: boolean }) =>
  dark ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading]);

  if (!isMounted) return null;

  const welcomeText = (s: StudentProfile) =>
    `Hello ${s.name.split(' ')[0]}! 👋\nI'm your Narayana AI assistant. Your attendance is ${s.attendance}.\n\nYou can ask me about your marks, attendance, time table, faculty, syllabus, fees, or any academic question.`;

  const startSession = (data: { student: StudentProfile; token: string }) => {
    setStudent(data.student);
    setToken(data.token);
    setIsLoggedIn(true);
    setMessages([{ sender: 'bot', text: welcomeText(data.student), time: nowTime() }]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_number: rollNumber.trim().toUpperCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.detail || 'Login failed. Please check credentials.');
        return;
      }

      startSession(data);
    } catch (err) {
      setLoginError('Could not connect to backend server. Make sure FastAPI is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (cred: CredentialResponse) => {
    setLoginError('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: cred.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.detail || 'Google login failed.');
        return;
      }

      startSession(data);
    } catch (err) {
      setLoginError('Could not connect to backend server. Make sure FastAPI is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStudent(null);
    setToken('');
    setMessages([]);
    setRollNumber('');
    setPassword('');
    setSidebarOpen(false);
  };

  const clearChat = () => {
    if (student) setMessages([{ sender: 'bot', text: welcomeText(student), time: nowTime() }]);
    setSidebarOpen(false);
  };

  const handleSendMessage = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSend = customQuery || inputQuery;
    if (!queryToSend.trim() || !student || chatLoading) return;

    const userMessage = queryToSend.trim();
    if (!customQuery) {
      setInputQuery('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
    setSidebarOpen(false);

    setMessages((prev) => [...prev, { sender: 'user', text: userMessage, time: nowTime() }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: data.response || data.detail || 'No response returned from backend.', time: nowTime() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Error communicating with backend server. Please check python server status.',
          time: nowTime(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuery(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const copyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const att = attendanceLevel(student?.attendance || '');

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <style>{CSS}</style>
      <div className="root" data-theme={theme} suppressHydrationWarning>
        {!isLoggedIn ? (
          /* ======================= LOGIN ======================= */
          <div className="login-wrap">
            <aside className="login-brand">
              {/* College banner: save your banner as  public/narayana.jpg */}
              <div className="brand-banner">
                <img src="/narayana.jpg" alt="Narayana Engineering College, Nellore" />
              </div>

              <div className="brand-body">
                <h1>Your academic assistant, always available.</h1>
                <p>Check marks, attendance, time table and ask any question — answered instantly from college records and the web.</p>
                <ul>
                  <li>Instant marks &amp; attendance</li>
                  <li>Daily time table &amp; faculty details</li>
                  <li>Ask any academic or general question</li>
                </ul>
              </div>

              <div className="brand-foot">Dept. of Electronics &amp; Communication Engineering</div>
            </aside>

            <main className="login-panel">
              <div className="login-card">
                <img className="mobile-banner" src="/narayana.jpg" alt="Narayana Engineering College, Nellore" />
                <div className="login-icon">
                  <Logo size={34} />
                </div>
                <h2>Welcome back</h2>
                <p className="login-sub">Sign in to the ECE-ACT Student Portal</p>

                {loginError && <div className="alert">{loginError}</div>}

                <form onSubmit={handleLogin}>
                  <label htmlFor="roll">Student PIN / Roll Number</label>
                  <input
                    id="roll"
                    className="field"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="e.g. 24711A4350"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />

                  <label htmlFor="pwd">Password</label>
                  <div className="pwd-wrap">
                    <input
                      id="pwd"
                      className="field"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="hint">First time? Use the temporary password given by your college.</div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                {GOOGLE_CLIENT_ID && (
                  <>
                    <div className="divider">
                      <span>OR</span>
                    </div>
                    <div className="google-wrap">
                      <GoogleLogin
                        onSuccess={handleGoogleLogin}
                        onError={() => setLoginError('Google sign-in was cancelled or failed.')}
                        shape="rectangular"
                        text="signin_with"
                        width="320"
                      />
                    </div>
                  </>
                )}
              </div>
            </main>
          </div>
        ) : (
          /* ======================= CHAT ======================= */
          <div className="app">
            {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
              <div className="side-brand">
                <div className="logo-box">
                  <Logo size={38} />
                </div>
                <div>
                  <div className="side-title">Narayana AI</div>
                  <div className="side-sub">ECE-ACT Assistant</div>
                </div>
              </div>

              <div className="profile-card">
                <div className="avatar-lg">{initials(student?.name)}</div>
                <div className="p-name">{student?.name}</div>
                <div className="p-meta">{student?.roll_number}</div>
                <div className="p-meta">
                  {student?.branch} · Section {student?.section}
                </div>

                <div className="att">
                  <div className="att-row">
                    <span>Attendance</span>
                    <strong className={att.cls}>{student?.attendance}</strong>
                  </div>
                  <div className="bar">
                    <div className={`bar-fill ${att.cls}`} style={{ width: `${Math.min(att.n, 100)}%` }} />
                  </div>
                </div>
              </div>

              <div className="side-section">Quick actions</div>
              <nav className="actions">
                {QUICK_ACTIONS.map((a) => (
                  <button key={a.label} className="action" onClick={() => handleSendMessage(undefined, a.query)} disabled={chatLoading}>
                    <span className="a-icon">{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </nav>

              <div className="side-foot">
                <button className="ghost" onClick={clearChat}>
                  <IconTrash /> Clear chat
                </button>
                <button className="ghost" onClick={handleLogout}>
                  <IconLogout /> Logout
                </button>
              </div>
            </aside>

            <section className="main">
              <div className="banner-strip">
                <img src="/narayana.jpg" alt="Narayana Engineering College, Nellore" />
              </div>
              <header className="topbar">
                <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                  <IconMenu />
                </button>
                <div className="bot-id">
                  <div className="bot-avatar">
                    <Logo size={22} />
                  </div>
                  <div>
                    <div className="bot-name">Narayana AI Assistant</div>
                    <div className="bot-status">
                      <span className="dot" /> Online
                    </div>
                  </div>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                  aria-label="Toggle theme"
                  title="Toggle light / dark"
                >
                  <IconTheme dark={theme === 'dark'} />
                </button>
              </header>

              <div className="messages">
                <div className="messages-inner">
                  {messages.map((msg, index) => (
                    <div key={index} className={`row ${msg.sender}`}>
                      {msg.sender === 'bot' && (
                        <div className="bot-avatar sm">
                          <Logo size={22} />
                        </div>
                      )}
                      <div className="bubble-col">
                        <div className={`bubble ${msg.sender}`}>{renderMessage(msg.text)}</div>
                        <div className="meta">
                          <span>{msg.time}</span>
                          {msg.sender === 'bot' && (
                            <button className="copy" onClick={() => copyMessage(msg.text, index)}>
                              <IconCopy /> {copiedIndex === index ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="row bot">
                      <div className="bot-avatar sm">
                        <Logo size={22} />
                      </div>
                      <div className="bubble-col">
                        <div className="bubble bot typing">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              <footer className="composer">
                <div className="composer-inner">
                  <div className="chips">
                    {QUICK_ACTIONS.slice(0, 5).map((a) => (
                      <button key={a.label} className="chip" onClick={() => handleSendMessage(undefined, a.query)} disabled={chatLoading}>
                        {a.label}
                      </button>
                    ))}
                  </div>

                  <form className="input-box" onSubmit={handleSendMessage}>
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      placeholder="Ask anything — marks, attendance, time table, or a concept…"
                      value={inputQuery}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                    />
                    <button type="submit" className="send" disabled={chatLoading || !inputQuery.trim()} aria-label="Send">
                      <IconSend />
                    </button>
                  </form>
                  <div className="disclaimer">Enter to send · Shift + Enter for a new line · AI answers may contain mistakes, verify important details.</div>
                </div>
              </footer>
            </section>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

const CSS = `
.root{
  --bg:#f3f5fa; --surface:#ffffff; --surface-2:#f8fafc; --text:#0f172a; --muted:#64748b;
  --border:#e2e8f0; --primary:#2563eb; --primary-2:#1d4ed8; --primary-soft:#eaf1ff;
  --bubble-user-1:#2563eb; --bubble-user-2:#1d4ed8; --shadow:0 1px 2px rgba(15,23,42,.06),0 8px 24px rgba(15,23,42,.06);
  --good:#16a34a; --mid:#d97706; --low:#dc2626; --danger-bg:#fef2f2; --danger:#b91c1c;
  min-height:100vh; background:var(--bg); color:var(--text);
  font-family:'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased;
}
.root[data-theme="dark"]{
  --bg:#0a1020; --surface:#111a2e; --surface-2:#0e1627; --text:#e6ebf5; --muted:#8c98b3;
  --border:#1f2b45; --primary:#3b82f6; --primary-2:#2563eb; --primary-soft:#14203b;
  --bubble-user-1:#3b82f6; --bubble-user-2:#2563eb; --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35);
  --danger-bg:#2a1417; --danger:#fca5a5;
}
.root *{box-sizing:border-box}
.root button{font-family:inherit}

/* ---------- LOGIN ---------- */
.login-wrap{min-height:100vh;display:grid;grid-template-columns:1.05fr 1fr}
.login-brand{
  background:linear-gradient(155deg,#0b1b3f 0%,#12307a 55%,#1d4ed8 100%);
  color:#fff;padding:44px 52px;display:flex;flex-direction:column;justify-content:space-between;
}
.brand-top{display:flex;align-items:center;gap:14px}
.logo-mark{
  width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);
  display:grid;place-items:center;font-weight:800;font-size:22px;color:#fff;
}
.logo-mark.sm{width:38px;height:38px;font-size:18px;background:var(--primary);border:none}
.brand-name{font-weight:700;font-size:16px}
.brand-sub{font-size:12px;opacity:.75;margin-top:2px}
.brand-body h1{font-size:34px;line-height:1.2;margin:0 0 14px;font-weight:800;letter-spacing:-.4px}
.brand-body p{font-size:15px;line-height:1.6;opacity:.85;max-width:440px;margin:0 0 22px}
.brand-body ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.brand-body li{font-size:14px;opacity:.95;padding-left:26px;position:relative}
.brand-body li::before{content:"✓";position:absolute;left:0;top:0;width:18px;height:18px;border-radius:50%;
  background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:11px}
.brand-foot{font-size:12px;opacity:.65}

.login-panel{display:flex;align-items:center;justify-content:center;padding:32px 20px;background:var(--bg)}
.login-card{
  width:100%;max-width:400px;background:var(--surface);border:1px solid var(--border);border-radius:18px;
  padding:34px 32px;box-shadow:var(--shadow);
}
.login-icon{width:46px;height:46px;border-radius:12px;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center;margin-bottom:16px}
.login-card h2{margin:0;font-size:24px;font-weight:800;letter-spacing:-.3px}
.login-sub{margin:6px 0 22px;color:var(--muted);font-size:14px}
.alert{background:var(--danger-bg);color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 35%,transparent);
  padding:10px 12px;border-radius:10px;font-size:13px;margin-bottom:16px}
.login-card label{display:block;font-size:13px;font-weight:600;margin:14px 0 6px}
.field{
  width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);
  color:var(--text);font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s;
}
.field:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 22%,transparent)}
.pwd-wrap{position:relative}
.pwd-wrap .field{padding-right:62px}
.pwd-toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--primary);
  font-size:12px;font-weight:600;cursor:pointer;padding:6px 8px}
.hint{font-size:12px;color:var(--muted);margin-top:8px}
.btn-primary{
  width:100%;margin-top:22px;padding:13px;border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;
  background:linear-gradient(180deg,var(--primary),var(--primary-2));box-shadow:0 6px 16px color-mix(in srgb,var(--primary) 35%,transparent);
  transition:transform .1s,opacity .15s;
}
.btn-primary:hover:not(:disabled){transform:translateY(-1px)}
.btn-primary:disabled{opacity:.65;cursor:not-allowed}
.divider{display:flex;align-items:center;gap:12px;margin:22px 0 16px;color:var(--muted);font-size:12px}
.divider::before,.divider::after{content:"";flex:1;height:1px;background:var(--border)}
.google-wrap{display:flex;justify-content:center}

/* ---------- APP LAYOUT ---------- */
.app{height:100vh;display:grid;grid-template-columns:300px 1fr;overflow:hidden}
.sidebar{
  background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:20px 16px;gap:16px;overflow-y:auto;
}
.side-brand{display:flex;align-items:center;gap:12px;padding:2px 4px}
.side-title{font-weight:800;font-size:16px}
.side-sub{font-size:12px;color:var(--muted)}
.profile-card{background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:18px 16px;text-align:center}
.avatar-lg{width:56px;height:56px;border-radius:50%;margin:0 auto 10px;display:grid;place-items:center;font-weight:800;font-size:19px;color:#fff;
  background:linear-gradient(135deg,var(--primary),#7c3aed)}
.p-name{font-weight:700;font-size:14px;line-height:1.3}
.p-meta{font-size:12px;color:var(--muted);margin-top:3px}
.att{margin-top:14px;text-align:left}
.att-row{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px}
.att-row strong{font-size:14px}
.good{color:var(--good)} .mid{color:var(--mid)} .low{color:var(--low)}
.bar{height:7px;border-radius:99px;background:var(--border);overflow:hidden}
.bar-fill{height:100%;border-radius:99px;transition:width .5s}
.bar-fill.good{background:var(--good)} .bar-fill.mid{background:var(--mid)} .bar-fill.low{background:var(--low)}
.side-section{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:0 6px}
.actions{display:grid;gap:4px}
.action{
  display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;color:var(--text);
  padding:10px 10px;border-radius:10px;font-size:14px;cursor:pointer;transition:background .15s;
}
.action:hover:not(:disabled){background:var(--primary-soft)}
.action:disabled{opacity:.5;cursor:not-allowed}
.a-icon{width:26px;height:26px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border);display:grid;place-items:center;font-size:14px}
.side-foot{margin-top:auto;display:grid;gap:6px;padding-top:8px;border-top:1px solid var(--border)}
.ghost{display:flex;align-items:center;gap:10px;background:none;border:none;color:var(--muted);padding:10px;border-radius:10px;font-size:13px;cursor:pointer}
.ghost:hover{background:var(--surface-2);color:var(--text)}

.main{display:flex;flex-direction:column;min-width:0;height:100vh}
.topbar{
  display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 24px;background:var(--surface);
  border-bottom:1px solid var(--border);
}
.bot-id{display:flex;align-items:center;gap:12px}
.bot-avatar{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff;
  background:#fff;border:1px solid var(--border)}
.bot-avatar.sm{width:32px;height:32px;border-radius:10px;flex-shrink:0}
.bot-avatar.sm svg{width:17px;height:17px}
.bot-name{font-weight:700;font-size:15px}
.bot-status{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;margin-top:2px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--good);box-shadow:0 0 0 3px color-mix(in srgb,var(--good) 25%,transparent)}
.icon-btn{width:38px;height:38px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text);
  display:grid;place-items:center;cursor:pointer}
.icon-btn:hover{background:var(--surface-2)}
.menu-btn{display:none}

.messages{flex:1;overflow-y:auto;padding:24px 20px}
.messages-inner{max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
.row{display:flex;gap:10px;align-items:flex-end;animation:pop .22s ease-out}
.row.user{justify-content:flex-end}
.bubble-col{max-width:78%;display:flex;flex-direction:column}
.row.user .bubble-col{align-items:flex-end}
.bubble{padding:12px 16px;font-size:14.5px;line-height:1.6;word-break:break-word}
.bubble.bot{background:var(--surface);border:1px solid var(--border);border-radius:16px 16px 16px 4px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.bubble.user{color:#fff;background:linear-gradient(135deg,var(--bubble-user-1),var(--bubble-user-2));border-radius:16px 16px 4px 16px}
.line{white-space:pre-wrap;min-height:1em}
.line.bullet{padding-left:6px}
.meta{display:flex;align-items:center;gap:12px;font-size:11px;color:var(--muted);margin:5px 4px 0}
.copy{display:inline-flex;align-items:center;gap:5px;background:none;border:none;color:var(--muted);font-size:11px;cursor:pointer;padding:0}
.copy:hover{color:var(--primary)}
.typing{display:flex;gap:5px;align-items:center;padding:16px 18px}
.typing span{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:bounce 1.2s infinite ease-in-out}
.typing span:nth-child(2){animation-delay:.15s} .typing span:nth-child(3){animation-delay:.3s}

.composer{background:linear-gradient(180deg,transparent,var(--bg) 30%);padding:6px 20px 16px}
.composer-inner{max-width:820px;margin:0 auto}
.chips{display:flex;gap:8px;overflow-x:auto;padding:4px 0 10px;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{white-space:nowrap;padding:7px 14px;border-radius:99px;border:1px solid var(--border);background:var(--surface);color:var(--primary);
  font-size:13px;font-weight:500;cursor:pointer;transition:all .15s}
.chip:hover:not(:disabled){background:var(--primary-soft);border-color:var(--primary)}
.chip:disabled{opacity:.5;cursor:not-allowed}
.input-box{display:flex;align-items:flex-end;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:8px 8px 8px 16px;
  box-shadow:var(--shadow);transition:border-color .15s,box-shadow .15s}
.input-box:focus-within{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 18%,transparent)}
.input-box textarea{
  flex:1;border:none;outline:none;resize:none;background:transparent;color:var(--text);font-size:14.5px;font-family:inherit;
  line-height:1.5;padding:8px 0;max-height:140px;
}
.input-box textarea::placeholder{color:var(--muted)}
.send{width:42px;height:42px;border-radius:12px;border:none;color:#fff;cursor:pointer;display:grid;place-items:center;flex-shrink:0;
  background:linear-gradient(180deg,var(--primary),var(--primary-2));transition:opacity .15s,transform .1s}
.send:hover:not(:disabled){transform:translateY(-1px)}
.send:disabled{opacity:.4;cursor:not-allowed}
.disclaimer{text-align:center;font-size:11px;color:var(--muted);margin-top:8px}
.overlay{display:none}

@keyframes pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}

/* ---------- LOGO & BANNER ---------- */
.brand-banner{background:#fff;border-radius:14px;padding:14px 18px;box-shadow:0 8px 24px rgba(0,0,0,.18)}
.brand-banner img{width:100%;height:auto;display:block}
.mobile-banner{display:none;width:100%;max-width:300px;height:auto;margin:0 auto 18px}
.logo-box{width:46px;height:46px;border-radius:12px;background:#fff;border:1px solid var(--border);display:grid;place-items:center;flex-shrink:0}
.banner-strip{background:#fff;border-bottom:1px solid var(--border);padding:8px 24px;display:flex;align-items:center;justify-content:center}
.banner-strip img{height:54px;width:auto;max-width:100%;display:block}
.login-icon{background:#fff;border:1px solid var(--border)}

/* ---------- RESPONSIVE ---------- */
@media (max-width:900px){
  .mobile-banner{display:block}
  .banner-strip{padding:6px 12px}
  .banner-strip img{height:42px}
  .login-wrap{grid-template-columns:1fr}
  .login-brand{display:none}
  .app{grid-template-columns:1fr}
  .sidebar{position:fixed;inset:0 auto 0 0;width:300px;max-width:86vw;z-index:30;transform:translateX(-100%);transition:transform .25s;box-shadow:var(--shadow)}
  .sidebar.open{transform:none}
  .overlay{display:block;position:fixed;inset:0;background:rgba(2,6,23,.5);z-index:20}
  .menu-btn{display:grid}
  .topbar{padding:10px 14px}
  .bubble-col{max-width:88%}
  .messages{padding:16px 12px}
  .composer{padding:6px 12px 12px}
  .disclaimer{display:none}
}
`;