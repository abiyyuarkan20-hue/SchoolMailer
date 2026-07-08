import React, { useState, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const SidebarContext = createContext();

export const useSidebar = () => useContext(SidebarContext);

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="min-h-screen bg-surface">
        <Sidebar />
        <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'pl-64' : 'pl-[72px]'}`}>
          <main className="flex-1 p-8">
            <div className="max-w-6xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
};

export default AppLayout;
