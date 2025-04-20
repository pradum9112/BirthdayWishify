import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Birthday Notifier Dashboard",
  description: "Automated birthday email notifications and dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
