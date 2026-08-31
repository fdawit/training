import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Training Path 15",
  description: "A private, local-first 15-week athletic rebuild companion.",
  applicationName: "Training Path 15",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TP15",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/app-icon.svg",
    shortcut: "/app-icon.svg",
    apple: "/app-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
