import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "./ChatSidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <ChatSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
};