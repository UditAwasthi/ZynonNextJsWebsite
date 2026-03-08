import { ThemeProvider } from "../src/context/ThemeContext";
import "./globals.css";
import { LayoutProvider } from "../src/context/LayoutContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <LayoutProvider>
            {children}
          </LayoutProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}