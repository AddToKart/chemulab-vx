import AppShell from '@/components/layout/AppShell';
import PopoyChatbot from '@/components/chatbot/PopoyChatbot';
import ProtectedLayout from '@/components/auth/ProtectedLayout';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout>
      <TooltipProvider>
        <AppShell>
          {children}
          <PopoyChatbot />
        </AppShell>
      </TooltipProvider>
    </ProtectedLayout>
  );
}
