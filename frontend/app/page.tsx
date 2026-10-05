"use client";
import React, { useState } from "react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rollNumber, setRollNumber] = useState("");
  const [password, setPassword] = useState("");
  const [student, setStudent] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Array<{ sender: string; text: string; fileUrl?: string | null }>>([]);
  const [inputMsg, setInputMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roll_number: rollNumber.trim().toUpperCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStudent(data.student);
        setIsLoggedIn(true);
        setMessages([
          {
            sender: "AI",
            text: `Welcome ${data.student.name} (${data.student.roll_number})! Your attendance up to Sep 19, 2026 is ${data.student.attendance}. Ask me any academic, general, or college questions!`,
          },
        ]);
      } else {
        setError(data.detail || "Login failed. Check your roll number and password.");
      }
    } catch (err) {
      setError("Cannot connect to backend server. Ensure Uvicorn is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setMessages((prev) => [...prev, { sender: "User", text: userText }]);
    setInputMsg("");

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          roll_number: student.roll_number,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { sender: "AI", text: data.response, fileUrl: data.file_url },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "AI", text: "Failed to send message. Check backend connection." },
      ]);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white p-4">
        <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-400">NARAYANA AI PORTAL</h1>
            <p className="text-sm text-slate-400">ECE-ACT Department Login</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                PIN Number / Roll Number
              </label>
              <input
                type="text"
                placeholder="e.g. 24711A4307 or 25715A4302"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition duration-200 shadow-md disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "LOGIN TO DASHBOARD"}
            </button>
          </form>
          <p className="text-center text-xs text-slate-500 mt-4">
            Default Password: <span className="text-slate-300 font-mono">Necn@2025</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Dashboard Top Header */}
      <header className="flex flex-wrap justify-between items-center px-6 py-3 bg-slate-900 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-lg font-bold text-blue-400">Narayana AI ChatBox (ECE-ACT)</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
            <span>👤 Name: <strong className="text-white">{student.name}</strong></span>
            <span>•</span>
            <span>🆔 PIN: <strong className="text-blue-300">{student.roll_number}</strong></span>
          </div>
        </div>

        {/* Attendance Badge Header */}
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 border border-slate-700 px-4 py-1.5 rounded-lg text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Attendance (Upto Sep 19, 2026)</p>
            <p className="text-sm font-extrabold text-emerald-400">{student.attendance}</p>
          </div>

          <button
            onClick={() => setIsLoggedIn(false)}
            className="text-xs px-3 py-1.5 bg-red-600/80 hover:bg-red-500 rounded text-white font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === "User" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xl p-4 rounded-xl text-sm whitespace-pre-wrap ${
                m.sender === "User" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200 border border-slate-700"
              }`}
            >
              {m.text}
              {m.fileUrl && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-400 underline hover:text-blue-300"
                  >
                    📥 Download Attachment / Shared Document
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          placeholder="Ask any question (e.g. 'Explain Maxwell equations', 'my marks', 'syllabus pdf')..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg">
          Send
        </button>
      </form>
    </div>
  );
}