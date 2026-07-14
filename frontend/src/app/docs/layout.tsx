import Navbar from "../../components/Navbar";
import { DocsSidebar, MobileDocsSidebar } from "../../components/docs/DocsSidebar";
import { BookOpen } from "lucide-react";
import { ResizableSidebar } from "../../components/docs/ResizableSidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <MobileDocsSidebar />

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <ResizableSidebar 
          defaultWidth={240} 
          minWidth={200} 
          maxWidth={400} 
          position="left"
          className="hidden md:flex sticky top-16 h-[calc(100vh-4rem)] border-r border-zinc-100 bg-white"
        >
          <div className="pt-4">
            <DocsSidebar />
          </div>
        </ResizableSidebar>

        {/* Page content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
