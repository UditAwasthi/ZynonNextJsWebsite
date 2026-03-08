export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-6">
      {/* Centered container for login/signup forms */}
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}