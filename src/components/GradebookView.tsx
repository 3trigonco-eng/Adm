import React, { useState } from 'react';
import { StudentGradeRecord, SubjectItem, LingkupMateri, TujuanPembelajaran } from '../types';

interface GradebookViewProps {
  students: StudentGradeRecord[];
  subjects: SubjectItem[];
  tpGrades: { [studentId: string]: { [tpId: string]: number } };
  onUpdateGrade: (
    studentId: string,
    field: 'matematika' | 'indonesia' | 'ipa' | 'ips' | string,
    score: number
  ) => void;
  onUpdateTpGrade: (studentId: string, tpId: string, score: number, subjectId: string) => void;
  onSaveGrades: () => void;
  onNavigateToCurriculum: () => void;
  passingThreshold: number;
  classNameTitle: string;
  searchQuery: string;
}

export interface SubjectComponentRecord {
  uhTp: number; // Ulangan Harian (Tujuan Pembelajaran / Formatif)
  uhLm: number; // Ulangan Akhir Lingkup Materi (LM)
  sas: number;  // Ulangan Akhir Semester (SAS)
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  students,
  subjects,
  tpGrades,
  onUpdateGrade,
  onUpdateTpGrade,
  onSaveGrades,
  onNavigateToCurriculum,
  passingThreshold,
  classNameTitle,
  searchQuery,
}) => {
  const [viewMode, setViewMode] = useState<'summary' | 'component_input' | 'tp_detail'>('summary');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || 'matematika'
  );
  const [selectedLmId, setSelectedLmId] = useState<string>('all');

  // Component Grades State (UH / TP, LM, SAS) with local storage persistence
  const [componentGrades, setComponentGrades] = useState<{
    [studentId: string]: { [subjectId: string]: SubjectComponentRecord };
  }>(() => {
    const saved = localStorage.getItem('gradebook_component_grades_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }

    const initial: { [studentId: string]: { [subjectId: string]: SubjectComponentRecord } } = {};
    students.forEach((s) => {
      initial[s.id] = {};
      subjects.forEach((subj) => {
        // Compute initial TP average if exists
        let tpSum = 0;
        let tpCount = 0;
        subj.lingkupMateriList.forEach((lm) => {
          lm.tpList.forEach((tp) => {
            const val = tpGrades[s.id]?.[tp.id];
            if (val !== undefined && val !== null) {
              tpSum += val;
              tpCount++;
            }
          });
        });

        const baseGrade = s.grades[subj.id] ?? 80;
        const tpAvg = tpCount > 0 ? Math.round(tpSum / tpCount) : baseGrade;

        initial[s.id][subj.id] = {
          uhTp: tpAvg,
          uhLm: Math.min(100, Math.max(0, baseGrade - 1)),
          sas: Math.min(100, Math.max(0, baseGrade + 1)),
        };
      });
    });

    return initial;
  });

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.initials.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIndicatorColor = (score: number) => {
    if (score >= passingThreshold) return 'bg-emerald-400 shadow-sm shadow-emerald-400/50';
    if (score >= passingThreshold - 10) return 'bg-amber-400 shadow-sm shadow-amber-400/50';
    return 'bg-rose-500 shadow-sm shadow-rose-500/50';
  };

  const getIndicatorTitle = (score: number) => {
    if (score >= passingThreshold) return `≥ ${passingThreshold} (Sangat Baik / Tuntas)`;
    if (score >= passingThreshold - 10) return `${passingThreshold - 10}-${passingThreshold} (Cukup)`;
    return `< ${passingThreshold - 10} (Perlu Bimbingan / Remedial)`;
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  // Get active Lingkup Materi list and TP list
  const activeLingkupMateriList: LingkupMateri[] = selectedSubject
    ? selectedLmId === 'all'
      ? selectedSubject.lingkupMateriList
      : selectedSubject.lingkupMateriList.filter((lm) => lm.id === selectedLmId)
    : [];

  const activeTpList: { tp: TujuanPembelajaran; lm: LingkupMateri }[] = [];
  activeLingkupMateriList.forEach((lm) => {
    lm.tpList.forEach((tp) => {
      activeTpList.push({ tp, lm });
    });
  });

  // Calculate combined UH (Formatif TP + Sumatif LM) & Final Score with 60:40 formula
  const getStudentComponentRecord = (studentId: string, subjectId: string): SubjectComponentRecord => {
    const studentMap = componentGrades[studentId] || {};
    if (studentMap[subjectId]) {
      return studentMap[subjectId];
    }
    const targetStudent = students.find((s) => s.id === studentId);
    const base = targetStudent?.grades[subjectId] ?? 80;
    return { uhTp: base, uhLm: base, sas: base };
  };

  const computeStudentSubjectGrade = (studentId: string, subjectId: string) => {
    const record = getStudentComponentRecord(studentId, subjectId);
    const combinedUh = Math.round((record.uhTp + record.uhLm) / 2);
    const finalScore = Math.round(combinedUh * 0.6 + record.sas * 0.4);
    return {
      combinedUh,
      sas: record.sas,
      finalScore: Math.min(100, Math.max(0, finalScore)),
      record,
    };
  };

  // Handler for updating UH TP, LM, or SAS component score
  const handleUpdateComponentGrade = (
    studentId: string,
    subjectId: string,
    field: 'uhTp' | 'uhLm' | 'sas',
    val: number
  ) => {
    const score = Math.min(100, Math.max(0, val));
    const currentMap = componentGrades[studentId] || {};
    const currentSubj = currentMap[subjectId] || { uhTp: 80, uhLm: 80, sas: 80 };
    const updatedSubj = { ...currentSubj, [field]: score };

    const combinedUh = Math.round((updatedSubj.uhTp + updatedSubj.uhLm) / 2);
    const newFinalScore = Math.round(combinedUh * 0.6 + updatedSubj.sas * 0.4);

    const nextState = {
      ...componentGrades,
      [studentId]: {
        ...currentMap,
        [subjectId]: updatedSubj,
      },
    };

    setComponentGrades(nextState);
    localStorage.setItem('gradebook_component_grades_v3', JSON.stringify(nextState));

    // Propagate automatically to overall student subject grade
    onUpdateGrade(studentId, subjectId, newFinalScore);
  };

  // Subject statistics for component input view
  const getSubjectClassStats = (subjectId: string) => {
    if (students.length === 0) return { avgUh: 0, avgLm: 0, avgSas: 0, avgFinal: 0, tuntasCount: 0 };
    let totalUhTp = 0;
    let totalUhLm = 0;
    let totalSas = 0;
    let totalFinal = 0;
    let tuntasCount = 0;

    students.forEach((s) => {
      const { combinedUh, sas, finalScore, record } = computeStudentSubjectGrade(s.id, subjectId);
      totalUhTp += record.uhTp;
      totalUhLm += record.uhLm;
      totalSas += sas;
      totalFinal += finalScore;
      if (finalScore >= passingThreshold) tuntasCount++;
    });

    const len = students.length || 1;
    return {
      avgUh: (totalUhTp / len).toFixed(1),
      avgLm: (totalUhLm / len).toFixed(1),
      avgSas: (totalSas / len).toFixed(1),
      avgFinal: (totalFinal / len).toFixed(1),
      tuntasCount,
      percentTuntas: Math.round((tuntasCount / len) * 100),
    };
  };

  const currentStats = getSubjectClassStats(selectedSubjectId);

  return (
    <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-['Hanken_Grotesk'] text-3xl md:text-4xl font-black text-white tracking-tight">
              Buku Nilai: {classNameTitle}
            </h1>
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
              Rumus 60% UH + 40% SAS
            </span>
          </div>
          <p className="text-slate-400 text-sm md:text-base mt-1 font-medium">
            Kelola nilai Ulangan Harian (TP), Lingkup Materi (LM), dan Ulangan Akhir Semester (SAS) secara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onNavigateToCurriculum}
            className="px-4 py-2.5 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-[18px]">account_tree</span>
            Kelola TP & Lingkup Materi
          </button>
          <button
            onClick={onSaveGrades}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm py-2.5 px-5 rounded-2xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Simpan Nilai
          </button>
        </div>
      </div>

      {/* RUMUS PENILAIAN BANNER */}
      <div className="p-4 md:p-5 mb-6 rounded-[24px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border border-indigo-500/30 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shrink-0">
            <span className="material-symbols-outlined text-2xl">calculate</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-white">
                Rumus Penilaian Akhir Mata Pelajaran (Kurikulum Merdeka)
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Otomatis
              </span>
            </div>
            <p className="text-xs text-slate-300">
              <span className="font-bold text-white">Nilai Akhir Mapel</span> = (
              <span className="text-emerald-400 font-bold">60% × Rata-rata Ulangan Harian/TP & LM</span>) + (
              <span className="text-indigo-400 font-bold">40% × Ulangan Akhir Semester/SAS</span>)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-[11px]">
          <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">
            60% Formatif & LM
          </span>
          <span className="text-slate-500 font-bold">+</span>
          <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold">
            40% Sumatif SAS
          </span>
        </div>
      </div>

      {/* View Mode Toggle Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-2 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl text-white">
        {/* Toggle buttons */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('summary')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'summary'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
            Ringkasan Mata Pelajaran
          </button>

          <button
            onClick={() => setViewMode('component_input')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'component_input'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            Input Komponen (UH / LM / SAS)
          </button>

          <button
            onClick={() => setViewMode('tp_detail')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'tp_detail'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
            Rincian Nilai Per TP
          </button>
        </div>

        {/* Filters if in TP detail or Component view mode */}
        {(viewMode === 'tp_detail' || viewMode === 'component_input') && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Subject Dropdown */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5">
              <span className="material-symbols-outlined text-[18px] text-rose-400">
                book
              </span>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedLmId('all');
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    Mapel: {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Lingkup Materi Dropdown (only for TP detail) */}
            {viewMode === 'tp_detail' && (
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5">
                <span className="material-symbols-outlined text-[18px] text-amber-400">
                  topic
                </span>
                <select
                  value={selectedLmId}
                  onChange={(e) => setSelectedLmId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    Semua Lingkup Materi (Bab)
                  </option>
                  {selectedSubject?.lingkupMateriList.map((lm) => (
                    <option key={lm.id} value={lm.id} className="bg-slate-900 text-white">
                      {lm.code}: {lm.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODE 1: RINGKASAN MATA PELAJARAN (AUTOMATIC 60:40 FORMULA) */}
      {viewMode === 'summary' && (
        <div className="bg-slate-900 rounded-[28px] border border-slate-800 overflow-hidden flex flex-col table-container shadow-2xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400">verified</span>
              <span className="font-bold text-sm">
                Ringkasan Nilai Akhir Otomatis (Hasil Kalkulasi 60% UH + 40% SAS)
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Target KKTP: <span className="text-white font-bold">{passingThreshold}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase w-12 text-center tracking-wider">
                    NO
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    NAMA SISWA
                  </th>
                  {subjects.map((subj) => (
                    <th
                      key={subj.id}
                      className="p-4 text-xs font-bold text-slate-300 uppercase text-center tracking-wider border-l border-slate-800/80"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-rose-400 font-bold">{subj.code}</span>
                        <span className="text-[10px] text-slate-400 normal-case font-normal">
                          60% UH + 40% SAS
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase w-32 text-center tracking-wider border-l border-slate-800/80">
                    RATA-RATA
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase w-32 text-center tracking-wider border-l border-slate-800/80">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={subjects.length + 4} className="p-8 text-center text-slate-400 text-sm">
                      Tidak ada siswa yang sesuai dengan kata kunci pencarian "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    let totalFinal = 0;
                    subjects.forEach((subj) => {
                      const { finalScore } = computeStudentSubjectGrade(student.id, subj.id);
                      totalFinal += finalScore;
                    });

                    const overallAvg = Number((totalFinal / (subjects.length || 1)).toFixed(1));
                    const isTopAvg = overallAvg >= 85;
                    const isPassed = overallAvg >= passingThreshold;

                    return (
                      <tr key={student.id} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="p-4 font-mono text-sm text-slate-400 text-center font-bold">
                          {student.no}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs">
                              {student.initials}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-white block">{student.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                NIS: {student.studentId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Subject Calculated Final Grades */}
                        {subjects.map((subj) => {
                          const { combinedUh, sas, finalScore } = computeStudentSubjectGrade(
                            student.id,
                            subj.id
                          );

                          return (
                            <td key={subj.id} className="p-4 border-l border-slate-800/60 text-center">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={finalScore}
                                    onChange={(e) =>
                                      onUpdateGrade(student.id, subj.id, Number(e.target.value))
                                    }
                                    className="grade-input w-16 p-1.5 text-center border border-slate-700 rounded-xl bg-slate-800 font-mono text-sm text-white font-bold focus:border-rose-500 transition-all"
                                  />
                                  <div
                                    className={`w-3 h-3 rounded-full ${getIndicatorColor(
                                      finalScore
                                    )} transition-all`}
                                    title={getIndicatorTitle(finalScore)}
                                  />
                                </div>

                                <span
                                  className="text-[9.5px] text-slate-400 font-mono"
                                  title={`UH (60%): ${combinedUh} | SAS (40%): ${sas}`}
                                >
                                  UH:{combinedUh} | SAS:{sas}
                                </span>
                              </div>
                            </td>
                          );
                        })}

                        {/* Overall Average */}
                        <td className="p-4 text-center border-l border-slate-800/80">
                          <span
                            className={`font-mono text-base font-black ${
                              isTopAvg ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {overallAvg}
                          </span>
                        </td>

                        {/* KKTP Status */}
                        <td className="p-4 text-center border-l border-slate-800/80">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              isPassed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isPassed ? 'TUNTAS' : 'REMEDIAL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODE 2: INPUT KOMPONEN PENILAIAN (UH / TP, LM, SAS) */}
      {viewMode === 'component_input' && (
        <div className="space-y-6">
          {/* Subject Stats Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                RATA UH / TP (60%)
              </span>
              <span className="font-mono text-xl font-black text-emerald-400 mt-1 block">
                {currentStats.avgUh}
              </span>
              <span className="text-[10px] text-slate-500">Ulangan Harian</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                RATA LINGKUP MATERI
              </span>
              <span className="font-mono text-xl font-black text-amber-400 mt-1 block">
                {currentStats.avgLm}
              </span>
              <span className="text-[10px] text-slate-500">Sumatif Bab</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                RATA SAS (40%)
              </span>
              <span className="font-mono text-xl font-black text-indigo-400 mt-1 block">
                {currentStats.avgSas}
              </span>
              <span className="text-[10px] text-slate-500">Akhir Semester</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                RATA NILAI AKHIR KELAS
              </span>
              <span className="font-mono text-xl font-black text-rose-400 mt-1 block">
                {currentStats.avgFinal}
              </span>
              <span className="text-[10px] text-slate-500">Kombinasi 60:40</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                KETUNTASAN KELAS
              </span>
              <span className="font-mono text-xl font-black text-white mt-1 block">
                {currentStats.percentTuntas}%
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                {currentStats.tuntasCount} / {students.length} Siswa Tuntas
              </span>
            </div>
          </div>

          {/* Component Input Matrix Table */}
          <div className="bg-slate-900 rounded-[28px] border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                  <span className="material-symbols-outlined text-xl">
                    {selectedSubject?.icon || 'book'}
                  </span>
                </div>
                <div>
                  <h2 className="font-['Hanken_Grotesk'] text-lg font-bold text-white">
                    Input Komponen Penilaian: {selectedSubject?.name} ({selectedSubject?.code})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Ketikkan nilai Ulangan Harian (TP), Lingkup Materi (LM), atau SAS. Nilai Akhir dihitung otomatis!
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10 text-white">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase w-12 text-center tracking-wider">
                      NO
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[200px]">
                      NAMA SISWA
                    </th>
                    <th className="p-3 text-xs font-bold text-emerald-400 uppercase text-center tracking-wider border-l border-slate-800/80">
                      ULANGAN HARIAN (TP)
                    </th>
                    <th className="p-3 text-xs font-bold text-amber-400 uppercase text-center tracking-wider border-l border-slate-800/80">
                      AKHIR LINGKUP MATERI (LM)
                    </th>
                    <th className="p-3 text-xs font-bold text-teal-300 uppercase text-center tracking-wider border-l border-slate-800/80">
                      GABUNGAN UH (60%)
                    </th>
                    <th className="p-3 text-xs font-bold text-indigo-400 uppercase text-center tracking-wider border-l border-slate-800/80">
                      AKHIR SEMESTER (SAS) (40%)
                    </th>
                    <th className="p-3 text-xs font-bold text-rose-400 uppercase text-center tracking-wider border-l border-slate-800/80">
                      NILAI AKHIR MAPEL
                    </th>
                    <th className="p-3 text-xs font-bold text-slate-400 uppercase text-center tracking-wider border-l border-slate-800/80">
                      STATUS KKTP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                        Tidak ada siswa yang sesuai pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const { combinedUh, sas, finalScore, record } = computeStudentSubjectGrade(
                        student.id,
                        selectedSubjectId
                      );
                      const isPassed = finalScore >= passingThreshold;

                      return (
                        <tr key={student.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-mono text-sm text-slate-400 text-center font-bold">
                            {student.no}
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs">
                                {student.initials}
                              </div>
                              <div>
                                <span className="text-sm font-bold text-white block">{student.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  NIS: {student.studentId}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 1. Ulangan Harian (TP) Input */}
                          <td className="p-3 text-center border-l border-slate-800/60">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={record.uhTp}
                              onChange={(e) =>
                                handleUpdateComponentGrade(
                                  student.id,
                                  selectedSubjectId,
                                  'uhTp',
                                  Number(e.target.value)
                                )
                              }
                              className="grade-input w-20 p-2 text-center border border-emerald-500/40 focus:border-emerald-400 rounded-xl bg-slate-800 font-mono text-sm text-emerald-300 font-bold transition-all"
                            />
                          </td>

                          {/* 2. Ulangan Akhir Lingkup Materi (LM) Input */}
                          <td className="p-3 text-center border-l border-slate-800/60">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={record.uhLm}
                              onChange={(e) =>
                                handleUpdateComponentGrade(
                                  student.id,
                                  selectedSubjectId,
                                  'uhLm',
                                  Number(e.target.value)
                                )
                              }
                              className="grade-input w-20 p-2 text-center border border-amber-500/40 focus:border-amber-400 rounded-xl bg-slate-800 font-mono text-sm text-amber-300 font-bold transition-all"
                            />
                          </td>

                          {/* 3. Combined UH Score (60% component) */}
                          <td className="p-3 text-center border-l border-slate-800/60 font-mono font-bold text-teal-300 text-base">
                            {combinedUh}
                          </td>

                          {/* 4. Ulangan Akhir Semester (SAS) (40% component) Input */}
                          <td className="p-3 text-center border-l border-slate-800/60">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={sas}
                              onChange={(e) =>
                                handleUpdateComponentGrade(
                                  student.id,
                                  selectedSubjectId,
                                  'sas',
                                  Number(e.target.value)
                                )
                              }
                              className="grade-input w-20 p-2 text-center border border-indigo-500/40 focus:border-indigo-400 rounded-xl bg-slate-800 font-mono text-sm text-indigo-300 font-bold transition-all"
                            />
                          </td>

                          {/* 5. Automatic Final Grade (60% UH + 40% SAS) */}
                          <td className="p-3 text-center border-l border-slate-800/80 font-mono text-lg font-black text-rose-400">
                            {finalScore}
                          </td>

                          {/* 6. Status KKTP */}
                          <td className="p-3 text-center border-l border-slate-800/80">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                isPassed
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {isPassed ? 'TUNTAS' : 'REMEDIAL'}
                            </span>
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
      )}

      {/* MODE 3: DETAILED TP SCORES MATRIX */}
      {viewMode === 'tp_detail' && (
        <div className="bg-slate-900 rounded-[28px] border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
          {/* Header Banner for Subject */}
          <div className="p-5 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                <span className="material-symbols-outlined text-2xl">
                  {selectedSubject?.icon || 'book'}
                </span>
              </div>
              <div>
                <h2 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
                  {selectedSubject?.name} ({selectedSubject?.code})
                </h2>
                <p className="text-xs text-slate-400">
                  {activeTpList.length} Tujuan Pembelajaran (TP) terdaftar di bawah{' '}
                  {selectedLmId === 'all'
                    ? 'Semua Lingkup Materi'
                    : selectedSubject?.lingkupMateriList.find((lm) => lm.id === selectedLmId)?.title}
                </p>
              </div>
            </div>

            <button
              onClick={onNavigateToCurriculum}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Tambah TP / Lingkup Materi
            </button>
          </div>

          <div className="overflow-x-auto">
            {activeTpList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">
                  quiz
                </span>
                <p className="text-sm font-medium">
                  Belum ada Tujuan Pembelajaran (TP) yang dikonfigurasi untuk lingkup materi ini.
                </p>
                <button
                  onClick={onNavigateToCurriculum}
                  className="mt-4 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Buat TP Sekarang
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10 text-white">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase w-12 text-center tracking-wider">
                      NO
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[180px]">
                      NAMA SISWA
                    </th>
                    {/* Dynamic TP Columns */}
                    {activeTpList.map(({ tp, lm }) => (
                      <th
                        key={tp.id}
                        className="p-3 text-xs font-bold text-slate-300 uppercase w-32 text-center tracking-wider border-l border-slate-800/80"
                        title={`${lm.code} - ${tp.code}: ${tp.description}`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-rose-400 font-mono font-black">
                            {lm.code}
                          </span>
                          <span className="text-sm font-black text-white font-mono">
                            {tp.code}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[110px] font-normal normal-case mt-0.5">
                            {tp.description}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase w-32 text-center tracking-wider border-l border-slate-800/80">
                      RATA MAPEL
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={activeTpList.length + 3} className="p-8 text-center text-slate-400 text-sm">
                        Tidak ada siswa yang sesuai pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const studentTpMap = tpGrades[student.id] || {};

                      // Calculate subject average based on active TP grades
                      let tpSum = 0;
                      let tpCount = 0;
                      activeTpList.forEach(({ tp }) => {
                        const val = studentTpMap[tp.id];
                        if (val !== undefined && val !== null) {
                          tpSum += Number(val);
                          tpCount++;
                        }
                      });

                      const currentSubjectGrade =
                        student.grades[selectedSubjectId] ??
                        (tpCount > 0 ? Math.round(tpSum / tpCount) : 80);

                      const isTopSubject = currentSubjectGrade >= 85;

                      return (
                        <tr key={student.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-mono text-sm text-slate-400 text-center font-bold">
                            {student.no}
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs">
                                {student.initials}
                              </div>
                              <span className="text-sm font-bold text-white whitespace-nowrap">
                                {student.name}
                              </span>
                            </div>
                          </td>

                          {/* TP Grade Inputs */}
                          {activeTpList.map(({ tp }) => {
                            const currentTpScore =
                              studentTpMap[tp.id] !== undefined ? studentTpMap[tp.id] : 80;

                            return (
                              <td key={tp.id} className="p-3 text-center border-l border-slate-800/60">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={currentTpScore}
                                    onChange={(e) => {
                                      const newScore = Number(e.target.value);
                                      onUpdateTpGrade(
                                        student.id,
                                        tp.id,
                                        newScore,
                                        selectedSubjectId
                                      );
                                      handleUpdateComponentGrade(
                                        student.id,
                                        selectedSubjectId,
                                        'uhTp',
                                        newScore
                                      );
                                    }}
                                    className="grade-input w-16 p-1.5 text-center border border-slate-700 rounded-xl bg-slate-800 font-mono text-sm text-white font-bold focus:border-rose-500 transition-all"
                                  />
                                  <div
                                    className={`w-2.5 h-2.5 rounded-full ${getIndicatorColor(
                                      currentTpScore
                                    )}`}
                                    title={getIndicatorTitle(currentTpScore)}
                                  />
                                </div>
                              </td>
                            );
                          })}

                          {/* Subject Average Score */}
                          <td className="p-4 text-center border-l border-slate-800/80">
                            <span
                              className={`font-mono text-base font-black ${
                                isTopSubject ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {currentSubjectGrade}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
