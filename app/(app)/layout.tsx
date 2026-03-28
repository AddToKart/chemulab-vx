import AppShell from '@/components/layout/AppShell';
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
      </AppShell>
    </ProtectedLayout>
  );
}
