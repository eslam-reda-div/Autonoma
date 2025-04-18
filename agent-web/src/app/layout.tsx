import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { Toaster } from "react-hot-toast";

import "~/styles/globals.css";

import { ApiUrlProvider } from "~/core/api/api-url-manager";
import { ApiConfigModal } from "./_components/ApiConfigModal";

export const metadata: Metadata = {
  title: "🦜🤖 Autonoma",
  description:
    "A community-driven AI automation framework that builds upon the incredible work of the open source community.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="bg-body flex min-h-screen min-w-screen">
        <ApiUrlProvider>
          {/* Add Toaster with top-center position */}
          <Toaster position="top-center" />
          
          {children}
          <ApiConfigModal />
        </ApiUrlProvider>
      </body>
    </html>
  );
}
