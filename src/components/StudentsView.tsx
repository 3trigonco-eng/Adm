import React, { useState } from 'react';
import { StudentGradeRecord } from '../types';
import { ImportStudentsModal } from './ImportStudentsModal';
import * as XLSX from 'xlsx';

interface StudentsViewProps {
  students: StudentGradeRecord[];
  onAddStudent: (name: string, studentId: string, parentName: string, parentPhone: string) => void;
  onEditStudent: (
    id: string,
    name: string,
    studentId: string,
    parentName: string,
    parentPhone: string,
    grades?: { matematika: number; indonesia: number; ipa: number; ips: number }
  ) => void;
  onDeleteStudent: (id: string) => void;
  onImportStudents: (importedStudents: StudentGradeRecord[], replace: boolean) => void;
  searchQuery: string;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onImportStudents,
  searchQuery,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentGradeRecord | null>(null);

  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Grades input for edit mode
  const [mathGrade, setMathGrade] = useState<number>(80);
  const [indoGrade, setIndoGrade] = useState<number>(80);
  const [ipaGrade, setIpaGrade] = useState<number>(80);
  const [ipsGrade, setIpsGrade] = useState<number>(80);

  const [showImportModal, setShowImportModal] = useState(false);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.includes(searchQuery) ||
      s.initials.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.parentName && s.parentName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setName('');
    setStudentId('');
    setParentName('');
    setParentPhone('');
    setMathGrade(80);
    setIndoGrade(80);
    setIpaGrade(80);
    setIpsGrade(80);
    setShowModal(true);
  };

  const handleOpenEditModal = (st: StudentGradeRecord) => {
    setEditingStudent(st);
    setName(st.name);
    setStudentId(st.studentId);
    setParentName(st.parentName || '');
    setParentPhone(st.parentPhone || '');
    setMathGrade(st.grades.matematika);
    setIndoGrade(st.grades.indonesia);
    setIpaGrade(st.grades.ipa);
    setIpsGrade(st.grades.ips);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !studentId.trim()) return;

    if (editingStudent) {
      onEditStudent(
        editingStudent.id,
        name,
        studentId,
        parentName,
        parentPhone,
        {
          matematika: mathGrade,
          indonesia: indoGrade,
          ipa: ipaGrade,
          ips: ipsGrade,
        }
      );
    } else {
      onAddStudent(name, studentId, parentName, parentPhone);
    }

    setShowModal(false);
  };

  // Export current list to Excel
  const handleExportExcel = () => {
    const exportData = students.map((st, index) => ({
      'No': index + 1,
      'NIS / NISN': st.studentId,
      'Nama Siswa': st.name,
      'Status Presensi': st.attendanceStatus.toUpperCase(),
      'Nama Orang Tua / Wali': st.parentName || '-',
      'No HP Orang Tua': st.parentPhone || '-',
      'Nilai Matematika': st.grades.matematika,
      'Nilai Bahasa Indonesia': st.grades.indonesia,
      'Nilai IPA': st.grades.ipa,
      'Nilai IPS': st.grades.ips,
      'Rata-Rata': Number(
        (
          (st.grades.matematika +
            st.grades.indonesia +
            st.grades.ipa +
            st.grades.ips) /
          4
        ).toFixed(1)
      ),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 28 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Siswa');

    XLSX.writeFile(workbook, `Daftar_Siswa_Kelas_${Date.now()}.xlsx`);
  };

  // Calculate overall class statistics
  const overallAvg = (
    students.reduce(
      (acc, st) =>
        acc +
        (st.grades.matematika +
          st.grades.indonesia +
          st.grades.ipa +
          st.grades.ips) /
          4,
      0
    ) / (students.length || 1)
  ).toFixed(1);

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-['Hanken_Grotesk'] text-3xl md:text-4xl font-black text-white tracking-tight">
              Daftar Siswa & Profil
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              Kelola data identitas siswa, kontak orang tua/wali, serta nilai rapor.
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
              Impor Excel (.xlsx)
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                download
              </span>
              Ekspor Excel
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>
              Tambah Siswa Baru
            </button>
          </div>
        </div>

        {/* Stats Quick Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <span className="material-symbols-outlined">groups</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Total Siswa</p>
              <p className="text-xl font-black text-white">{students.length} Siswa</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Rata-Rata Kelas</p>
              <p className="text-xl font-black text-emerald-400">{overallAvg}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <span className="material-symbols-outlined">how_to_reg</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Hadir Hari Ini</p>
              <p className="text-xl font-black text-indigo-400">
                {students.filter((s) => s.attendanceStatus === 'hadir').length} Siswa
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <span className="material-symbols-outlined">contact_phone</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Kontak Wali</p>
              <p className="text-xl font-black text-amber-400">
                {students.filter((s) => s.parentPhone).length} Terdata
              </p>
            </div>
          </div>
        </div>

        {/* Student Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((st) => {
            const avg = (
              (st.grades.matematika +
                st.grades.indonesia +
                st.grades.ipa +
                st.grades.ips) /
              4
            ).toFixed(1);

            return (
              <div
                key={st.id}
                className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 shadow-2xl hover:border-slate-700 transition-all flex flex-col justify-between text-white relative group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-white font-black text-base flex items-center justify-center shadow-md">
                        {st.initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                          {st.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          NIS / ID: {st.studentId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(st)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Data Siswa"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus data siswa "${st.name}"?`)) {
                            onDeleteStudent(st.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Hapus Siswa"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs border-t border-b border-slate-800/80 py-3 my-3 text-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Orang Tua / Wali:</span>
                      <span className="font-bold text-white">
                        {st.parentName || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">No. HP / WhatsApp:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {st.parentPhone || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-400 font-medium">Status Presensi:</span>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold capitalize ${
                          st.attendanceStatus === 'hadir'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : st.attendanceStatus === 'sakit'
                            ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                            : st.attendanceStatus === 'izin'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {st.attendanceStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      Rata-Rata Nilai
                    </span>
                    <span className="font-mono text-xl font-black text-rose-400">
                      {avg}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {st.parentPhone && (
                      <a
                        href={`https://wa.me/${st.parentPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 px-3 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          chat
                        </span>
                        WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(st)}
                      className="p-2 px-3 text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        tune
                      </span>
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add / Edit Student Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-[32px] max-w-lg w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-200 text-white max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
                    {editingStudent ? 'person_edit' : 'person_add'}
                  </span>
                  <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
                    {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-white rounded-xl p-1 cursor-pointer hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Nama Lengkap Siswa
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="mis. Muhammad Rizky"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Nomor Induk Siswa (NIS/ID)
                    </label>
                    <input
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="mis. 6028"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Nama Orang Tua / Wali
                    </label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="mis. Herman Rizky"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Nomor HP / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="mis. 0812-9988-7766"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>

                {editingStudent && (
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-bold text-rose-400 mb-2 uppercase tracking-wider">
                      Edit Nilai Mata Pelajaran Utama
                    </label>
                    <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Matematika</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={mathGrade}
                          onChange={(e) => setMathGrade(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">B. Indonesia</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={indoGrade}
                          onChange={(e) => setIndoGrade(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">IPA (Sains)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={ipaGrade}
                          onChange={(e) => setIpaGrade(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">IPS (Sosial)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={ipsGrade}
                          onChange={(e) => setIpsGrade(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-lg shadow-rose-500/20 cursor-pointer"
                  >
                    {editingStudent ? 'Simpan Perubahan' : 'Simpan Siswa Baru'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Excel Import Modal */}
        <ImportStudentsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={onImportStudents}
          currentStudents={students}
        />
      </div>
    </div>
  );
};
