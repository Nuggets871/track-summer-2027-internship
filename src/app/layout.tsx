import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { QuickAddDialog } from "@/components/layout/quick-add-dialog";
import { getSearchIndex } from "@/lib/data/search-index";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Summer 2027 Internship Tracker",
  description: "Suivi personnel de recherche de stage à l'étranger — été 2027",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const searchIndex = await getSearchIndex();

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      {/* suppressHydrationWarning: some browser extensions (e.g. ColorZilla's
          cz-shortcut-listen) inject attributes onto <body> before React
          hydrates — a real mismatch React would otherwise warn about, but
          one entirely outside the app's control. */}
      <body className="flex h-dvh min-h-full overflow-hidden bg-background text-foreground" suppressHydrationWarning>
        <Providers>
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">{children}</div>
            </main>
          </div>
          <CommandPalette items={searchIndex} />
          <QuickAddDialog />
        </Providers>
      </body>
    </html>
  );
}
