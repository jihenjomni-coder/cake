import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'CakeCart | Handcrafted Artisan Bakery & Scheduled Pickup',
  description:
    'Order small-batch celebration and layer cakes handcrafted with organic ingredients. Select custom cake sizes, gourmet flavours, custom piped messages, and scheduled pickup slots.',
  keywords: [
    'artisan cakes',
    'bakery ordering',
    'custom cakes',
    'scheduled pickup',
    'eggless cake',
    'gluten-free cake',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAF7F2] text-[#2A1810]">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
