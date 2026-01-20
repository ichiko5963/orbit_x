"use client";

import { ReactNode, useState, useEffect } from "react";
import { clsx } from "clsx";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        style={{
          marginLeft: collapsed ? "72px" : "260px",
          transition: "margin-left 0.3s ease-out",
        }}
        className="min-h-screen"
      >
        <div className="p-8 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
