export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth here — each sub-layout handles its own auth check
  return <>{children}</>;
}
