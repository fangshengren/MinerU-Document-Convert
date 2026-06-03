import type { Metadata } from "next"
import { Providers } from "./providers"
import { NavHeader } from "@/components/layout/nav-header"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "Document Rule Manager",
  description: "Document rule conversion, storage, and query system",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <NavHeader />
          <main className="flex-1 container mx-auto max-w-6xl px-4 py-8">
            {children}
          </main>
          <Toaster richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}
