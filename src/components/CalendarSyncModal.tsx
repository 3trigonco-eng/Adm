import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SubjectItem } from '../types';

export interface ScheduleEventItem {
  id: string;
  title: string;
  type: 'ujian' | 'tugas' | 'remedial' | 'kegiatan';
  subjectName: string;
  startDate: string; // ISO string or YYYY-MM-DDTHH:mm
  endDate: string;
  location: string;
  description: string;
  isSynced?: boolean;
  googleCalendarLink?: string;
}

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects?: SubjectItem[];
  classNameTitle?: string;
  onShowToast: (msg: string) => void;
}

const DEFAULT_SCHEDULES: ScheduleEventItem[] = [
  {
    id: 'sch_1',
    title: 'Penilaian Tengah Semester (PTS) Matematika',
    type: 'ujian',
    subjectName: 'Matematika',
    startDate: '2026-08-10T08:00',
    endDate: '2026-08-10T09:30',
    location: 'Ruang Kelas 6A',
    description: 'Ujian Tengah Semester Gasal Mata Pelajaran Matematika. Materi Pecahan & Desimal.',
  },
  {
    id: 'sch_2',
    title: 'Tenggat Tugas Proyek Sains IPA: Ekosistem Mini',
    type: 'tugas',
    subjectName: 'IPA (Sains)',
    startDate: '2026-08-15T12:00',
    endDate: '2026-08-15T13:00',
    location: 'Pengumpulan Online & Kelas 6A',
    description: 'Pengumpulan laporan dan maket ekosistem mini buatan kelompok.',
  },
  {
    id: 'sch_3',
    title: 'Ulangan Harian Bab 2 Bahasa Indonesia: Paragraf Narasi',
    type: 'ujian',
    subjectName: 'B. Indonesia',
    startDate: '2026-08-18T09:00',
    endDate: '2026-08-18T10:00',
    location: 'Ruang Kelas 6A',
    description: 'Evaluasi Formatif Tujuan Pembelajaran TP 2.1 Menulis Paragraf Narasi.',
  },
  {
    id: 'sch_4',
    title: 'Ujian Akhir Semester (SAS) SumatifIPS',
    type: 'ujian',
    subjectName: 'IPS (Sejarah)',
    startDate: '2026-08-25T08:00',
    endDate: '2026-08-25T09:30',
    location: 'Ruang Kelas 6A',
    description: 'Sumatif Akhir Semester IPS Kerajaan Nusantara dan Peta Indonesia.',
  },
];

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  subjects = [],
  classNameTitle = 'Kelas 6A',
  onShowToast,
}) => {
  // Auth state
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Schedules state
  const [schedules, setSchedules] = useState<ScheduleEventItem[]>(() => {
    const saved = localStorage.getItem('gcal_synced_schedules_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_SCHEDULES;
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // New Schedule Form State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'ujian' | 'tugas' | 'remedial' | 'kegiatan'>('ujian');
  const [newSubject, setNewSubject] = useState('Matematika');
  const [newStartDate, setNewStartDate] = useState('2026-08-12T08:00');
  const [newEndDate, setNewEndDate] = useState('2026-08-12T09:30');
  const [newLocation, setNewLocation] = useState(`Ruang ${classNameTitle}`);
  const [newDescription, setNewDescription] = useState('');

  // Check OAuth status
  const checkAuthStatus = async () => {
    setIsAuthLoading(true);
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.authenticated);
      }
    } catch (e) {
      console.error('Error checking auth status:', e);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
    }
  }, [isOpen]);

  // Listen for OAuth postMessage from callback popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_CALENDAR_AUTH_SUCCESS') {
        setIsConnected(true);
        onShowToast('✓ Berhasil terhubung ke akun Google Calendar!');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onShowToast]);

  // Save schedules to local storage
  const saveSchedulesToStorage = (updated: ScheduleEventItem[]) => {
    setSchedules(updated);
    localStorage.setItem('gcal_synced_schedules_v1', JSON.stringify(updated));
  };

  // Connect OAuth Popup
  const handleConnectGoogleCalendar = async () => {
    setIsAuthLoading(true);
    try {
      const res = await fetch('/api/auth/google/url');
      if (res.ok) {
        const data = await res.json();
        const popup = window.open(data.url, 'google_oauth_popup', 'width=600,height=700');
        if (!popup) {
          window.location.href = data.url;
        }
      } else {
        // Fallback directly
        window.open('/api/auth/google', 'google_oauth_popup', 'width=600,height=700');
      }
    } catch (e) {
      window.open('/api/auth/google', 'google_oauth_popup', 'width=600,height=700');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === schedules.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(schedules.map((s) => s.id));
    }
  };

  // Sync single item
  const handleSyncSingle = async (item: ScheduleEventItem) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/calendar/sync-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[${item.subjectName.toUpperCase()}] ${item.title}`,
          description: `${item.description}\n\nKelas: ${classNameTitle}\nJenis: ${item.type.toUpperCase()}`,
          startDate: item.startDate,
          endDate: item.endDate,
          location: item.location,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setIsConnected(false);
        onShowToast('⚠️ Silakan hubungkan Google Calendar Anda terlebih dahulu!');
        handleConnectGoogleCalendar();
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Gagal sinkronisasi');
      }

      const updated = schedules.map((s) =>
        s.id === item.id ? { ...s, isSynced: true, googleCalendarLink: data.htmlLink } : s
      );
      saveSchedulesToStorage(updated);
      onShowToast(`✓ Jadwal "${item.title}" berhasil disinkronkan ke Google Calendar!`);
    } catch (err: any) {
      onShowToast(`❌ Gagal: ${err.message || 'Terjadi kesalahan saat menghubungi API Calendar.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync batch selected items
  const handleSyncSelectedBatch = async () => {
    const itemsToSync = schedules.filter((s) => selectedIds.includes(s.id));
    if (itemsToSync.length === 0) {
      onShowToast('⚠️ Pilih minimal 1 jadwal ujian atau tenggat tugas untuk disinkronkan.');
      return;
    }

    setIsSyncing(true);
    try {
      const formattedEvents = itemsToSync.map((item) => ({
        title: `[${item.subjectName.toUpperCase()}] ${item.title}`,
        description: `${item.description}\n\nKelas: ${classNameTitle}\nJenis: ${item.type.toUpperCase()}`,
        startDate: item.startDate,
        endDate: item.endDate,
        location: item.location,
      }));

      const res = await fetch('/api/calendar/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: formattedEvents }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setIsConnected(false);
        onShowToast('⚠️ Silakan hubungkan akun Google Calendar Anda!');
        handleConnectGoogleCalendar();
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mensinkronkan jadwal');
      }

      const updated = schedules.map((s) => {
        if (selectedIds.includes(s.id)) {
          const matchResult = data.results?.find((r: any) => r.title.includes(s.title));
          return {
            ...s,
            isSynced: true,
            googleCalendarLink: matchResult?.link || 'https://calendar.google.com',
          };
        }
        return s;
      });

      saveSchedulesToStorage(updated);
      onShowToast(`✓ ${data.syncedCount || itemsToSync.length} Jadwal Ujian & Tugas berhasil masuk Google Calendar!`);
    } catch (err: any) {
      onShowToast(`❌ ${err.message || 'Gagal sinkronisasi Google Calendar.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add new schedule
  const handleAddNewSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: ScheduleEventItem = {
      id: `sch_${Date.now()}`,
      title: newTitle,
      type: newType,
      subjectName: newSubject,
      startDate: newStartDate,
      endDate: newEndDate,
      location: newLocation,
      description: newDescription || `Jadwal ${newType} ${newSubject} ${classNameTitle}`,
      isSynced: false,
    };

    const updated = [newItem, ...schedules];
    saveSchedulesToStorage(updated);
    setIsAddingNew(false);
    setNewTitle('');
    setNewDescription('');
    onShowToast(`✓ Jadwal ${newType} "${newItem.title}" berhasil ditambahkan!`);
  };

  // Delete schedule
  const handleDeleteSchedule = (id: string) => {
    const updated = schedules.filter((s) => s.id !== id);
    saveSchedulesToStorage(updated);
    setSelectedIds(selectedIds.filter((item) => item !== id));
    onShowToast('✓ Jadwal berhasil dihapus.');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-white"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">calendar_month</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-['Hanken_Grotesk'] text-xl font-black text-white">
                    Sinkronisasi Google Calendar API
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
                    Workspace API
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sinkronkan jadwal ujian, ulangan harian, dan tenggat tugas ke Google Calendar pengguna/orang tua.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status Badge & Button */}
              {isConnected ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Google Calendar Terhubung
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogleCalendar}
                  disabled={isAuthLoading}
                  className="px-4 py-2 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">sync_lock</span>
                  {isAuthLoading ? 'Menghubungkan...' : 'Hubungkan Google Calendar'}
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
            {/* Banner OAuth status info */}
            {!isConnected && (
              <div className="p-4 bg-slate-950 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-rose-400 text-2xl">info</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">Sambungan Google OAuth Diperlukan</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Klik &quot;Hubungkan Google Calendar&quot; untuk memberi izin aplikasi mengirimkan agenda ujian & tugas langsung ke akun Google Anda.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleConnectGoogleCalendar}
                  className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-all"
                >
                  Otorisasi Sekarang
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-slate-300 font-bold hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    {selectedIds.length === schedules.length ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  Pilih Semua ({selectedIds.length}/{schedules.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(!isAddingNew)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  {isAddingNew ? 'Batal Tambah' : 'Tambah Jadwal Ujian/Tugas'}
                </button>

                <button
                  type="button"
                  onClick={handleSyncSelectedBatch}
                  disabled={isSyncing || selectedIds.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">sync</span>
                  {isSyncing ? 'Proses Sinkronisasi...' : `Sinkronkan Terpilih (${selectedIds.length})`}
                </button>
              </div>
            </div>

            {/* Add New Schedule Form */}
            {isAddingNew && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddNewSchedule}
                className="p-5 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">event</span>
                    Form Buat Jadwal Ujian / Tenggat Tugas
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Tutup
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Judul Agenda Ujian / Tugas *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="mis. Ulangan Harian Bab 3 Matematika"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Jenis Agenda
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value="ujian">Ujian / Ulangan Harian / SAS / PTS</option>
                      <option value="tugas">Tenggat Tugas / PR / Proyek</option>
                      <option value="remedial">Sesi Remedial & Pengayaan</option>
                      <option value="kegiatan">Kegiatan Akademik Kelas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Mata Pelajaran
                    </label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      {subjects.length > 0 ? (
                        subjects.map((sub) => (
                          <option key={sub.id} value={sub.name}>
                            {sub.name} ({sub.code})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Matematika">Matematika</option>
                          <option value="B. Indonesia">B. Indonesia</option>
                          <option value="IPA (Sains)">IPA (Sains)</option>
                          <option value="IPS (Sejarah)">IPS (Sejarah)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Lokasi</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="Ruang Kelas 6A"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Waktu Mulai *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Waktu Selesai *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Deskripsi & Catatan Petunjuk
                  </label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Materi yang diuji, perlengkapan yang wajib dibawa, atau instruksi pengerjaan..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-4 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-300 font-bold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20"
                  >
                    + Simpan Ke Daftar
                  </button>
                </div>
              </motion.form>
            )}

            {/* Schedules List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Daftar Agenda Ujian & Tenggat Tugas ({schedules.length})</span>
                <span className="text-[10px] text-slate-500 lowercase font-normal">
                  Klik checkbox untuk sinkronisasi sekaligus
                </span>
              </h4>

              {schedules.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const startDateObj = new Date(item.startDate);
                const formattedDate = isNaN(startDateObj.getTime())
                  ? item.startDate
                  : startDateObj.toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-slate-900/90 border-indigo-500/50 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500 cursor-pointer"
                      />

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.type === 'ujian'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : item.type === 'tugas'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="text-[11px] font-bold text-slate-300">{item.subjectName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">• {item.location}</span>
                        </div>

                        <h5 className="text-sm font-bold text-white">{item.title}</h5>

                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-1">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] font-mono text-indigo-300 pt-0.5">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {formattedDate} WIB
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end gap-2 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      {item.isSynced ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            Tersimpan di Google Calendar
                          </span>
                          {item.googleCalendarLink && (
                            <a
                              href={item.googleCalendarLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-400 hover:underline flex items-center gap-0.5 font-bold"
                            >
                              Buka <span className="material-symbols-outlined text-xs">open_in_new</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSyncSingle(item)}
                          disabled={isSyncing}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">add_to_drive</span>
                          Sinkronkan
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(item.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                        title="Hapus dari daftar"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-indigo-400 text-sm">lock</span>
              <span>Integrasi Google Workspace OAuth 2.0 resmi terenkripsi.</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
            >
              Tutup Modal
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
