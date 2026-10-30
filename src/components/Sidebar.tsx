import React from 'react';
import { PageView, TeacherProfile } from '../types';

interface SidebarProps {
  activeView: PageView;
  setActiveView: (view: PageView) => void;
  onOpenNewAssessment: () => void;
  onOpenCalendarSync: () => void;
  onOpenEditProfile?: () => void;
  teacherProfile?: TeacherProfile;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  onOpenNewAssessment,
  onOpenCalendarSync,
  onOpenEditProfile,
  teacherProfile,
  mobileOpen,
  setMobileOpen,
}) => {
  const navItems: { id: PageView; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Beranda', icon: 'dashboard' },
    { id: 'grades', label: 'Buku Nilai', icon: 'grade' },
    { id: 'curriculum', label: 'Kurikulum & TP', icon: 'account_tree' },
    { id: 'attendance', label: 'Presensi', icon: 'calendar_today' },
    { id: 'reports', label: 'Laporan', icon: 'assessment' },
    { id: 'students', label: 'Daftar Siswa', icon: 'group' },
  ];

  const handleNavClick = (view: PageView) => {
    setActiveView(view);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <nav
        className={`fixed left-0 top-0 h-screen w-[280px] bg-slate-900 border-r border-slate-800/80 flex flex-col py-8 px-6 z-40 transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-rose-500/20">
            S
          </div>
          <span className="font-['Hanken_Grotesk'] text-2xl font-black text-white tracking-tight">
            ScholarTrack
          </span>
        </div>

        {/* Teacher Profile */}
        <div
          onClick={onOpenEditProfile}
          className="group relative flex items-center gap-3 mb-6 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-rose-500/50 rounded-2xl cursor-pointer transition-all duration-200"
          title="Klik untuk Edit Profil Guru"
        >
          <img
            src={teacherProfile?.profilePhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250'}
            alt="Teacher profile"
            className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 group-hover:scale-105 transition-all"
          />
          <div className="overflow-hidden flex-1">
            <p className="font-bold text-sm text-white truncate group-hover:text-rose-300 transition-colors">
              {teacherProfile?.name || 'Guru Wali Kelas'}
            </p>
            <p className="text-xs text-slate-400 truncate font-medium">
              {teacherProfile?.role || 'Wali Kelas'}
            </p>
          </div>
          <button
            type="button"
            className="p-1 text-slate-400 hover:text-rose-400 opacity-80 group-hover:opacity-100 transition-all"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>

        {/* CTAs */}
        <div className="space-y-2 mb-8">
          <button
            onClick={onOpenNewAssessment}
            className="w-full bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold text-sm py-3 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Penilaian Baru
          </button>

          <button
            onClick={() => {
              onOpenCalendarSync();
              setMobileOpen(false);
            }}
            className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-xs py-2.5 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Google Calendar Sync
          </button>
        </div>

        {/* Navigation List */}
        <ul className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                    isActive
                      ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      isActive ? 'fill' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 text-center font-medium">
          ScholarTrack v2.4 • Kelas 6A
        </div>
      </nav>
    </>
  );
};
