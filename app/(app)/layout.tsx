import AppShell from '@/components/layout/AppShell';
import ProtectedLayout from '@/components/auth/ProtectedLayout';
import PopoyChatbot from '@/components/chatbot/PopoyChatbot';
import { AdminConsoleWidget } from '@/components/admin-console/admin-widget';
import { GlobalBGM } from '@/components/audio/GlobalBGM';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout>
      <GlobalBGM />
      <AppShell>
        {children}
      </AppShell>
      <PopoyChatbot />
      <AdminConsoleWidget />
    </ProtectedLayout>
  );
}
