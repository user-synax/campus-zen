import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "CampusZen — Student Social Network",
  description:
    "CampusZen is a student-first social network to discover students, share thoughts, and stay connected to campus life across India.",
  keywords: ["campuszen", "student social network", "college", "campus"],
  authors: [{ name: "CampusZen" }],
  creator: "CampusZen",
  metadataBase: new URL("https://campuszen.app"),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-[var(--cz-bg)] text-[var(--cz-text-primary)] selection:bg-[var(--cz-muted)] selection:text-[var(--cz-text-inverse)]">
        {children}
      </body>
    </html>
  );
}
