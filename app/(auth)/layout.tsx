export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bare layout — no sidebar, no top-bar
  return <>{children}</>;
}
