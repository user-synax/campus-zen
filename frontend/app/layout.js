import { Inter } from "next/font/google";
import "./globals.css";
import { PushRegistrar } from "@/components/app/PushRegistrar";
import { ConsentAwareAnalytics } from "@/components/ConsentAwareAnalytics";
import { QueryProvider } from "@/components/providers/query-provider";
import { CzToaster } from "@/components/ui/sonner";
import { THEME_COOKIE } from "@/lib/theme";

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
  metadataBase: new URL("https://campuszen.tech"),
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
    url: "https://campuszen.tech",
    siteName: "CampusZen",
    title: "CampusZen — Student Social Network",
    description:
      "CampusZen is a student-first social network to discover students, share thoughts, and stay connected to campus life across India.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "CampusZen — Student Social Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CampusZen — Student Social Network",
    description:
      "CampusZen is a student-first social network to discover students, share thoughts, and stay connected to campus life across India.",
    images: ["/og.png"],
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
  url: "https://campuszen.tech",
  logo: "https://campuszen.tech/campusZen.png",
};

// Theme bootstrap. This layout used to `await cookies()` to read the theme
// cookie — which made every route dynamic. Next.js skips prefetching for
// dynamic routes without loading boundaries, so every sidebar navigation was
// a full server roundtrip (page + sidebar highlight both appeared seconds
// later). Moving the read here restores static rendering: sidebar links get
// prefetched in the viewport and swaps happen with zero roundtrip.
//
// The script runs synchronously during HTML parse, i.e. before first paint,
// so the very first paint is still already in the right theme — same
// guarantee as the server-side class, with no flash and no hydration cost.
// suppressHydrationWarning on <html> covers the attribute React would
// otherwise flag the script as having changed.
const themeBootstrapScript = `(function(){try{if(/(?:^|;\\s*)${THEME_COOKIE}=dark(?:;|$)/.test(document.cookie))document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted constant, theme bootstrap */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>
        <PushRegistrar />
        <QueryProvider>{children}</QueryProvider>
        <CzToaster />
        <ConsentAwareAnalytics />
      </body>
    </html>
  );
}
