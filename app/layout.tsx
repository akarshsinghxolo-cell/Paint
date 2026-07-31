import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Store Accountability Manager",
  description: "Daily stock, store responsibility and purchase-document accountability"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
