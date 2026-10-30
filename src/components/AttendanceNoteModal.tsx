import React, { useState } from 'react';
import { StudentGradeRecord } from '../types';

interface AttendanceNoteModalProps {
  student: StudentGradeRecord | null;
  onClose: () => void;
  onSaveNote: (studentId: string, note: string) => void;
}

export const AttendanceNoteModal: React.FC<AttendanceNoteModalProps> = ({
  student,
  onClose,
  onSaveNote,
}) => {
  const [noteText, setNoteText] = useState(student?.attendanceNote || '');

  if (!student) return null;

  const handleSave = () => {
    onSaveNote(student.id, noteText);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-200 text-white">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
              edit_note
            </span>
            <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
              Catatan Presensi: {student.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-xl p-1 hover:bg-slate-800 cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Catatan Khusus / Alasan
            </label>
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="mis. Surat dokter diterima, Izin acara keluarga, dll."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 text-xs text-slate-300">
            <p className="font-bold text-white uppercase tracking-wider text-[10px] mb-1">Status Saat Ini:</p>
            <span className="capitalize px-3 py-1 rounded-full bg-slate-800 font-bold border border-slate-700 text-rose-400">
              {student.attendanceStatus}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 font-bold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            Simpan Catatan
          </button>
        </div>
      </div>
    </div>
  );
};
