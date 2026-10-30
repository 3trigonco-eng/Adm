import React, { useState } from 'react';
import { SubjectItem } from '../types';

interface NewAssessmentModalProps {
  isOpen: boolean;
  subjects?: SubjectItem[];
  onClose: () => void;
  onAddAssessment: (title: string, subjectKey: string) => void;
}

export const NewAssessmentModal: React.FC<NewAssessmentModalProps> = ({
  isOpen,
  subjects = [],
  onClose,
  onAddAssessment,
}) => {
  const [title, setTitle] = useState('');
  const [subjectKey, setSubjectKey] = useState('matematika');
  const [selectedLmId, setSelectedLmId] = useState('');
  const [selectedTpId, setSelectedTpId] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [cycle, setCycle] = useState('Siklus Mid-Term 1');
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 16);
  });

  if (!isOpen) return null;

  const currentSubject = subjects.find((s) => s.id === subjectKey) || subjects[0];
  const currentLmList = currentSubject ? currentSubject.lingkupMateriList : [];
  const currentLm = currentLmList.find((lm) => lm.id === selectedLmId);
  const currentTpList = currentLm ? currentLm.tpList : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddAssessment(title, subjectKey);

    if (syncToCalendar) {
      try {
        const startDate = eventDate ? new Date(eventDate).toISOString() : new Date().toISOString();
        const endDate = new Date(new Date(startDate).getTime() + 90 * 60 * 1000).toISOString();
        await fetch('/api/calendar/sync-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `[${currentSubject ? currentSubject.name.toUpperCase() : 'PENILAIAN'}] ${title}`,
            description: `Penilaian Baru: ${title}\nSiklus: ${cycle}\nMata Pelajaran: ${currentSubject?.name}`,
            startDate,
            endDate,
            location: 'SD Negeri Harapan Bangsa',
          }),
        });
      } catch (err) {
        console.error('Calendar sync silent error:', err);
      }
    }

    setTitle('');
    setSelectedLmId('');
    setSelectedTpId('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-200 text-white">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
              add_task
            </span>
            <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
              Buat Penilaian Baru
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-xl p-1 hover:bg-slate-800 cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Nama Penilaian / Tugas
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="mis. Kuis Pecahan & Desimal"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Mata Pelajaran
              </label>
              <select
                value={subjectKey}
                onChange={(e) => {
                  setSubjectKey(e.target.value);
                  setSelectedLmId('');
                  setSelectedTpId('');
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                {subjects.length > 0 ? (
                  subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="matematika">Matematika</option>
                    <option value="indonesia">B. Indonesia</option>
                    <option value="ipa">IPA (Sains)</option>
                    <option value="ips">IPS (Sejarah)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Skor Maksimal
              </label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Lingkup Materi Selection */}
          {currentLmList.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Lingkup Materi (Bab)
              </label>
              <select
                value={selectedLmId}
                onChange={(e) => {
                  setSelectedLmId(e.target.value);
                  setSelectedTpId('');
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="">-- Pilih Lingkup Materi (Opsional) --</option>
                {currentLmList.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.code}: {lm.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tujuan Pembelajaran Selection */}
          {currentTpList.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Tujuan Pembelajaran (TP)
              </label>
              <select
                value={selectedTpId}
                onChange={(e) => setSelectedTpId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="">-- Pilih Tujuan Pembelajaran (Opsional) --</option>
                {currentTpList.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.code}: {tp.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Siklus Penilaian
            </label>
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
            >
              <option value="Siklus Mid-Term 1">Siklus Mid-Term 1</option>
              <option value="Siklus Mid-Term 2">Siklus Mid-Term 2</option>
              <option value="Ujian Akhir Semester">Ujian Akhir Semester</option>
            </select>
          </div>

          {/* Google Calendar Auto Sync Option */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={syncToCalendar}
                onChange={(e) => setSyncToCalendar(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                Otomatik Sinkron ke Google Calendar
              </span>
            </label>

            {syncToCalendar && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Tanggal & Waktu Ujian / Tenggat Tugas:
                </label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Tambah Penilaian
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
