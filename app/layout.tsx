import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/auth/AuthProvider';
import ThemeProvider from '@/components/layout/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import PopoyChatbot from '@/components/chatbot/PopoyChatbot';


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
    <html lang="en" suppressHydrationWarning>
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
