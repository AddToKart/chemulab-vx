import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/auth/AuthProvider';
import ThemeProvider from '@/components/layout/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import PopoyChatbot from '@/components/chatbot/PopoyChatbot';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CheMuLab',
  description:
    'Learn Chemistry Through Play — Discover elements, combine them, and track your progress.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${plusJakarta.variable}`}>
      <body>
        <AuthProvider>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <PopoyChatbot />
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
