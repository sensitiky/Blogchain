import type { Metadata } from "next";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";
import { AuthProvider } from '../../context/authContext';
import dynamic from "next/dynamic";
import FacebookInit from "@/assets/FacebookInit";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
if (!clientId) {
  throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not defined");
}
const CustomEditor = dynamic(() => import('@/components/ui/editor'), { ssr: false });

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
    <html lang="en">
      <body className="font-gilroy">
        <FacebookInit/>
        <GoogleOAuthProvider clientId={clientId as string}>
          <AuthProvider>
            <main className="flex-grow-0">{children}</main>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
