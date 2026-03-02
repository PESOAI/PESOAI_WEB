import React from "react";
import { useLocation } from "react-router-dom"; 
import Navbar from "../components/Navbar"; 
import FeatureCard from "../components/FeatureCard"; 
import Footer from "../components/Footer";
import "../index.css";

export default function LandingPage() {
  const location = useLocation();                
  
  const shouldOpenLogin = location.state?.fromSwitch; 

  return (
    <div className="font-sans text-slate-900 bg-white selection:bg-blue-100">
      <Navbar openLogin={shouldOpenLogin} /> 

      <section id="home" className="relative flex flex-col items-center justify-center px-8 md:px-24 py-32 lg:py-48 bg-slate-50 overflow-hidden text-center">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100 rounded-full blur-[150px] opacity-60"></div>

        <div className="max-w-4xl z-10">
          <h2 className="text-6xl md:text-8xl font-extrabold mb-8 leading-[1.1] tracking-tight text-slate-900">
            Plan. Earn. Save. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-600">
              Optimize.
            </span> 
          </h2>
          <p className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed max-w-2xl mx-auto">
            Take total control of your financial future. PESO AI combines smart expense tracking with powerful insights to help you manage your wealth anywhere, anytime.
          </p>
        </div>
      </section>

      <section id="features" className="px-8 md:px-24 py-24 bg-white">
        <div className="text-center mb-20">
          <h3 className="text-blue-600 font-bold uppercase tracking-[0.25em] text-xs mb-4">Why PESO AI</h3>
          <h4 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Financial Freedom Simplified</h4>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard title="Smart Tracking" description="Automated expense monitoring." icon="🛡️" />
          <FeatureCard title="Real-time Insights" description="AI-driven financial advice." icon="📊" />
          <FeatureCard title="Goal Setting" description="Achieve your dreams faster." icon="⚔️" />
          <FeatureCard title="Secure Data" description="Your privacy is our priority." icon="🏗️" />
        </div>
      </section>

      <Footer />
    </div>
  );
}