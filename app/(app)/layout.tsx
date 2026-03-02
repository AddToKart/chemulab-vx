import AppShell from '@/components/layout/AppShell';
import PopoyChatbot from '@/components/chatbot/PopoyChatbot';
import ProtectedLayout from '@/components/auth/ProtectedLayout';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout>
      <AppShell>
        {children}
        <PopoyChatbot />
      </AppShell>
    </ProtectedLayout>
  );
}
