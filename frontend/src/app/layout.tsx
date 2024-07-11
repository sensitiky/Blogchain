import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';

const inter = Inter({ subsets: ["latin"] });

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
if (!clientId) {
  throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not defined');
}

export const metadata: Metadata = {
  title: "Blogchain",
  description: "Developer: Mario Correa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="bg-gradient" lang="en">
      <body className={`flex bg-gradient flex-col min-h-screen ${inter.className}`}>
        <GoogleOAuthProvider clientId={clientId as string}>
          <main className="flex-grow">{children}</main>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
