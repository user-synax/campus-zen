import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { readThemeCookie } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "404 - Page Not Found",
  description:
    "The page you are looking for does not exist. Head back to your feed or the CampusZen home page.",
};

export default async function GlobalNotFound() {
  const theme = readThemeCookie(await cookies());

  return (
    <html
      lang="en"
      className={`${inter.variable} ${theme === "dark" ? "dark" : ""} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <main className="mx-auto flex min-h-[60dvh] w-full max-w-[990px] flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <p
            aria-hidden
            className="text-[64px] leading-none font-extrabold tracking-tight text-[var(--cz-text-primary)] tabular-nums"
          >
            404
          </p>
          <h1 className="mt-2 text-[23px] leading-[28px] font-extrabold text-[var(--cz-text-primary)]">
            Page not found
          </h1>
          <p className="mt-2 max-w-[40ch] text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            The link may be broken, the page may have been removed, or you may
            have typed the wrong address.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/app"
              className="inline-flex h-[36px] items-center rounded-full bg-[var(--cz-accent)] px-4 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-colors hover:bg-[var(--cz-accent-hover)]"
            >
              Back to feed
            </Link>
            <Link
              href="/"
              className="inline-flex h-[36px] items-center rounded-full border border-[var(--cz-border-strong)] bg-transparent px-4 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
