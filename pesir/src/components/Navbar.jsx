import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, X, ArrowRight } from "lucide-react";
import logo from "../assets/logo.png";

export default function Navbar({ openLogin }) {
  const navigate = useNavigate();
  const [tapCount, setTapCount] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(openLogin || false);
  const [accessKey, setAccessKey] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const isLoggingIn = useRef(false);

  useEffect(() => { setShowAdminModal(openLogin || false); }, [openLogin]);
  useEffect(() => {
    const timer = setTimeout(() => setTapCount(0), 2000);
    return () => clearTimeout(timer);
  }, [tapCount]);

  const handleLogoTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next === 5) { setShowAdminModal(true); setTapCount(0); }
  };

  const handleLogin = async () => {
    const u = accessKey.trim();
    const p = password.trim();

    if (!u || !p) return;
    if (isLoggingIn.current) return;
    isLoggingIn.current = true;

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user || {}));
        localStorage.setItem('lastLogin', new Date().toLocaleString());
        setIsSuccess(true);
        setTimeout(() => navigate("/admin", { replace: true }), 800);
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (err) {
      setError(true);
      setTimeout(() => setError(false), 1000);
    } finally {
      setTimeout(() => { isLoggingIn.current = false; }, 1500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 md:px-12 py-4 bg-white/70 backdrop-blur-md border-b border-slate-100 sticky top-0 z-[60]">
        <div onClick={handleLogoTap} className="flex items-center gap-3 cursor-pointer group select-none">
          <img src={logo} alt="PESO AI" className="w-11 h-11 object-contain drop-shadow-md group-active:scale-90 transition-transform duration-200" />
          <div className="flex flex-col -space-y-1">
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">
              PESO<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI</span>
            </h1>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Financial Intelligence</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center space-x-10">
          {['Home', 'Features'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-all relative group">
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
            </a>
          ))}
        </nav>
      </header>

      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xl animate-in fade-in duration-500"
            onClick={() => setShowAdminModal(false)}
          />
          <div className={`relative bg-white rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-2xl border-4 transition-all duration-500
            ${error ? 'border-red-400 animate-bounce' : 'border-indigo-50/50'}
            ${isSuccess ? 'scale-90 opacity-0' : 'animate-in zoom-in-95 duration-300'}`}>

            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute right-8 top-8 p-1.5 hover:bg-slate-100 rounded-full text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-700 shadow-2xl
                ${isSuccess ? 'bg-emerald-500 shadow-emerald-200 scale-110' : 'bg-[#0d1b3e] shadow-slate-300'}`}>
                {isSuccess
                  ? <ShieldCheck size={36} className="text-white" />
                  : <img src={logo} alt="PESO AI" className="w-12 h-12 object-contain" />
                }
              </div>

              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                {isSuccess ? 'Access Granted' : 'Admin Authentication'}
              </h3>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-8">
                {isSuccess ? 'Redirecting...' : 'Encrypted Protocol Required'}
              </p>

              {!isSuccess && (
                <div className="space-y-4">
                  <div className="text-left space-y-1">
                    <label className="text-[10px] font-black text-indigo-600 ml-4 uppercase tracking-tighter">Username:</label>
                    <input
                      type="text"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter Username"
                      autoComplete="off"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono text-slate-900"
                    />
                  </div>
                  <div className="text-left space-y-1">
                    <label className="text-[10px] font-black text-indigo-600 ml-4 uppercase tracking-tighter">Password:</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono text-slate-900"
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                      Invalid Credentials
                    </p>
                  )}
                  <button
                    onClick={handleLogin}
                    className="w-full py-4 mt-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                  >
                    Authenticate <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}