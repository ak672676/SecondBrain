import Link from "next/link";
import { LogoutButton } from "./logout-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            Second Brain
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 border-r bg-muted/30 p-4 hidden md:block">
          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Documents
            </Link>
            <Link
              href="/dashboard/chat"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Chat
            </Link>
            <Link
              href="/dashboard/graph"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Graph
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
