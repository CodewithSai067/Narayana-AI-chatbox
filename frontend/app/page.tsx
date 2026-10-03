'use client';

import { useState } from 'react';
import { 
  LayoutGrid, User, AlertTriangle, Lock, Send, Phone, 
  KeyRound, UserCheck, School, GraduationCap, IdCard, 
  Sparkles, MessageSquare, Plus, Compass, Lightbulb, Paperclip
} from 'lucide-react';

export default function NarayanaPortal() {
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [step, setStep] = useState<'login' | 'otp' | 'dashboard'>('login');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('chat');
  const [identifier, setIdentifier] = useState('7382499735');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [authError, setAuthError] = useState('');

  // Chat State
  const [messages, setMessages] = useState<{ 
    sender: 'user' | 'bot'; 
    text: string; 
    file_url?: string; 
    is_image?: boolean; 
  }[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Send OTP Function
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (role === 'student' && identifier !== '7382499735' && identifier.toUpperCase() !== '25715A4302') {
      setAuthError('Invalid Student Credential. Use Mobile: 7382499735 or Roll: 25715A4302');
      return;
    }
    if (role === 'faculty' && identifier !== '9876543210' && identifier !== 'NECF-ECE-01') {
      setAuthError('Invalid Faculty Credential. Use Mobile: 9876543210 or ID: NECF-ECE-01');
      return;
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setStep('otp');
  };

  // Verify OTP Function
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === generatedOtp || otp === '1234') {
      setStep('dashboard');
    } else {
      setAuthError('Invalid OTP! Please enter the code shown above.');
    }
  };

  // File Upload Handler
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roll_number', '25715A4302');

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: `📎 Uploaded file: ${file.name}` },
        { 
          sender: 'bot', 
          text: `✅ Processed ${file.name} successfully!\n\n${data.extracted_content}`,
          file_url: data.file_url,
          is_image: data.is_image
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: '❌ Failed to upload file to backend server.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Chatbot Handler
  const handleSendMessage = async (customQuery?: string) => {
    const query = customQuery || inputMsg;
    if (!query.trim()) return;

    const updated = [...messages, { sender: 'user' as const, text: query }];
    setMessages(updated);
    if (!customQuery) setInputMsg('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, roll_number: '25715A4302' })
      });
      const data = await res.json();
      setMessages([...updated, { 
        sender: 'bot', 
        text: data.response, 
        file_url: data.file_url, 
        is_image: data.is_image 
      }]);
    } catch {
      let botText = "Hello! Ask me about your Mid-1 marks, classroom, HOD, or attendance.";
      const msg = query.toLowerCase();
      if (msg.includes('dc') || msg.includes('digital communication')) {
        botText = "📝 Mid-1 Score for Digital Communications (DC): 23/30";
      } else if (msg.includes('mpmc') || msg.includes('microprocessor')) {
        botText = "📝 Mid-1 Score for Microprocessors & Microcontrollers (MPMC): 30/30";
      } else if (msg.includes('cao') || msg.includes('computer architecture')) {
        botText = "📝 Mid-1 Score for Computer Architecture & Organization (CAO): 30/30";
      } else if (msg.includes('awp') || msg.includes('antenna')) {
        botText = "📝 Mid-1 Score for Antenna & Wave Propagation (AWP): 30/30";
      } else if (msg.includes('mark') || msg.includes('score') || msg.includes('mid 1')) {
        botText = "📝 Official Mid-1 Scores:\n• DC: 23/30\n• MPMC: 30/30\n• CAO: 30/30\n• AWP: 30/30\n• Quantum Tech: Pending";
      } else if (msg.includes('room') || msg.includes('class')) {
        botText = "🏫 Your assigned classroom for ECE-ACT is Room Number 203.";
      } else if (msg.includes('hod')) {
        botText = "👨‍🏫 Head of Department (ECE): Dr. K. Murali, Ph.D.";
      } else if (msg.includes('attendance')) {
        botText = "📊 Current Attendance: 82.5% (Eligible for Examinations).";
      }

      setMessages([...updated, { sender: 'bot', text: botText }]);
    } finally {
      setLoading(false);
    }
  };

  if (step !== 'dashboard') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 text-white font-black text-2xl rounded-2xl flex items-center justify-center shadow-lg mb-3">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-wide uppercase">Narayana AI Portal</h1>
            <p className="text-xs text-neutral-400 mt-1">Autonomous • Nellore | Academic Assistant</p>
          </div>

          <div className="flex bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 mb-6">
            <button
              onClick={() => { setRole('student'); setIdentifier('7382499735'); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                role === 'student' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Student Portal
            </button>
            <button
              onClick={() => { setRole('faculty'); setIdentifier('9876543210'); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                role === 'faculty' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Faculty Portal
            </button>
          </div>

          {step === 'login' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  {role === 'student' ? 'Registered Mobile / Roll Number' : 'Faculty Mobile / Staff ID'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition"
                    placeholder="Enter mobile number"
                    required
                  />
                </div>
              </div>

              {authError && <p className="text-xs text-rose-400 font-medium">{authError}</p>}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs tracking-wider uppercase shadow-lg transition"
              >
                Request OTP Code
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs text-blue-200">
                📲 Verification code sent to ending in <strong>{identifier.slice(-4)}</strong>.
                <br />
                <span className="text-amber-400 font-mono mt-1 block">Demo OTP Code: {generatedOtp}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  Enter 4-Digit OTP
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white font-mono tracking-widest focus:outline-none focus:border-blue-500 transition"
                    placeholder="1234"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              {authError && <p className="text-xs text-rose-400 font-medium">{authError}</p>}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-xs tracking-wider uppercase shadow-lg transition"
              >
                Verify & Enter Portal
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-neutral-800/80 text-center text-[11px] text-neutral-500">
            Protected by Narayana Gemini AI Engine
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans antialiased overflow-hidden">
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800/80 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-neutral-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-wide block">Narayana AI</span>
              <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">Gemini Powered</span>
            </div>
          </div>

          <div className="p-4">
            <button 
              onClick={() => { setMessages([]); setActiveTab('chat'); }}
              className="w-full mb-6 py-2.5 px-4 rounded-full bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700/60 text-neutral-200 font-semibold text-xs flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4 text-blue-400" /> New Chat
            </button>

            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-3 mb-2">
              Workspace
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'chat'
                    ? 'bg-neutral-800 text-blue-400 border border-neutral-700/50'
                    : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" /> AI ChatBox
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'dashboard'
                    ? 'bg-neutral-800 text-blue-400 border border-neutral-700/50'
                    : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" /> Student Dashboard
              </button>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800/60">
          <button 
            onClick={() => setStep('login')}
            className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition"
          >
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950 relative">
        <header className="h-16 border-b border-neutral-800/60 bg-neutral-900/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              {activeTab === 'chat' ? 'Gemini AI Assistant' : 'Academic Profile'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-white">
                {role === 'student' ? 'ASAPU HARSHITH KUMAR' : 'Dr. K. Murali, Ph.D.'}
              </p>
              <p className="text-[10px] text-neutral-400">{role === 'student' ? '25715A4302 | ECE-ACT' : 'HOD | ECE'}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
              {role === 'student' ? 'AH' : 'KM'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 max-w-5xl w-full mx-auto flex flex-col justify-between">
          {activeTab === 'dashboard' ? (
            <div className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-blue-400 shrink-0">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-white uppercase tracking-wide">ASAPU HARSHITH KUMAR</h2>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800">2028 Batch</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs rounded-xl border border-neutral-700 transition">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Report Issue
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-md">
                      <Lock className="w-4 h-4" /> Change Password
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <School className="w-5 h-5 text-neutral-400" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">Classroom</p>
                      <p className="text-xs font-bold text-white truncate">Room Number 203</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <UserCheck className="w-5 h-5 text-neutral-400" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">HOD</p>
                      <p className="text-xs font-bold text-white truncate">Dr. K. Murali, Ph.D.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <GraduationCap className="w-5 h-5 text-neutral-400" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">Branch</p>
                      <p className="text-xs font-bold text-white truncate">ECE-ACT</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <IdCard className="w-5 h-5 text-neutral-400" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">Student ID</p>
                      <p className="text-xs font-bold text-white truncate">25715A4302</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between h-full">
              {messages.length === 0 ? (
                <div className="my-auto text-left space-y-6 max-w-3xl">
                  <div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent pb-1">
                      Hello, ASAPU HARSHITH KUMAR
                    </h1>
                    <p className="text-xl text-neutral-500 font-medium mt-1">
                      How can I help with your academic performance today?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                    <button 
                      onClick={() => handleSendMessage("What is my DC marks in Mid 1?")}
                      className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left transition flex justify-between items-start group"
                    >
                      <span className="text-xs font-semibold text-neutral-300 group-hover:text-blue-400">
                        What is my DC marks in Mid 1?
                      </span>
                      <Lightbulb className="w-4 h-4 text-neutral-500 group-hover:text-blue-400 shrink-0 ml-2" />
                    </button>

                    <button 
                      onClick={() => handleSendMessage("Show all my Mid-1 examination scores")}
                      className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left transition flex justify-between items-start group"
                    >
                      <span className="text-xs font-semibold text-neutral-300 group-hover:text-emerald-400">
                        Show all my Mid-1 examination scores
                      </span>
                      <Compass className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 shrink-0 ml-2" />
                    </button>

                    <button 
                      onClick={() => handleSendMessage("Which room is our ECE classroom?")}
                      className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left transition flex justify-between items-start group"
                    >
                      <span className="text-xs font-semibold text-neutral-300 group-hover:text-amber-400">
                        Which room is our ECE classroom?
                      </span>
                      <School className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 shrink-0 ml-2" />
                    </button>

                    <button 
                      onClick={() => handleSendMessage("Who is our HOD?")}
                      className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left transition flex justify-between items-start group"
                    >
                      <span className="text-xs font-semibold text-neutral-300 group-hover:text-purple-400">
                        Who is our Head of Department?
                      </span>
                      <UserCheck className="w-4 h-4 text-neutral-500 group-hover:text-purple-400 shrink-0 ml-2" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 overflow-y-auto pb-6">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex gap-4 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.sender === 'bot' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-2xl px-5 py-3.5 rounded-3xl text-sm whitespace-pre-wrap leading-relaxed ${
                        m.sender === 'user' 
                          ? 'bg-neutral-800 text-neutral-100 rounded-br-sm border border-neutral-700/60' 
                          : 'bg-neutral-900/90 text-neutral-200 border border-neutral-800 rounded-bl-sm shadow-sm'
                      }`}>
                        <p>{m.text}</p>

                        {/* Image Preview */}
                        {m.file_url && m.is_image && (
                          <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-700/60 max-w-sm">
                            <img src={m.file_url} alt="Circular" className="w-full h-auto object-cover" />
                          </div>
                        )}

                        {/* PDF Download Card */}
                        {m.file_url && !m.is_image && (
                          <div className="mt-3 p-3 bg-neutral-800 rounded-2xl border border-neutral-700/80 flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-400">📎 Document Available</span>
                            <a 
                              href={m.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition"
                            >
                              View / Download
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-3 text-neutral-500 text-xs italic">
                      <Sparkles className="w-4 h-4 animate-spin text-blue-400" /> Gemini is processing...
                    </div>
                  )}
                </div>
              )}

              {/* Gemini Floating Prompt Input with Attachment */}
              <div className="pt-4">
                <div className="relative bg-neutral-900 border border-neutral-800 rounded-3xl p-2 shadow-2xl focus-within:border-neutral-700 focus-within:ring-1 focus-within:ring-blue-500/50 transition flex items-center">
                  <label className="p-2.5 hover:bg-neutral-800 rounded-2xl cursor-pointer transition text-neutral-400 hover:text-blue-400">
                    <Paperclip className="w-5 h-5" />
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }} 
                    />
                  </label>
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Enter a prompt or attach a PDF/Image..."
                    className="w-full pl-2 pr-12 py-3 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    className="absolute right-3 p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-center text-neutral-600 mt-2">
                  Narayana AI ChatBox can make mistakes. Verify official marks with your department notice board.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}