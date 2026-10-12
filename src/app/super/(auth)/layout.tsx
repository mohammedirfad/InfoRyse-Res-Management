// No auth guard here — this wraps /super/login only
// The login page must be accessible without a session
export default function SuperAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
