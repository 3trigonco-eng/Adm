import React, { useState } from 'react';
import { StudentGradeRecord, TaskToGrade } from '../types';

interface DashboardViewProps {
  students: StudentGradeRecord[];
  tasks: TaskToGrade[];
  onOpenGradeTask: (task: TaskToGrade) => void;
  onNavigateToGrades: () => void;
  onOpenCalendarSync?: () => void;
  passingThreshold?: number;
  classNameTitle?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  tasks,
  onOpenGradeTask,
  onNavigateToGrades,
  onOpenCalendarSync,
  passingThreshold = 80,
  classNameTitle = 'Kelas 6A',
}) => {
  const [selectedMonth, setSelectedMonth] = useState('Bulan Ini');
  const [showKkmModal, setShowKkmModal] = useState(false);

  // Calculate live average across all students & main 4 subjects
  const studentStats = students.map((s) => {
    const avg =
      (s.grades.matematika +
        s.grades.indonesia +
        s.grades.ipa +
        s.grades.ips) /
      4;
    return {
      student: s,
      avg: Number(avg.toFixed(1)),
      belowSubjects: (
        [
          ['Matematika', s.grades.matematika],
          ['B. Indonesia', s.grades.indonesia],
          ['IPA', s.grades.ipa],
          ['IPS', s.grades.ips],
        ] as [string, number][]
      )
        .filter(([, score]) => score < passingThreshold)
        .map(([subj, score]) => ({ subj, score })),
    };
  });

  const classAvg = (
    studentStats.reduce((acc, curr) => acc + curr.avg, 0) / (students.length || 1)
  ).toFixed(1);

  // Students whose overall average is below KKM / KKTP threshold
  const studentsBelowKkmAvg = studentStats.filter((item) => item.avg < passingThreshold);

  // Students with at least 1 subject below KKM / KKTP threshold
  const studentsWithSubjectBelowKkm = studentStats.filter(
    (item) => item.belowSubjects.length > 0
  );

  // Calculate live attendance rate
  const presentCount = students.filter(
    (s) => s.attendanceStatus === 'hadir'
  ).length;
  const attendanceRate = Math.round(
    (presentCount / (students.length || 1)) * 100
  );

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-['Hanken_Grotesk'] text-3xl md:text-4xl font-black text-white tracking-tight mb-1">
              Ringkasan {classNameTitle}
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-medium">
              Gambaran umum performa akademik real-time dan capaian KKM / KKTP kelas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl text-xs font-bold text-slate-300">
              <span className="material-symbols-outlined text-rose-400 text-[18px]">verified</span>
              <span>Target KKM / KKTP: <strong className="text-white font-mono text-sm">{passingThreshold}</strong></span>
            </div>

            {onOpenCalendarSync && (
              <button
                type="button"
                onClick={onOpenCalendarSync}
                className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <span className="material-symbols-outlined text-indigo-400 text-[18px]">calendar_month</span>
                <span>Google Calendar Sync</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Stat Card 1: Rata-rata Nilai Kelas Real-Time */}
          <div className="bg-indigo-600 rounded-[28px] p-6 flex flex-col justify-between h-44 text-white shadow-xl shadow-indigo-500/10 hover:scale-[1.01] transition-all relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 text-white pointer-events-none">
              <span className="material-symbols-outlined text-8xl">analytics</span>
            </div>
            <div className="flex justify-between items-start z-10">
              <div>
                <h2 className="text-[11px] font-bold text-indigo-200 uppercase tracking-widest">
                  Rata-Rata Nilai Kelas
                </h2>
                <p className="text-[11px] text-indigo-200/80 font-medium">Real-Time Sync</p>
              </div>
              <span className="material-symbols-outlined text-white bg-indigo-500/50 p-2 rounded-xl text-[22px]">
                analytics
              </span>
            </div>
            <div className="flex items-end justify-between z-10">
              <div>
                <span className="font-['Hanken_Grotesk'] text-4xl md:text-5xl font-black leading-none text-white">
                  {classAvg}
                </span>
                <span className="text-[11px] text-indigo-200 block mt-1 font-medium">
                  KKM Target: {passingThreshold}
                </span>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                Number(classAvg) >= passingThreshold
                  ? 'bg-emerald-400 text-slate-950 font-black'
                  : 'bg-amber-400 text-slate-950 font-black'
              }`}>
                <span className="material-symbols-outlined text-[14px]">
                  {Number(classAvg) >= passingThreshold ? 'trending_up' : 'trending_down'}
                </span>
                {Number(classAvg) >= passingThreshold ? 'Memenuhi KKM' : 'Di Bawah KKM'}
              </span>
            </div>
          </div>

          {/* Stat Card 2: Siswa Belum KKM (Highlighted Alert Card) */}
          <div className="bg-slate-900 border border-rose-500/40 rounded-[28px] p-6 flex flex-col justify-between h-44 text-white shadow-xl hover:border-rose-500/80 hover:scale-[1.01] transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-[11px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Siswa Belum KKM
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">Nilai Rata-Rata &lt; {passingThreshold}</p>
              </div>
              <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-[22px]">
                warning
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-['Hanken_Grotesk'] text-4xl md:text-5xl font-black leading-none text-rose-400">
                    {studentsBelowKkmAvg.length}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">Siswa</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {studentsWithSubjectBelowKkm.length} siswa ada nilai mapel &lt; {passingThreshold}
                </p>
              </div>

              <button
                onClick={() => setShowKkmModal(true)}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>Detail</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Stat Card 3: Total Siswa (Emerald Card) */}
          <div className="bg-emerald-500 rounded-[28px] p-6 flex flex-col justify-between h-44 text-slate-950 shadow-xl shadow-emerald-500/10 hover:scale-[1.01] transition-all relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-[11px] font-bold text-emerald-950/70 uppercase tracking-widest">
                  Total Siswa Aktif
                </h2>
                <p className="text-[11px] text-emerald-900/80 font-medium">Terdaftar di {classNameTitle}</p>
              </div>
              <span className="material-symbols-outlined text-slate-950 bg-emerald-600/30 p-2 rounded-xl text-[22px]">
                groups
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="font-['Hanken_Grotesk'] text-4xl md:text-5xl font-black leading-none text-slate-950">
                  {students.length}
                </span>
                <span className="text-[11px] text-emerald-950 block mt-1 font-bold">
                  Siswa
                </span>
              </div>
              <button
                onClick={onNavigateToGrades}
                className="text-xs font-bold bg-slate-950 text-white px-3 py-1.5 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Buku Nilai
              </button>
            </div>
          </div>

          {/* Stat Card 4: Kehadiran Hari Ini (Dark Slate Card) */}
          <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 flex flex-col justify-between h-44 text-white shadow-xl hover:scale-[1.01] transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Kehadiran Hari Ini
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Presensi Real-Time</p>
              </div>
              <span className="material-symbols-outlined text-amber-400 bg-amber-400/10 p-2 rounded-xl text-[22px]">
                event_available
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="font-['Hanken_Grotesk'] text-4xl md:text-5xl font-black leading-none text-white">
                  {attendanceRate}%
                </span>
                <span className="text-[11px] text-slate-400 block mt-1 font-medium">
                  {presentCount} dari {students.length} Siswa Hadir
                </span>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
                Hari Ini
              </span>
            </div>
          </div>
        </div>

        {/* Main Charts & Side Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Chart Section (White Card for High Contrast) */}
          <div className="col-span-1 md:col-span-8 bg-white text-slate-900 rounded-[32px] p-6 md:p-8 flex flex-col min-h-[420px] shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Perkembangan Akademik
                </span>
                <h2 className="font-['Hanken_Grotesk'] text-2xl md:text-3xl font-black text-slate-950">
                  Perkembangan Nilai Mingguan
                </h2>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="Bulan Ini">Bulan Ini</option>
                <option value="Bulan Lalu">Bulan Lalu</option>
                <option value="Semester 1">Semester 1</option>
              </select>
            </div>

            {/* Bar Chart Container */}
            <div className="flex-1 relative chart-bg flex items-end justify-between px-4 pt-4 bg-slate-50 rounded-[24px] border border-slate-200">
              {/* Y-Axis Labels */}
              <div className="absolute left-3 top-2 h-full flex flex-col justify-between text-slate-400 font-mono text-xs pb-10">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>

              {/* Bars */}
              <div className="flex-1 flex items-end justify-around h-full ml-8 pb-8 relative">
                {/* Target KKM Line */}
                <div
                  className="absolute w-full border-t-2 border-dashed border-rose-500 z-0 transition-all"
                  style={{ top: `${100 - passingThreshold}%` }}
                />
                <span
                  className="absolute right-0 text-rose-600 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 z-10"
                  style={{ top: `${Math.max(2, 100 - passingThreshold - 5)}%` }}
                >
                  KKM ({passingThreshold})
                </span>

                {/* Week 1 */}
                <div className="w-12 flex flex-col items-center gap-2 group z-10">
                  <div className="w-full bg-indigo-200 rounded-t-xl h-[65%] group-hover:bg-indigo-600 transition-all relative">
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-xl shadow-lg pointer-events-none transition-opacity">
                      65
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 absolute bottom-0">
                    M1
                  </span>
                </div>

                {/* Week 2 */}
                <div className="w-12 flex flex-col items-center gap-2 group z-10">
                  <div className="w-full bg-indigo-200 rounded-t-xl h-[72%] group-hover:bg-indigo-600 transition-all relative">
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-xl shadow-lg pointer-events-none transition-opacity">
                      72
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 absolute bottom-0">
                    M2
                  </span>
                </div>

                {/* Week 3 */}
                <div className="w-12 flex flex-col items-center gap-2 group z-10">
                  <div className="w-full bg-indigo-200 rounded-t-xl h-[78%] group-hover:bg-indigo-600 transition-all relative">
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-xl shadow-lg pointer-events-none transition-opacity">
                      78
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 absolute bottom-0">
                    M3
                  </span>
                </div>

                {/* Week 4 (Live Current Class Average) */}
                <div className="w-12 flex flex-col items-center gap-2 group z-10">
                  <div
                    className="w-full bg-rose-500 rounded-t-xl relative shadow-lg shadow-rose-500/30 transition-all"
                    style={{ height: `${Math.min(100, Math.max(10, Number(classAvg)))}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-xl shadow-lg pointer-events-none">
                      {classAvg}
                    </div>
                  </div>
                  <span className="text-xs font-black text-rose-600 absolute bottom-0">
                    M4 (Kini)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Task List Section (Dark Slate Card) */}
          <div className="col-span-1 md:col-span-4 bg-slate-900 border border-slate-800 rounded-[32px] p-6 text-white flex flex-col h-full shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Antrean Penilaian
                </span>
                <h2 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
                  Tugas Perlu Dinilai
                </h2>
              </div>
              <span className="bg-rose-500 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-md shadow-rose-500/20">
                {tasks.length} Baru
              </span>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl hover:border-slate-600 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm text-white truncate pr-2">
                      {task.title}
                    </h3>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {task.subject}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <span className="material-symbols-outlined text-[14px]">
                        history
                      </span>
                      {task.submittedTime}
                    </div>
                    <button
                      onClick={() => onOpenGradeTask(task)}
                      className="font-bold text-xs bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm shadow-rose-500/20 cursor-pointer active:scale-95"
                    >
                      Nilai
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onNavigateToGrades}
              className="w-full mt-4 py-2.5 font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-colors text-center cursor-pointer"
            >
              Lihat Semua Tugas
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detail Siswa Belum KKM */}
      {showKkmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-[32px] max-w-2xl w-full p-6 shadow-2xl border border-slate-800 text-white animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2.5 rounded-2xl border border-rose-500/20">
                  warning
                </span>
                <div>
                  <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
                    Siswa Memerlukan Remedial / Pendampingan
                  </h3>
                  <p className="text-xs text-slate-400">
                    Batas KKM / KKTP saat ini: <strong className="text-rose-400">{passingThreshold}</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKkmModal(false)}
                className="text-slate-400 hover:text-white rounded-xl p-1 hover:bg-slate-800 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="my-4 overflow-y-auto flex-1 space-y-4 pr-1">
              {studentsWithSubjectBelowKkm.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <span className="material-symbols-outlined text-4xl text-emerald-400">
                    verified
                  </span>
                  <p className="font-bold text-white">Luar biasa! Semua siswa telah mencapai KKM ({passingThreshold}).</p>
                  <p className="text-xs">Tidak ada siswa yang memerlukan remedial saat ini.</p>
                </div>
              ) : (
                studentsWithSubjectBelowKkm.map((item) => (
                  <div
                    key={item.student.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center justify-center">
                        {item.student.initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{item.student.name}</h4>
                        <p className="text-xs text-slate-400 font-mono">NIS: {item.student.studentId}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right mr-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Rata-Rata
                        </span>
                        <span className={`font-mono text-base font-black ${
                          item.avg < passingThreshold ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {item.avg}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {item.belowSubjects.map((sub, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[11px] font-bold capitalize"
                          >
                            {sub.subj}: {sub.score}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                Total: <strong className="text-rose-400">{studentsWithSubjectBelowKkm.length}</strong> siswa perlu perhatian khusus.
              </span>
              <button
                onClick={() => {
                  setShowKkmModal(false);
                  onNavigateToGrades();
                }}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20 cursor-pointer flex items-center gap-2"
              >
                <span>Buka Buku Nilai</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
