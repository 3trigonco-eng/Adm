import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { StudentGradeRecord, AttendanceStatus } from '../types';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedStudents: StudentGradeRecord[], replace: boolean) => void;
  currentStudents: StudentGradeRecord[];
}

interface ParsedStudentRow {
  name: string;
  studentId: string;
  parentName: string;
  parentPhone: string;
  mathGrade?: number;
  indonesiaGrade?: number;
  ipaGrade?: number;
  ipsGrade?: number;
  attendanceStatus?: AttendanceStatus;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentStudents,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  if (!isOpen) return null;

  // Read and parse Excel file
  const processFile = (uploadedFile: File) => {
    setErrorMsg(null);
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setErrorMsg('File Excel / CSV kosong atau tidak memiliki baris data.');
          setParsedRows([]);
          return;
        }

        const rows: ParsedStudentRow[] = [];

        rawJson.forEach((row) => {
          const findVal = (keys: string[]) => {
            for (const k of Object.keys(row)) {
              const cleanK = k.trim().toLowerCase();
              if (keys.some((target) => cleanK.includes(target))) {
                return String(row[k]).trim();
              }
            }
            return '';
          };

          const parseNum = (valStr: string, defaultNum = 80) => {
            const parsed = parseFloat(valStr);
            return isNaN(parsed) ? defaultNum : Math.min(100, Math.max(0, parsed));
          };

          const name =
            findVal(['nama siswa', 'nama lengkap', 'nama', 'student_name', 'student']) || '';
          const studentId =
            findVal(['nisn', 'nis', 'id siswa', 'no induk', 'id_siswa', 'id', 'student_id']) ||
            `${Math.floor(1000 + Math.random() * 9000)}`;
          const parentName =
            findVal(['nama orang tua', 'nama wali', 'orang tua', 'parent', 'wali']) || '';
          const parentPhone =
            findVal(['no hp', 'no whatsapp', 'telepon', 'hp', 'phone', 'wa']) || '';

          const mathVal = findVal(['matematika', 'mtk', 'math']);
          const indoVal = findVal(['bahasa indonesia', 'indonesia', 'bin']);
          const ipaVal = findVal(['ipa', 'sains', 'science']);
          const ipsVal = findVal(['ips', 'sosial', 'social']);

          if (name) {
            rows.push({
              name,
              studentId,
              parentName,
              parentPhone,
              mathGrade: mathVal ? parseNum(mathVal) : 80,
              indonesiaGrade: indoVal ? parseNum(indoVal) : 80,
              ipaGrade: ipaVal ? parseNum(ipaVal) : 80,
              ipsGrade: ipsVal ? parseNum(ipsVal) : 80,
              attendanceStatus: 'hadir',
            });
          }
        });

