import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "South African Tender Extraction MVP",
  description: "Structured extraction for South African government tender PDFs."
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
