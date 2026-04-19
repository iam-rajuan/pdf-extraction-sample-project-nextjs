import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Extraction Platform MVP",
  description: "Backend-first PDF extraction and structured data review workflow."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