        if (rows.length === 0) {
          setErrorMsg('Tidak dapat membaca kolom "Nama Siswa". Pastikan file mengikuti format template.');
        } else {
          setParsedRows(rows);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Gagal membaca file Excel. Pastikan format file adalah .xlsx, .xls, atau .csv');
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;

    let baseList: StudentGradeRecord[] = [];
    if (importMode === 'merge') {
      baseList = JSON.parse(JSON.stringify(currentStudents));
    }

    parsedRows.forEach((row) => {
      const initials = row.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      // Check if studentId already exists in baseList when merging
      const existingIdx = baseList.findIndex((s) => s.studentId === row.studentId || s.name.toLowerCase() === row.name.toLowerCase());

      if (existingIdx !== -1 && importMode === 'merge') {
        // Update existing student record
        baseList[existingIdx] = {
          ...baseList[existingIdx],
          name: row.name,
          initials,
          parentName: row.parentName || baseList[existingIdx].parentName,
          parentPhone: row.parentPhone || baseList[existingIdx].parentPhone,
          grades: {
            matematika: row.mathGrade ?? baseList[existingIdx].grades.matematika,
            indonesia: row.indonesiaGrade ?? baseList[existingIdx].grades.indonesia,
            ipa: row.ipaGrade ?? baseList[existingIdx].grades.ipa,
            ips: row.ipsGrade ?? baseList[existingIdx].grades.ips,
          },
        };
      } else {
        // Create new student
        const newStudent: StudentGradeRecord = {
          id: `s_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          no: baseList.length + 1,
          initials,
          name: row.name,
          studentId: row.studentId,
          parentName: row.parentName,
          parentPhone: row.parentPhone,
          grades: {
            matematika: row.mathGrade ?? 80,
            indonesia: row.indonesiaGrade ?? 80,
            ipa: row.ipaGrade ?? 80,
            ips: row.ipsGrade ?? 80,
          },
          attendanceStatus: 'hadir',
          attendanceNote: '',
        };
        baseList.push(newStudent);
      }
    });

    // Re-index 'no' field sequentially
    const finalStudents = baseList.map((st, idx) => ({ ...st, no: idx + 1 }));

    onImport(finalStudents, importMode === 'replace');
    onClose();
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'No': 1,
        'NIS / NISN': '6001',
        'Nama Siswa': 'Aditya Pratama',
        'Nama Orang Tua / Wali': 'Budi Pratama',
        'No HP Orang Tua': '0812-3456-7890',
        'Nilai Matematika': 88,
        'Nilai Bahasa Indonesia': 90,
        'Nilai IPA': 85,
        'Nilai IPS': 84,
      },
      {
        'No': 2,
        'NIS / NISN': '6002',
        'Nama Siswa': 'Annisa Rahmawati',
        'Nama Orang Tua / Wali': 'Rahmat Hidayat',
        'No HP Orang Tua': '0813-9876-5432',
        'Nilai Matematika': 95,
        'Nilai Bahasa Indonesia': 92,
        'Nilai IPA': 91,
        'Nilai IPS': 89,
      },
      {
        'No': 3,
        'NIS / NISN': '6003',
        'Nama Siswa': 'Bagas Saputra',
        'Nama Orang Tua / Wali': 'Bambang Saputra',
        'No HP Orang Tua': '0815-1122-3344',
        'Nilai Matematika': 78,
        'Nilai Bahasa Indonesia': 82,
        'Nilai IPA': 80,
        'Nilai IPS': 79,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 15 }, // NIS
      { wch: 28 }, // Nama Siswa
      { wch: 24 }, // Orang Tua
      { wch: 18 }, // No HP
      { wch: 18 }, // MTK
      { wch: 22 }, // IND
      { wch: 14 }, // IPA
      { wch: 14 }, // IPS
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Siswa');

    XLSX.writeFile(workbook, 'Template_Impor_Daftar_Siswa.xlsx');
  };

  // Export Current Students to Excel
  const handleExportStudents = () => {
    const exportData = currentStudents.map((st, index) => ({
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

    XLSX.writeFile(workbook, `Ekspor_Daftar_Siswa_${Date.now()}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-[32px] max-w-2xl w-full p-6 shadow-2xl border border-slate-800 text-white animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2.5 rounded-2xl border border-rose-500/20">
              upload_file
            </span>
            <div>
              <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
                Impor Data Siswa Dari Excel
              </h3>
              <p className="text-xs text-slate-400">
                Unggah file .xlsx / .csv berisi daftar nama siswa, ID/NIS, kontak orang tua, dan nilai.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-xl p-1 hover:bg-slate-800 cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-1 space-y-6 overflow-y-auto flex-1 my-4">
          {/* Action Bar */}
          <div className="flex flex-wrap gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Unduh Template Excel Siswa (.xlsx)
            </button>
            <button
              onClick={handleExportStudents}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">output</span>
              Ekspor Data Siswa Saat Ini
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
              isDragOver
                ? 'border-rose-400 bg-rose-500/10'
                : file
                ? 'border-rose-500/50 bg-slate-950'
                : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
            }`}
          >
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <span className="material-symbols-outlined text-4xl text-rose-400">
                {file ? 'person_check' : 'cloud_upload'}
              </span>
              <p className="text-sm font-bold text-white">
                {file ? file.name : 'Tarik & Lepas File Excel (.xlsx / .csv) di Sini'}
              </p>
              <p className="text-xs text-slate-400">
                {file
                  ? `Ukuran: ${(file.size / 1024).toFixed(1)} KB`
                  : 'Atau klik di sini untuk mencari file dari komputer'}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {errorMsg}
            </div>
          )}

          {/* Preview Parsed Data */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-400 text-[18px]">
                      groups
                    </span>
                    Hasil Penjelajahan Data Siswa
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ditemukan <strong className="text-rose-400">{parsedRows.length}</strong> data siswa siap diimpor.
                  </p>
                </div>

                {/* Import Mode Radio */}
                <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      importMode === 'merge'
                        ? 'bg-rose-500 text-white font-black shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Gabungkan (Merge)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      importMode === 'replace'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Ganti Semua
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">NIS</th>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5">Orang Tua / Wali</th>
                      <th className="p-2.5">No HP</th>
                      <th className="p-2.5 text-center">Rata-Rata Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {parsedRows.slice(0, 15).map((r, i) => {
                      const avg = (
                        ((r.mathGrade || 80) +
                          (r.indonesiaGrade || 80) +
                          (r.ipaGrade || 80) +
                          (r.ipsGrade || 80)) /
                        4
                      ).toFixed(1);

                      return (
                        <tr key={i} className="hover:bg-slate-900/60">
                          <td className="p-2.5 font-mono text-rose-400 font-bold whitespace-nowrap">
                            {r.studentId}
                          </td>
                          <td className="p-2.5 font-bold text-white whitespace-nowrap">
                            {r.name}
                          </td>
                          <td className="p-2.5 text-slate-300 whitespace-nowrap">
                            {r.parentName || '-'}
                          </td>
                          <td className="p-2.5 font-mono text-slate-400 whitespace-nowrap">
                            {r.parentPhone || '-'}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-400">
                            {avg}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsedRows.length > 15 && (
                  <p className="p-2 text-center text-slate-500 italic text-[11px] bg-slate-900">
                    ...dan {parsedRows.length - 15} data siswa lainnya.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 font-bold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0}
            onClick={handleConfirmImport}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
              parsedRows.length > 0
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Impor {parsedRows.length} Data Siswa
          </button>
        </div>
      </div>
    </div>
  );
};
