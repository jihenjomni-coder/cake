import React from 'react';
import Link from 'next/link';
import { Cake, Clock, MapPin, ShieldAlert, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#2A1810] text-[#EADBCE] mt-auto border-t border-[#3D251B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#C97A2B] flex items-center justify-center text-white">
                <Cake className="w-5 h-5" />
              </div>
              <span className="font-serif text-2xl font-bold text-[#FFFDFB]">CakeCart</span>
            </div>
            <p className="text-sm text-[#C4A48C] leading-relaxed">
              Bespoke artisan cakes baked fresh in small batches. We respect our oven’s daily capacity to guarantee perfection in every layer.
            </p>
          </div>

          {/* Bakery Hours & Location */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#FFFDFB]">
              Pickup Atelier
            </h4>
            <div className="space-y-2 text-sm text-[#C4A48C]">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#C97A2B] shrink-0 mt-0.5" />
                <span>124 Artisan Row, Atelier 4B, London</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#C97A2B] shrink-0 mt-0.5" />
                <div>
                  <p>Tue – Sun: 10:00 AM – 5:00 PM</p>
                  <p className="text-xs text-[#8C6D58]">Closed on Mondays for deep cleaning</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bakery Policies */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#FFFDFB]">
              Baking Rules
            </h4>
            <ul className="space-y-2 text-xs text-[#C4A48C]">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C97A2B]"></span>
                <span>Minimum 48-hour advance notice</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C97A2B]"></span>
                <span>Strict daily batch limits per date</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C97A2B]"></span>
                <span>24-hour cancellation cut-off window</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C97A2B]"></span>
                <span>Dedicated allergen-safe prep areas</span>
              </li>
            </ul>
          </div>

          {/* Navigation & Staff */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#FFFDFB]">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-[#C4A48C]">
              <li>
                <Link href="/menu" className="hover:text-[#FFFDFB] transition-colors">
                  Artisan Cake Menu
                </Link>
              </li>
              <li>
                <Link href="/pickup" className="hover:text-[#FFFDFB] transition-colors">
                  Check Pickup Availability
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#FFFDFB] transition-colors">
                  Customer & Baker Sign In
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-xs text-[#C97A2B] hover:underline">
                  Baker Atelier Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#3D251B] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C6D58] gap-4">
          <p>© {new Date().getFullYear()} CakeCart Artisan Bakery. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Handcrafted with <Heart className="w-3.5 h-3.5 text-[#D94E64] fill-current" /> by the CakeCart Team
          </p>
        </div>
      </div>
    </footer>
  );
}
