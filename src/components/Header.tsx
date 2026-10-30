import React, { useState } from 'react';
import { NotificationItem, TeacherProfile } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onOpenCalendarSync: () => void;
  onOpenEditProfile?: () => void;
  teacherProfile?: TeacherProfile;
  onToggleMobileMenu: () => void;
  notifications: NotificationItem[];
  onMarkNotificationsRead: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenHelp,
  onOpenSettings,
  onOpenCalendarSync,
  onOpenEditProfile,
  teacherProfile,
  onToggleMobileMenu,
  notifications,
  onMarkNotificationsRead,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex justify-between items-center h-16 px-4 md:px-8 bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-20 md:ml-[280px] backdrop-blur-md">
      {/* Left side: Mobile Menu Toggle & Brand title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 text-slate-300 hover:bg-slate-800 rounded-xl cursor-pointer"
          aria-label="Toggle Navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="md:hidden font-['Hanken_Grotesk'] text-xl font-black text-white">
          ScholarTrack
        </span>
      </div>

      {/* Center/Right: Search bar & Toolbar Actions */}
      <div className="flex items-center gap-3 md:gap-4 ml-auto">
        {/* Search Bar */}
        <div className="relative hidden sm:block w-56 md:w-64">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa, tugas, atau nilai..."
            className="w-full bg-slate-800 border border-slate-700 rounded-full py-1.5 pl-10 pr-4 text-xs md:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Google Calendar Sync Button */}
        <button
          onClick={onOpenCalendarSync}
          className="p-2 text-indigo-400 hover:text-white hover:bg-slate-800 rounded-full transition-all relative cursor-pointer flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20"
          title="Sinkronkan Ujian & Tugas ke Google Calendar"
        >
          <span className="material-symbols-outlined">calendar_month</span>
        </button>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (unreadCount > 0) onMarkNotificationsRead();
            }}
            className="p-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full transition-all relative cursor-pointer"
            title="Notifikasi"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-900" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-slate-100">
              <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800">
                <span className="font-bold text-sm text-white">
                  Notifikasi Aktivitas
                </span>
                <span className="text-xs text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  Kelas 6A
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.map((item) => (
                  <div key={item.id} className="p-3 hover:bg-slate-800/80 text-xs transition-colors">
                    <p className="font-medium text-slate-200 mb-1">
                      {item.title}
                    </p>
                    <span className="text-slate-500">{item.time}</span>
                  </div>
                ))}
              </div>
              <div className="p-2 text-center border-t border-slate-800">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-rose-400 font-bold hover:underline cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help Button */}
        <button
          onClick={onOpenHelp}
          className="p-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full transition-all cursor-pointer"
          title="Bantuan & Panduan"
        >
          <span className="material-symbols-outlined">help</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full transition-all cursor-pointer"
          title="Pengaturan Kelas"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>

        {/* Profile Avatar Button */}
        <button
          type="button"
          onClick={onOpenEditProfile}
          className="p-0.5 rounded-full hover:ring-2 hover:ring-rose-500 transition-all cursor-pointer flex items-center gap-2 group"
          title={`Edit Profil Guru (${teacherProfile?.name || 'Ibu Rahmawati'})`}
        >
          <img
            src={teacherProfile?.avatarPhoto || teacherProfile?.profilePhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250'}
            alt="User avatar"
            className="w-8 h-8 rounded-full object-cover border-2 border-amber-400 group-hover:scale-105 transition-all"
          />
        </button>
      </div>
    </header>
  );
};
