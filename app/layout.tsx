import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { rootLayoutMetadata } from "@/lib/seoConfig";

export const metadata: Metadata = rootLayoutMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
