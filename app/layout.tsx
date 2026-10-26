import type { Metadata, Viewport } from "next";
import { Hind_Madurai, Playfair_Display } from "next/font/google";
import "./globals.css";

const hind = Hind_Madurai({
  variable: "--font-hind",
  subsets: ["latin", "tamil"],
  weight: ["400", "500", "600", "700"],
});

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "Periya Veedu · Orders",
  description: "Dine-in order board for Periya Veedu",
  icons: { icon: "/logo.jpg", apple: "/logo.jpg" },
  appleWebApp: { capable: true, title: "Periya Veedu", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#7a1616",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hind.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <div aria-hidden className="bg-logo" />
        {children}
      </body>
    </html>
  );
}
