import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poly Crack - Prediction Markets",
  description: "Predict outcomes, earn points, prove your knowledge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a1a] text-poly-text antialiased">
        <nav className="sticky top-0 z-50 border-b border-poly-border bg-poly-bg/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <a href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-poly-highlight font-bold text-white">
                PC
              </div>
              <span className="text-xl font-bold">
                Poly<span className="text-poly-highlight">Crack</span>
              </span>
            </a>
            <div className="hidden items-center gap-6 md:flex">
              <a
                href="/markets"
                className="text-sm text-poly-muted transition hover:text-white"
              >
                Markets
              </a>
              <a
                href="/create"
                className="text-sm text-poly-muted transition hover:text-white"
              >
                Create
              </a>
              <a
                href="/leaderboard"
                className="text-sm text-poly-muted transition hover:text-white"
              >
                Leaderboard
              </a>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/profile"
                className="rounded-lg bg-poly-accent px-4 py-2 text-sm font-medium transition hover:bg-poly-highlight"
              >
                Profile
              </a>
              <a
                href="/auth"
                className="rounded-lg bg-poly-highlight px-4 py-2 text-sm font-medium text-white transition hover:bg-poly-highlight/80"
              >
                Sign In
              </a>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
