import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  // States
  const [tapCount, setTapCount] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset taps after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setTapCount(0);
    }, 2000);
    return () => clearTimeout(timer);
  }, [tapCount]);

  const handleLogoTap = () => {
    const nextCount = tapCount + 1;
    setTapCount(nextCount);
    if (nextCount === 5) {
      setShowAdminModal(true);
      setTapCount(0);
    }
  };

  const handleLogin = () => {
    if (btoa(accessKey) === "QURNSU4xMjM=" && btoa(password) === "UEVTTzIwMjY=") { //built js for "binary to ASCII". ginagawa niyang ganyan yung pass
      setIsSuccess(true); 
      setError(false);

     
      setTimeout(() => {
        setShowAdminModal(false);
        setIsSuccess(false);
        setAccessKey("");
        setPassword("");
        navigate("/admin");
      }, 800);
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-8 py-4 shadow-sm bg-white sticky top-0 z-[60]">
        <h1 
          onClick={handleLogoTap}
          className="text-2xl font-bold text-blue-600 cursor-pointer select-none active:scale-95 transition-transform"
        >
          PESO AI
        </h1>

        <nav className="flex items-center space-x-6 text-sm font-medium">
        
          <a href="#home" className="py-2 hover:text-blue-600 text-slate-600 transition-colors">
            Home
          </a>
          <a href="#features" className="py-2 hover:text-blue-600 text-slate-600 transition-colors">
            Features
          </a>
        </nav>
      </header>

      {/*HIDDEN ADMIN ACCESS */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className={`bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl border transition-all duration-300 ${
            error ? 'animate-bounce border-red-500' : 'border-blue-100'
          } ${isSuccess ? 'scale-95 opacity-50' : 'animate-in fade-in zoom-in'}`}>
            
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 transition-colors ${
                isSuccess ? 'bg-green-500 text-white' : 'bg-blue-50 text-blue-600'
              }`}>
                {isSuccess ? '✓' : '🛡️'}
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2">
                {isSuccess ? 'Authorized' : 'Admin Access'}
              </h3>
              <p className="text-slate-500 mb-8 text-sm italic">
                {isSuccess ? 'Redirecting to console...' : 'Please enter your credentials'}
              </p>
              
              {!isSuccess && (
                <div className="space-y-4">
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Access Key</label>
                    <input 
                      type="text" 
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      placeholder="Enter key"
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
                    />
                  </div>

                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Password</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
                    />
                  </div>

                  {error && <p className="text-red-500 text-xs font-bold animate-pulse">Invalid Credentials!</p>}
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowAdminModal(false);
                        setError(false);
                        setAccessKey("");
                        setPassword("");
                      }}
                      className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleLogin}
                      className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                      Enter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}