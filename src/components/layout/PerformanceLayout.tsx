import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function PerformanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="performance-app-layout">
      <Navbar />
      <div className="performance-app-body">
        <Sidebar />
        <main className="performance-page-main">{children}</main>
      </div>
    </div>
  );
}
