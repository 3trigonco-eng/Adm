import React, { useState } from 'react';
import { SubjectItem, LingkupMateri, TujuanPembelajaran } from '../types';
import { ImportExcelModal } from './ImportExcelModal';

interface CurriculumViewProps {
  subjects: SubjectItem[];
  onAddSubject: (code: string, name: string, icon?: string, color?: string) => void;
  onEditSubject: (id: string, code: string, name: string, icon?: string, color?: string) => void;
  onDeleteSubject: (id: string) => void;
  onAddLingkupMateri: (subjectId: string, code: string, title: string) => void;
  onEditLingkupMateri: (subjectId: string, lmId: string, code: string, title: string) => void;
  onDeleteLingkupMateri: (subjectId: string, lmId: string) => void;
  onAddTP: (subjectId: string, lmId: string, code: string, description: string) => void;
  onEditTP: (subjectId: string, lmId: string, tpId: string, code: string, description: string) => void;
  onDeleteTP: (subjectId: string, lmId: string, tpId: string) => void;
  onImportCurriculum: (importedSubjects: SubjectItem[], replace: boolean) => void;
  searchQuery?: string;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  subjects,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onAddLingkupMateri,
  onEditLingkupMateri,
  onDeleteLingkupMateri,
  onAddTP,
  onEditTP,
  onDeleteTP,
  onImportCurriculum,
  searchQuery = '',
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || 'matematika'
  );

  // Modals / Dialog states
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [subjectCodeInput, setSubjectCodeInput] = useState<string>('');
  const [subjectNameInput, setSubjectNameInput] = useState<string>('');
  const [subjectIconInput, setSubjectIconInput] = useState<string>('book');
  const [subjectColorInput, setSubjectColorInput] = useState<string>('rose');

  const [showLmModal, setShowLmModal] = useState<boolean>(false);
  const [editingLm, setEditingLm] = useState<{ subjectId: string; lm?: LingkupMateri } | null>(null);
  const [lmCodeInput, setLmCodeInput] = useState<string>('');
  const [lmTitleInput, setLmTitleInput] = useState<string>('');

  const [showTpModal, setShowTpModal] = useState<boolean>(false);
  const [editingTp, setEditingTp] = useState<{ subjectId: string; lmId: string; tp?: TujuanPembelajaran } | null>(null);
  const [tpCodeInput, setTpCodeInput] = useState<string>('');
  const [tpDescInput, setTpDescInput] = useState<string>('');

  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  // Available icons list for mapel editing
  const ICON_OPTIONS = [
    { name: 'functions', label: 'Matematika / Hitung' },
    { name: 'menu_book', label: 'Buku / Bahasa' },
    { name: 'science', label: 'Sains / IPA' },
    { name: 'public', label: 'IPS / Geografi' },
    { name: 'school', label: 'Sekolah / Umum' },
    { name: 'palette', label: 'Seni / Desain' },
    { name: 'sports_soccer', label: 'Olahraga / PJOK' },
    { name: 'music_note', label: 'Seni Musik' },
    { name: 'language', label: 'Bahasa Asing' },
    { name: 'computer', label: 'Informatika' },
    { name: 'flag', label: 'Pancasila / PPKn' },
  ];

  // Filters
  const filteredLingkupMateri = currentSubject
    ? currentSubject.lingkupMateriList.filter((lm) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const matchesLm = lm.title.toLowerCase().includes(q) || lm.code.toLowerCase().includes(q);
        const matchesTp = lm.tpList.some(
          (tp) => tp.code.toLowerCase().includes(q) || tp.description.toLowerCase().includes(q)
        );
        return matchesLm || matchesTp;
      })
    : [];

  // Submit handlers
  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectNameInput.trim()) return;
    if (editingSubject) {
      onEditSubject(
        editingSubject.id,
        subjectCodeInput,
        subjectNameInput,
        subjectIconInput,
        subjectColorInput
      );
    } else {
      onAddSubject(
        subjectCodeInput,
        subjectNameInput,
        subjectIconInput,
        subjectColorInput
      );
    }
    setShowSubjectModal(false);
    setEditingSubject(null);
    setSubjectCodeInput('');
    setSubjectNameInput('');
  };

  const handleLmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lmTitleInput.trim() || !editingLm) return;
    if (editingLm.lm) {
      onEditLingkupMateri(editingLm.subjectId, editingLm.lm.id, lmCodeInput, lmTitleInput);
    } else {
      onAddLingkupMateri(editingLm.subjectId, lmCodeInput, lmTitleInput);
    }
    setShowLmModal(false);
    setEditingLm(null);
    setLmCodeInput('');
    setLmTitleInput('');
  };

  const handleTpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpDescInput.trim() || !editingTp) return;
    if (editingTp.tp) {
      onEditTP(editingTp.subjectId, editingTp.lmId, editingTp.tp.id, tpCodeInput, tpDescInput);
    } else {
      onAddTP(editingTp.subjectId, editingTp.lmId, tpCodeInput, tpDescInput);
    }
    setShowTpModal(false);
    setEditingTp(null);
    setTpCodeInput('');
    setTpDescInput('');
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-['Hanken_Grotesk'] text-3xl md:text-4xl font-black text-white tracking-tight">
              Kurikulum, Lingkup Materi & TP
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              Kelola Mata Pelajaran, Lingkup Materi (Bab), serta Tujuan Pembelajaran (TP) Kurikulum Merdeka.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                file_upload
              </span>
              Impor Excel TP (.xlsx)
            </button>

            <button
              onClick={() => {
                setEditingSubject(null);
                setSubjectCodeInput('');
                setSubjectNameInput('');
                setSubjectIconInput('school');
                setSubjectColorInput('rose');
                setShowSubjectModal(true);
              }}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Tambah Mata Pelajaran
            </button>
          </div>
        </div>

        {/* Subject Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          {subjects.map((sub) => {
            const isActive = sub.id === selectedSubjectId;
            const totalTp = sub.lingkupMateriList.reduce(
              (acc, lm) => acc + lm.tpList.length,
              0
            );

            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {sub.icon || 'book'}
                </span>
                <span>{sub.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {totalTp} TP
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Subject Details & Controls */}
        {currentSubject && (
          <div className="space-y-6">
            {/* Subject Overview Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <span className="material-symbols-outlined text-3xl">
                    {currentSubject.icon || 'menu_book'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-rose-400 border border-slate-700">
                      Kode: {currentSubject.code}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {currentSubject.lingkupMateriList.length} Lingkup Materi
                    </span>
                  </div>
                  <h2 className="font-['Hanken_Grotesk'] text-2xl font-bold text-white mt-1">
                    {currentSubject.name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => {
                    setEditingSubject(currentSubject);
                    setSubjectCodeInput(currentSubject.code);
                    setSubjectNameInput(currentSubject.name);
                    setSubjectIconInput(currentSubject.icon || 'school');
                    setSubjectColorInput(currentSubject.color || 'rose');
                    setShowSubjectModal(true);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit Mapel
                </button>
                {subjects.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Yakin ingin menghapus mata pelajaran "${currentSubject.name}"?`)) {
                        onDeleteSubject(currentSubject.id);
                        setSelectedSubjectId(subjects.find((s) => s.id !== currentSubject.id)?.id || '');
                      }
                    }}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Hapus Mapel
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingLm({ subjectId: currentSubject.id });
                    setLmCodeInput(`LM ${currentSubject.lingkupMateriList.length + 1}`);
                    setLmTitleInput('');
                    setShowLmModal(true);
                  }}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/20 active:scale-95 ml-auto md:ml-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  Tambah Lingkup Materi (Bab)
                </button>
              </div>
            </div>

            {/* Lingkup Materi Accordions & TP List */}
            <div className="space-y-6">
              {filteredLingkupMateri.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-12 text-center text-white space-y-3">
                  <span className="material-symbols-outlined text-4xl text-slate-600">
                    topic
                  </span>
                  <p className="text-slate-400 text-sm font-medium">
                    Belum ada Lingkup Materi untuk mata pelajaran ini. Silakan tambahkan Lingkup Materi (Bab) baru atau impor melalui Excel!
                  </p>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">file_upload</span>
                    Impor Dari File Excel
                  </button>
                </div>
              ) : (
                filteredLingkupMateri.map((lm) => (
                  <div
                    key={lm.id}
                    className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 shadow-2xl space-y-4 text-white"
                  >
                    {/* Lingkup Materi Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-xl bg-slate-800 text-rose-400 border border-slate-700 text-xs font-black tracking-wider">
                          {lm.code}
                        </span>
                        <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
                          {lm.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            setEditingLm({ subjectId: currentSubject.id, lm });
                            setLmCodeInput(lm.code);
                            setLmTitleInput(lm.title);
                            setShowLmModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                          title="Edit Lingkup Materi"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus Lingkup Materi "${lm.title}"?`)) {
                              onDeleteLingkupMateri(currentSubject.id, lm.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                          title="Hapus Lingkup Materi"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingTp({ subjectId: currentSubject.id, lmId: lm.id });
                            setTpCodeInput(`TP ${lm.code.replace('LM ', '')}.${lm.tpList.length + 1}`);
                            setTpDescInput('');
                            setShowTpModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Tambah TP
                        </button>
                      </div>
                    </div>

                    {/* Tujuan Pembelajaran (TP) Table */}
                    {lm.tpList.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3">
                        Belum ada Tujuan Pembelajaran (TP) di bawah {lm.code}. Klik tombol "Tambah TP" di atas.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800/80 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                              <th className="p-3 w-28">Kode TP</th>
                              <th className="p-3">Deskripsi Tujuan Pembelajaran (TP)</th>
                              <th className="p-3 w-24 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50 text-sm">
                            {lm.tpList.map((tp) => (
                              <tr key={tp.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-3 font-mono font-bold text-rose-400 text-xs">
                                  {tp.code}
                                </td>
                                <td className="p-3 text-slate-200 text-xs font-medium leading-relaxed">
                                  {tp.description}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingTp({ subjectId: currentSubject.id, lmId: lm.id, tp });
                                        setTpCodeInput(tp.code);
                                        setTpDescInput(tp.description);
                                        setShowTpModal(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                                      title="Edit TP"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">edit</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Hapus ${tp.code}?`)) {
                                          onDeleteTP(currentSubject.id, lm.id, tp.id);
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer"
                                      title="Hapus TP"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Edit / Tambah Mata Pelajaran */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-800 text-white animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
                  book
                </span>
                {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
              </h3>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="text-slate-400 hover:text-white rounded-xl p-1 hover:bg-slate-800 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Kode Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={subjectCodeInput}
                  onChange={(e) => setSubjectCodeInput(e.target.value.toUpperCase())}
                  placeholder="mis. MTK, BIN, IPA, PJOK"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Nama Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={subjectNameInput}
                  onChange={(e) => setSubjectNameInput(e.target.value)}
                  placeholder="mis. Pendidikan Pancasila & Kewarganegaraan"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Ikon Mata Pelajaran
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ICON_OPTIONS.map((ico) => (
                    <button
                      key={ico.name}
                      type="button"
                      onClick={() => setSubjectIconInput(ico.name)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        subjectIconInput === ico.name
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={ico.label}
                    >
                      <span className="material-symbols-outlined text-xl">{ico.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Lingkup Materi */}
      {showLmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-800 text-white animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
                  topic
                </span>
                {editingLm?.lm ? 'Edit Lingkup Materi' : 'Tambah Lingkup Materi (Bab)'}
              </h3>
              <button
                onClick={() => setShowLmModal(false)}
                className="text-slate-400 hover:text-white rounded-xl p-1 hover:bg-slate-800 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleLmSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Kode Lingkup Materi
                </label>
                <input
                  type="text"
                  required
                  value={lmCodeInput}
                  onChange={(e) => setLmCodeInput(e.target.value)}
                  placeholder="mis. LM 1, Bab 1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Judul Lingkup Materi (Topik / Bab)
                </label>
                <input
                  type="text"
                  required
                  value={lmTitleInput}
                  onChange={(e) => setLmTitleInput(e.target.value)}
                  placeholder="mis. Pecahan, Desimal, dan Persen"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLmModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Simpan Lingkup Materi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Tujuan Pembelajaran (TP) */}
      {showTpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-[32px] max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-white animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
                  assignment_turned_in
                </span>
                {editingTp?.tp ? 'Edit Tujuan Pembelajaran (TP)' : 'Tambah Tujuan Pembelajaran (TP)'}
              </h3>
              <button
                onClick={() => setShowTpModal(false)}
                className="text-slate-400 hover:text-white rounded-xl p-1 hover:bg-slate-800 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleTpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Kode TP
                </label>
                <input
                  type="text"
                  required
                  value={tpCodeInput}
                  onChange={(e) => setTpCodeInput(e.target.value)}
                  placeholder="mis. TP 1.1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Deskripsi / Rumusan Tujuan Pembelajaran (TP)
                </label>
                <textarea
                  required
                  rows={3}
                  value={tpDescInput}
                  onChange={(e) => setTpDescInput(e.target.value)}
                  placeholder="mis. Membandingkan dan mengurutkan pecahan biasa dan campuran dengan tepat."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTpModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Simpan TP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Excel Import Modal */}
      <ImportExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={onImportCurriculum}
        currentSubjects={subjects}
      />
    </div>
  );
};
