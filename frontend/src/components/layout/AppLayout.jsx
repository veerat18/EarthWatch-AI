import React, { useState } from 'react';
import { Sidebar } from '../sidebar/Sidebar';
import { Topbar } from '../topbar/Topbar';

export function AppLayout({ children, activeModule = 'Overview', onSelectModule }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="ew-app-shell">
      {/* Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        activeModule={activeModule}
        onSelectModule={onSelectModule}
      />

      {/* Main Content Area */}
      <div className="ew-main-wrapper">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          activeModule={activeModule}
        />

        <main className="ew-main-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
