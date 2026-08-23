import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "RazorPay Pulse — Payment Risk Intelligence",
  description: "AI-powered payment experience intelligence: detect, explain, predict, and recommend.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink text-text-primary">
        <Sidebar />
        <div className="md:pl-60">
          <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
