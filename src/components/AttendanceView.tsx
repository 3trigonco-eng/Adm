import React, { useState } from 'react';
import { StudentGradeRecord, AttendanceStatus } from '../types';

interface AttendanceViewProps {
  students: StudentGradeRecord[];
  onUpdateAttendance: (studentId: string, status: AttendanceStatus) => void;
  onMarkAllPresent: () => void;
  onSubmitAttendance: () => void;
  onOpenNoteModal: (student: StudentGradeRecord) => void;
  searchQuery: string;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  onUpdateAttendance,
  onMarkAllPresent,
  onSubmitAttendance,
  onOpenNoteModal,
  searchQuery,
}) => {
  const [selectedDate, setSelectedDate] = useState('2023-10-24');

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.initials.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId.includes(searchQuery)
  );

  // Compute live attendance statistics
  const countHadir = students.filter((s) => s.attendanceStatus === 'hadir').length;
  const countIzin = students.filter((s) => s.attendanceStatus === 'izin').length;
  const countSakit = students.filter((s) => s.attendanceStatus === 'sakit').length;
  const countAlpa = students.filter((s) => s.attendanceStatus === 'alpa').length;

  const total = students.length || 1;
  const presentPct = Math.round((countHadir / total) * 100);

  // SVG Donut calculation
  const strokeDash = `${presentPct}, 100`;

  return (
    <div className="flex-1 p-4 md:p-8 min-h-screen">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-['Hanken_Grotesk'] text-3xl md:text-4xl font-black text-white tracking-tight">
            Presensi Siswa - {new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Kelas 6A • Pemantau Presensi Real-time
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <label className="flex-1 md:flex-none py-2.5 px-4 border border-slate-700 bg-slate-900 rounded-2xl text-sm font-bold text-slate-200 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md">
            <span className="material-symbols-outlined text-[18px]">
              calendar_month
            </span>
            <span>Tanggal</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="sr-only"
            />
          </label>

          <button
            onClick={onSubmitAttendance}
            className="flex-1 md:flex-none py-2.5 px-6 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">
              check_circle
            </span>
            Simpan Presensi
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Summary Card (Left) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[28px] p-6 shadow-2xl flex flex-col justify-between text-white">
          <div>
            <h2 className="font-['Hanken_Grotesk'] text-xl font-bold text-white mb-6">
              Ringkasan Harian
            </h2>

            {/* Donut Chart */}
            <div className="relative w-48 h-48 mx-auto mb-8">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Circle */}
                <path
                  className="text-slate-800"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                {/* Present Segment */}
                <path
                  className="text-emerald-400 transition-all duration-500"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={strokeDash}
                  strokeWidth="4"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-['Hanken_Grotesk'] text-4xl font-black text-white">
                  {presentPct}%
                </span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Hadir
                </span>
              </div>
            </div>

            {/* Legend Stats List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  <span className="text-xs font-bold text-slate-200">
                    Hadir
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-white">
                  {countHadir}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                  <span className="text-xs font-bold text-slate-200">
                    Izin
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-white">
                  {countIzin}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                  <span className="text-xs font-bold text-slate-200">
                    Sakit
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-white">
                  {countSakit}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                  <span className="text-xs font-bold text-slate-200">
                    Alpa
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-white">
                  {countAlpa}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 text-xs text-slate-500 text-center border-t border-slate-800 mt-4 font-medium">
            Total {students.length} terdaftar di Kelas 6A
          </div>
        </div>

        {/* Student Roster Table (Right) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-[28px] shadow-2xl overflow-hidden flex flex-col text-white">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <h2 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
              Daftar Presensi Siswa
            </h2>
            <button
              onClick={onMarkAllPresent}
              className="text-rose-400 text-xs font-bold hover:underline cursor-pointer flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20"
            >
              <span className="material-symbols-outlined text-[16px]">
                done_all
              </span>
              Tandai Semua Hadir
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                  <th className="p-4 text-xs font-bold uppercase w-12 text-center tracking-wider">
                    NO
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider">
                    NAMA SISWA
                  </th>
                  <th className="p-4 text-xs font-bold uppercase min-w-[320px] tracking-wider">
                    STATUS
                  </th>
                  <th className="p-4 text-xs font-bold uppercase text-right tracking-wider">
                    CATATAN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 text-sm">
                      Tidak ada siswa ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const numStr = String(idx + 1).padStart(2, '0');
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-800/50 transition-colors group"
                      >
                        {/* No */}
                        <td className="p-4 text-center font-mono text-sm text-slate-400 font-bold">
                          {numStr}
                        </td>

                        {/* Student */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center font-bold text-xs">
                              {student.initials}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white">
                                {student.name}
                              </div>
                              <div className="text-xs text-slate-400">
                                ID: {student.studentId}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Radio Pills */}
                        <td className="p-4">
                          <div className="inline-flex gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                            {/* Hadir */}
                            <button
                              type="button"
                              onClick={() => onUpdateAttendance(student.id, 'hadir')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                student.attendanceStatus === 'hadir'
                                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Hadir
                            </button>

                            {/* Izin */}
                            <button
                              type="button"
                              onClick={() => onUpdateAttendance(student.id, 'izin')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                student.attendanceStatus === 'izin'
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Izin
                            </button>

                            {/* Sakit */}
                            <button
                              type="button"
                              onClick={() => onUpdateAttendance(student.id, 'sakit')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                student.attendanceStatus === 'sakit'
                                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Sakit
                            </button>

                            {/* Alpa */}
                            <button
                              type="button"
                              onClick={() => onUpdateAttendance(student.id, 'alpa')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                student.attendanceStatus === 'alpa'
                                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Alpa
                            </button>
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => onOpenNoteModal(student)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              student.attendanceNote
                                ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                : 'text-slate-400 hover:bg-slate-800'
                            }`}
                            title={student.attendanceNote || 'Tambah Catatan'}
                          >
                            <span
                              className={`material-symbols-outlined text-[20px] ${
                                student.attendanceNote ? 'fill' : ''
                              }`}
                            >
                              {student.attendanceNote ? 'note_alt' : 'edit_note'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
