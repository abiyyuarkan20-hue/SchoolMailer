import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useSearchParams } from 'react-router-dom';
import { IconLayoutDashboard, IconTemplate, IconUsers, IconSettings, IconLogout, IconBrandTelegram, IconHistory, IconBell, IconSchool, IconLayout, IconEdit, IconLock, IconChevronDown, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { useSidebar } from './AppLayout';
import unsavedTemplateStore from '../../store/unsavedTemplateStore';

const itemColors = {
  dashboard: { bg: 'from-blue-100 to-blue-50', activeBg: 'from-blue-200 to-blue-100', icon: 'text-blue-600', shadow: 'shadow-blue-500/15' },
  templates: { bg: 'from-violet-100 to-violet-50', activeBg: 'from-violet-200 to-violet-100', icon: 'text-violet-600', shadow: 'shadow-violet-500/15' },
  students: { bg: 'from-emerald-100 to-emerald-50', activeBg: 'from-emerald-200 to-emerald-100', icon: 'text-emerald-600', shadow: 'shadow-emerald-500/15' },
  teachers: { bg: 'from-indigo-100 to-indigo-50', activeBg: 'from-indigo-200 to-indigo-100', icon: 'text-indigo-600', shadow: 'shadow-indigo-500/15' },
  generate: { bg: 'from-amber-100 to-amber-50', activeBg: 'from-amber-200 to-amber-100', icon: 'text-amber-600', shadow: 'shadow-amber-500/15' },
  history: { bg: 'from-rose-100 to-rose-50', activeBg: 'from-rose-200 to-rose-100', icon: 'text-rose-600', shadow: 'shadow-rose-500/15' },
  alerts: { bg: 'from-amber-100 to-amber-50', activeBg: 'from-amber-200 to-amber-100', icon: 'text-amber-600', shadow: 'shadow-amber-500/15' },
};

const navItems = [
  { name: 'Dashboard', path: '/', icon: IconLayoutDashboard, colorKey: 'dashboard' },
  { name: 'Templates', path: '/templates', icon: IconTemplate, colorKey: 'templates' },
  { name: 'Siswa', path: '/students', icon: IconUsers, colorKey: 'students' },
  { name: 'Guru', path: '/teachers', icon: IconSchool, colorKey: 'teachers' },
  { name: 'Kirim Surat', path: '/generate', icon: IconBrandTelegram, colorKey: 'generate' },
  { name: 'Riwayat', path: '/history', icon: IconHistory, colorKey: 'history' },
  { name: 'Peringatan', path: '/alerts', icon: IconBell, colorKey: 'alerts' },
];

const settingsSubItems = [
  { name: 'Kop Surat Global', tab: 'letterhead', icon: IconLayout, colorKey: 'dashboard' },
  { name: 'Tanda Tangan', tab: 'signature', icon: IconEdit, colorKey: 'students' },
  { name: 'Keamanan & Password', tab: 'password', icon: IconLock, colorKey: 'history' },
];

const NavTooltip = ({ name, show }) => (
  <div className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 bg-white text-xs font-medium text-slate-700 rounded-lg shadow-lg border border-slate-200 whitespace-nowrap transition-all duration-200 pointer-events-none ${
    show ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
  }`}>
    {name}
  </div>
);

const Sidebar = () => {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const [settingsOpen, setSettingsOpen] = useState(location.pathname === '/settings');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [draftCount, setDraftCount] = useState(0);
  const activeTab = searchParams.get('tab') || 'letterhead';

  useEffect(() => {
    const updateCount = () => setDraftCount(unsavedTemplateStore.getCount());
    updateCount();
    const interval = setInterval(updateCount, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      clearAuth();
    }
  };

  const renderActiveAccent = (isActive) =>
    isActive && (
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full ${
        sidebarOpen ? 'bg-blue-500 shadow-sm shadow-blue-500/40' : 'bg-white/80 shadow-lg'
      } animate-bounceActive`} />
    );

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarOpen
            ? 'w-64 bg-white border-r border-slate-200 shadow-sm'
            : 'w-[72px] bg-transparent'
        }`}
      >
        {/* ── Logo ── */}
        <div className="relative h-20 flex items-center">
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-16 h-16 rounded-r-full flex items-center justify-center transition-all duration-300 ${
            sidebarOpen
              ? 'bg-white shadow-md shadow-blue-500/10'
              : 'bg-white shadow-lg shadow-blue-500/15'
          }`}>
            <img src="/letter.png" alt="Logo" className="w-11 h-11 object-contain" />
          </div>
          <div className={`ml-[72px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">SchoolMailer</p>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase whitespace-nowrap">SMAN 19 Medan</p>
          </div>
        </div>

        {/* ── Nav Items ── */}
        <nav className="flex-1 overflow-y-auto py-6 overflow-x-hidden">
          <div className="flex flex-col items-start gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className="relative w-full group outline-none"
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {({ isActive }) => (
                  <div className="relative flex items-center h-14">
                    {renderActiveAccent(isActive)}

                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-r-full flex items-center justify-center transition-all duration-250 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                      sidebarOpen
                        ? isActive
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 shadow-md shadow-blue-500/10 scale-105'
                          : 'bg-slate-50 hover:bg-slate-100 hover:shadow-sm hover:scale-105'
                        : isActive
                          ? `bg-gradient-to-r ${itemColors[item.colorKey].activeBg} shadow-lg ${itemColors[item.colorKey].shadow} scale-105`
                          : `bg-gradient-to-r ${itemColors[item.colorKey].bg} hover:shadow-lg ${itemColors[item.colorKey].shadow} hover:scale-110`
                    }`}>
                      <item.icon className={`w-5 h-5 transition-all duration-200 ${
                        sidebarOpen
                          ? isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'
                          : isActive
                            ? `${itemColors[item.colorKey].icon}`
                            : `${itemColors[item.colorKey].icon}`
                      }`} />
                    </div>

                    {/* Badge when collapsed */}
                    {!sidebarOpen && item.name === 'Peringatan' && draftCount > 0 && (
                      <span className="absolute top-0.5 left-[38px] w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold text-white bg-amber-500 rounded-full z-20 border-[2.5px] border-white leading-none shadow-md pointer-events-none">
                        {draftCount > 9 ? '9+' : draftCount}
                      </span>
                    )}

                    <div className={`ml-[72px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <span className={`text-sm font-medium whitespace-nowrap ${
                        isActive ? 'text-blue-600' : 'text-slate-600'
                      }`}>{item.name}</span>
                      {item.name === 'Peringatan' && draftCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full leading-none">
                          {draftCount > 9 ? '9+' : draftCount}
                        </span>
                      )}
                    </div>

                    {/* Tooltip when collapsed */}
                    {!sidebarOpen && (
                      <NavTooltip name={item.name} show={hoveredItem === item.name} />
                    )}
                  </div>
                )}
              </NavLink>
            ))}

            {/* ── Separator ── */}
            <div className={`w-full my-2 transition-all duration-300 ${sidebarOpen ? 'px-5 opacity-100' : 'px-4 opacity-40'}`}>
              <div className="h-px bg-slate-200" />
            </div>

            {/* ── Settings ── */}
            <div className="relative w-full">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="relative w-full outline-none"
                onMouseEnter={() => setHoveredItem('Settings')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="relative flex items-center h-14">
                  {!sidebarOpen && hoveredItem === 'Settings' && (
                    <NavTooltip name="Pengaturan" show={true} />
                  )}

                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-r-full flex items-center justify-center transition-all duration-250 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    sidebarOpen
                      ? settingsOpen
                        ? 'bg-gradient-to-r from-slate-100 to-slate-200 shadow-sm scale-105'
                        : 'bg-slate-50 hover:bg-slate-100 hover:shadow-sm hover:scale-105'
                      : settingsOpen
                        ? 'bg-gradient-to-r from-slate-200 to-slate-100 shadow-lg shadow-slate-500/15 scale-105'
                        : 'bg-gradient-to-r from-slate-100 to-slate-50 hover:shadow-lg hover:scale-110 shadow-slate-500/10'
                  }`}>
                    <IconSettings className={`w-5 h-5 transition-colors duration-200 ${
                      settingsOpen ? 'text-slate-600' : 'text-slate-400'
                    }`} />
                  </div>

                  <div className={`flex items-center justify-between ml-[72px] w-full pr-4 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Pengaturan</span>
                    <IconChevronDown className={`w-4 h-4 text-slate-400 transition-all duration-300 ${settingsOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </div>
                </div>
              </button>

              {/* Settings Sub-items */}
              <div className={`grid transition-all duration-300 ease-in-out ${
                settingsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}>
                <div className="overflow-hidden">
                  <div className="pl-2 pr-3 py-1 space-y-0.5">
                    {settingsSubItems.map((sub) => {
                      const isSubActive = activeTab === sub.tab;
                      return (
                        <Link
                          key={sub.tab}
                          to={`/settings?tab=${sub.tab}`}
                          className="relative flex items-center h-10 group/sub outline-none"
                          onMouseEnter={() => setHoveredItem(sub.name)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          {!sidebarOpen && (
                            <NavTooltip name={sub.name} show={hoveredItem === sub.name} />
                          )}

                          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-r-full flex items-center justify-center transition-all duration-200 ${
                            sidebarOpen
                              ? isSubActive
                                ? 'bg-gradient-to-r from-blue-50 to-blue-100 shadow-sm'
                                : 'hover:bg-slate-50'
                              : isSubActive
                                ? `bg-gradient-to-r ${itemColors[sub.colorKey].activeBg} shadow-md ${itemColors[sub.colorKey].shadow}`
                                : `bg-gradient-to-r ${itemColors[sub.colorKey].bg} hover:shadow-md ${itemColors[sub.colorKey].shadow}`
                          }`}>
                            <sub.icon className={`w-4 h-4 ${
                              isSubActive ? 'text-blue-600' : 'text-slate-400 group-hover/sub:text-blue-500'
                            }`} />
                          </div>

                          <div className={`ml-12 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <span className={`text-xs whitespace-nowrap ${
                              isSubActive ? 'text-blue-600 font-medium' : 'text-slate-500'
                            }`}>{sub.name}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* ── User & Logout ── */}
        <div className="border-t border-slate-100">
          <div className="relative flex items-center h-16 group/user"
            onMouseEnter={() => setHoveredItem('User')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {!sidebarOpen && hoveredItem === 'User' && (
              <NavTooltip name={user?.name || 'User'} show={true} />
            )}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-r-full flex items-center justify-center transition-all duration-300 ${
              sidebarOpen
                ? 'bg-gradient-to-r from-slate-100 to-slate-200 shadow-sm'
                : 'bg-gradient-to-r from-slate-100 to-slate-50 shadow-lg shadow-slate-500/10 hover:shadow-xl hover:scale-105'
            }`}>
              <span className="text-sm font-bold text-slate-500 uppercase">{user?.name?.charAt(0) || 'U'}</span>
            </div>
            <div className={`ml-[72px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <p className="text-sm font-medium text-slate-700 whitespace-nowrap truncate max-w-[140px]">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400 capitalize whitespace-nowrap">{user?.role?.toLowerCase() || 'Admin'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="relative flex items-center h-12 w-full group outline-none mb-2"
            onMouseEnter={() => setHoveredItem('Logout')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {!sidebarOpen && hoveredItem === 'Logout' && (
              <NavTooltip name="Logout" show={true} />
            )}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-12 rounded-r-full flex items-center justify-center transition-all duration-200 ${
              sidebarOpen ? 'w-14 hover:bg-red-50 hover:shadow-sm' : 'w-14 bg-transparent'
            }`}>
              <IconLogout className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors duration-200" />
            </div>
            <div className={`ml-[72px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <span className="text-sm text-slate-500 group-hover:text-red-500 whitespace-nowrap">Logout</span>
            </div>
          </button>
        </div>

        {/* ── Toggle Button ── */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`flex items-center justify-center h-10 transition-all duration-200 ${
            sidebarOpen
              ? 'border-t border-slate-100 text-slate-400 hover:text-blue-500 hover:bg-blue-50/50'
              : 'text-slate-400 hover:text-blue-500 hover:scale-110'
          }`}
        >
          {sidebarOpen ? <IconChevronLeft className="w-4 h-4" /> : <IconChevronRight className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </>
  );
};

export default Sidebar;