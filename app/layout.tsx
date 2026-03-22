import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SomniaTrace — Real-time Somnia Blockchain Explorer",
  description:
    "Real-time on-chain transaction visualizer and whale tracker for the Somnia blockchain, powered by Somnia Reactivity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-[#F0F0F0] antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
