import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'HeliosTrack | Enterprise Solar Fleet & Virtual Grid Simulator',
  description: 'Distributed IoT solar fleet monitoring, virtual storage mechanics, and real-time smart grid infeed analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070B14] text-slate-100 antialiased selection:bg-amber-500/20 selection:text-amber-300">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
