import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Shield, Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Building2, Server } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = usePortal();
  
  const [email, setEmail] = useState("master@novafxm.com");
  const [password, setPassword] = useState("master123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate quick auth delay for smooth UI feedback
    setTimeout(() => {
      const result = login(email, password);
      if (!result.success) {
        setError(result.error || "Invalid email or password.");
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen w-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Gradients & Mesh */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-amber-500 p-0.5 shadow-2xl shadow-emerald-500/20 mb-4">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
            Master Control Panel
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Multi-Broker Gateway Admin Authentication
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top subtle highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-teal-500" />

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Admin Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="master@novafxm.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Master Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Info Card */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-300 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Default Master Credentials:</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-emerald-400 font-semibold select-all">master@novafxm.com</span>
                </div>
                <div className="flex justify-between">
                  <span>Password:</span>
                  <span className="text-amber-400 font-semibold select-all">master123</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Brand Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-slate-500 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>NovaFXM</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5 font-medium">
            <Server className="w-3.5 h-3.5 text-teal-400" />
            <span>A5 Markets</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>VeltriumFX</span>
          </div>
        </div>
      </div>
    </div>
  );
};
