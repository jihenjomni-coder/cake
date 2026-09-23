'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import {
  Cake,
  ShoppingBag,
  Calendar,
  ChefHat,
  User,
  LogOut,
  Menu as MenuIcon,
  X,
  Sparkles,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { totalItemsCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EADBCE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#2A1810] to-[#C97A2B] flex items-center justify-center text-white shadow-md shadow-[#2A1810]/10 group-hover:scale-105 transition-transform duration-200">
              <Cake className="w-6 h-6 text-[#FFFDFB]" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-[#2A1810]">
                CakeCart
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-[#C97A2B] font-semibold">
                Artisan Small-Batch
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/menu"
              className={`text-sm font-medium transition-colors hover:text-[#C97A2B] ${
                isActive('/menu') ? 'text-[#C97A2B] font-semibold' : 'text-[#5C4033]'
              }`}
            >
              Artisan Menu
            </Link>
            <Link
              href="/pickup"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-[#C97A2B] ${
                isActive('/pickup') ? 'text-[#C97A2B] font-semibold' : 'text-[#5C4033]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Pickup Schedule
            </Link>
            {user && (
              <Link
                href="/my-orders"
                className={`text-sm font-medium transition-colors hover:text-[#C97A2B] ${
                  isActive('/my-orders') ? 'text-[#C97A2B] font-semibold' : 'text-[#5C4033]'
                }`}
              >
                My Orders
              </Link>
            )}
            {user?.role === 'BAKER' && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#3D251B] transition-colors shadow-sm"
              >
                <ChefHat className="w-3.5 h-3.5 text-[#C97A2B]" />
                Baker Dashboard
              </Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Cart Icon */}
            <Link
              href="/cart"
              id="nav-cart-btn"
              className="relative p-2.5 rounded-full bg-[#FFFDFB] border border-[#EADBCE] text-[#2A1810] hover:border-[#C97A2B] hover:shadow-sm transition-all"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 text-[#2A1810]" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C97A2B] text-white text-[11px] font-bold flex items-center justify-center animate-pulse">
                  {totalItemsCount}
                </span>
              )}
            </Link>

            {/* User Session */}
            {user ? (
              <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-[#EADBCE]">
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#2A1810] leading-none">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-[#8C6D58] uppercase tracking-wider mt-0.5">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  title="Log out"
                  className="p-2 text-[#8C6D58] hover:text-[#D94E64] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                id="nav-login-btn"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#2A1810] text-[#2A1810] text-xs font-medium hover:bg-[#2A1810] hover:text-white transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Sign In
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#2A1810] md:hidden hover:bg-[#EADBCE]/50"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#EADBCE] bg-[#FAF7F2] space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <Link
              href="/menu"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-[#5C4033] hover:bg-[#EADBCE]/40"
            >
              Artisan Menu
            </Link>
            <Link
              href="/pickup"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-[#5C4033] hover:bg-[#EADBCE]/40"
            >
              Pickup Schedule & Capacity
            </Link>
            {user && (
              <Link
                href="/my-orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[#5C4033] hover:bg-[#EADBCE]/40"
              >
                My Orders
              </Link>
            )}
            {user?.role === 'BAKER' && (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-[#FFFDFB] bg-[#2A1810]"
              >
                Baker Management Dashboard
              </Link>
            )}
            <div className="pt-2 border-t border-[#EADBCE]">
              {user ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-[#5C4033] font-medium">{user.email}</span>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="text-xs text-[#D94E64] font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-center text-sm font-semibold rounded-lg bg-[#2A1810] text-[#FFFDFB]"
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
