import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    icon: [{ url: "/campusZen.png", type: "image/png" }],
    shortcut: "/campusZen.png",
    apple: [{ url: "/campusZen.png", type: "image/png" }],
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
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CampusZen",
  url: "https://campuszen.app",
  logo: "https://campuszen.app/campusZen.png",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-[var(--cz-bg)] text-[var(--cz-text-primary)] selection:bg-[var(--cz-muted)] selection:text-[var(--cz-text-inverse)]">
        <script type="application/ld+json">
          {JSON.stringify(orgJsonLd)}
        </script>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
