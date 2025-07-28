import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "./ChatSidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <ChatSidebar />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
};