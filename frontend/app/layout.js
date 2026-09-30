import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { readThemeCookie } from "@/lib/theme";

// TwitterChirp is proprietary — Inter is the documented substitute.
// Variable weight covers the 400 / 500 / 700 / 800 scale from DESIGN.md.
// The monospace stack for ids, slugs and OTPs is a plain CSS fallback in
// globals.css (--font-jetbrains), so no second webfont is shipped.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "CampusZen — Student Social Network",
    template: "%s — CampusZen",
  },
  description:
    "CampusZen is a student-first social network to discover students, share thoughts, and stay connected to campus life across India.",
  applicationName: "CampusZen",
  keywords: ["campuszen", "student social network", "college", "campus"],
  authors: [{ name: "CampusZen" }],
  creator: "CampusZen",
  publisher: "CampusZen",
  category: "social",
  metadataBase: new URL("https://campuszen.app"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/campusZen.png", type: "image/svg+xml" }],
    shortcut: "/campusZen.png",
    apple: [{ url: "/campusZen.png", type: "image/svg+xml" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://campuszen.app",
    siteName: "CampusZen",
    title: "CampusZen — Student Social Network",
    description:
      "CampusZen is a student-first social network to discover students, share thoughts, and stay connected to campus life across India.",
    images: [
      {
        url: "/campusZen.png",
        width: 512,
        height: 512,
        alt: "CampusZen logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "CampusZen — Student Social Network",
    description:
      "CampusZen is a student-first social network to discover students, share thoughts, and stay connected to campus life across India.",
    images: ["/campusZen.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "CampusZen",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "light",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CampusZen",
  url: "https://campuszen.app",
  logo: "https://campuszen.app/campusZen.png",
};

export default async function RootLayout({ children }) {
  // Reading the theme cookie here is what makes the first paint correct:
  // the class is already on <html> before any CSS or JS runs.
  const theme = readThemeCookie(await cookies());

  return (
    <html
      lang="en"
      className={`${inter.variable} ${theme === "dark" ? "dark" : ""} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col">
        <script type="application/ld+json">
          {JSON.stringify(orgJsonLd)}
        </script>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
