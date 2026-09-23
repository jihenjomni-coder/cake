'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Cake, Lock, Mail, User, Phone, ChefHat, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Failed to sign in.');
        } else {
          // If baker login, push to dashboard
          if (email.toLowerCase().includes('baker')) {
            router.push('/dashboard');
          } else {
            router.push('/my-orders');
          }
        }
      } else {
        const res = await register({ email, password, fullName, phone });
        if (!res.success) {
          setError(res.error || 'Failed to create account.');
        } else {
          router.push('/my-orders');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const setTestAccount = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setMode('LOGIN');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2A1810] to-[#C97A2B] text-white flex items-center justify-center mx-auto shadow-md">
          <Cake className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#2A1810]">
          {mode === 'LOGIN' ? 'Welcome Back' : 'Join CakeCart'}
        </h1>
        <p className="text-xs text-[#5C4033]">
          {mode === 'LOGIN'
            ? 'Sign in to manage your cake reservations and pickup passes.'
            : 'Create your account for fast cake reservations and custom messaging.'}
        </p>
      </div>

      {/* Quick Test Login Helpers */}
      <div className="p-4 rounded-2xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm space-y-2.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D58] block">
          ⚡ One-Click Demo Credentials
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTestAccount('baker@cakecart.com', 'BakerPassword123!')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#3D251B] transition-colors"
          >
            <ChefHat className="w-3.5 h-3.5 text-[#C97A2B]" />
            <span>Baker Atelier</span>
          </button>
          <button
            type="button"
            onClick={() => setTestAccount('customer@example.com', 'CustomerPassword123!')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-[#2A1810] text-xs font-semibold hover:bg-[#EADBCE]/40 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-[#C97A2B]" />
            <span>Customer</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-1 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] grid grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setMode('LOGIN');
            setError(null);
          }}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'LOGIN'
              ? 'bg-[#FFFDFB] text-[#2A1810] shadow-sm'
              : 'text-[#8C6D58] hover:text-[#2A1810]'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('REGISTER');
            setError(null);
          }}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'REGISTER'
              ? 'bg-[#FFFDFB] text-[#2A1810] shadow-sm'
              : 'text-[#8C6D58] hover:text-[#2A1810]'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm space-y-4">
        {mode === 'REGISTER' && (
          <div>
            <label className="text-xs font-semibold text-[#5C4033] block mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
              <input
                type="text"
                required
                id="login-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Elena Rostova"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-[#5C4033] block mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
            <input
              type="email"
              required
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#5C4033] block mb-1">
            Password {mode === 'REGISTER' && '(min 8 characters)'}
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
            <input
              type="password"
              required
              minLength={8}
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
            />
          </div>
        </div>

        {mode === 'REGISTER' && (
          <div>
            <label className="text-xs font-semibold text-[#5C4033] block mb-1">
              Phone Number (optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-555-0144"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-[#D94E64]/10 border border-[#D94E64]/20 flex items-center gap-2 text-xs text-[#D94E64] font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          id="login-submit-btn"
          className="w-full py-3 rounded-xl bg-[#2A1810] text-[#FFFDFB] text-xs font-bold hover:bg-[#C97A2B] disabled:opacity-50 transition-colors shadow-md mt-2"
        >
          {loading ? 'Processing...' : mode === 'LOGIN' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
