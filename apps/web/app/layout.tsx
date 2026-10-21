import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoxPilot AI — Voice agent studio",
  description: "Design, test and measure conversational AI voice agents."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
