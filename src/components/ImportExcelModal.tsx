import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { SubjectItem, LingkupMateri, TujuanPembelajaran } from '../types';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedSubjects: SubjectItem[], replace: boolean) => void;
  currentSubjects: SubjectItem[];
}

interface ParsedRow {
  subjectName: string;
  subjectCode: string;
  lmCode: string;
  lmTitle: string;
  tpCode: string;
  tpDescription: string;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentSubjects,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Excel/CSV file reading
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

        // Convert sheet to json rows
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setErrorMsg('File Excel / CSV kosong atau format tidak sesuai.');
          setParsedRows([]);
          return;
        }

        const rows: ParsedRow[] = [];

        rawJson.forEach((row) => {
          // Flexible key matching (case insensitive)
          const findVal = (keys: string[]) => {
            for (const k of Object.keys(row)) {
              const cleanK = k.trim().toLowerCase();
              if (keys.some((target) => cleanK.includes(target))) {
                return String(row[k]).trim();
              }
            }
            return '';
          };

          const subjectName =
            findVal(['nama mata pelajaran', 'mata pelajaran', 'mapel', 'subject']) || 'Umum';
          const subjectCode =
            findVal(['kode mapel', 'kode mata pelajaran', 'code_mapel', 'code']) ||
            subjectName.substring(0, 3).toUpperCase();
          const lmCode =
            findVal(['kode lingkup materi', 'kode lm', 'kode bab', 'lm_code', 'lm']) || 'LM 1';
          const lmTitle =
            findVal(['judul lingkup materi', 'lingkup materi', 'judul bab', 'bab', 'lm_title']) ||
            'Materi Utama';
          const tpCode =
            findVal(['kode tp', 'kode tujuan', 'tp_code', 'tp']) || 'TP 1.1';
          const tpDescription =
            findVal(['deskripsi tp', 'deskripsi', 'tujuan pembelajaran', 'tp_desc', 'uraian tp']) ||
            'Deskripsi Tujuan Pembelajaran';

          if (subjectName || lmTitle || tpDescription) {
            rows.push({
              subjectName,
              subjectCode,
              lmCode,
              lmTitle,
              tpCode,
              tpDescription,
            });
          }
        });

        if (rows.length === 0) {
          setErrorMsg('Tidak dapat membaca data TP/Lingkup Materi dari file. Pastikan menggunakan template yang disediakan.');
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

  // Convert parsed rows into SubjectItem structure
  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;

    // Map to construct structured subjects
    const subjectMap: { [key: string]: SubjectItem } = {};

    // If merging, pre-populate with existing subjects
    if (importMode === 'merge') {
      currentSubjects.forEach((sub) => {
        // Deep copy existing subject
        subjectMap[sub.name.toLowerCase()] = JSON.parse(JSON.stringify(sub));
      });
    }

    parsedRows.forEach((row) => {
      const subKey = row.subjectName.toLowerCase();

      if (!subjectMap[subKey]) {
        subjectMap[subKey] = {
          id: row.subjectName.toLowerCase().replace(/\s+/g, '_') + `_${Date.now()}`,
          code: row.subjectCode || row.subjectName.substring(0, 3).toUpperCase(),
          name: row.subjectName,
          icon: 'school',
          color: 'rose',
          lingkupMateriList: [],
        };
      }

      const subject = subjectMap[subKey];

      // Check if LM exists
      let lm = subject.lingkupMateriList.find(
        (l) => l.code.toLowerCase() === row.lmCode.toLowerCase() || l.title.toLowerCase() === row.lmTitle.toLowerCase()
      );

      if (!lm) {
        lm = {
          id: `lm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          code: row.lmCode,
          title: row.lmTitle,
          tpList: [],
        };
        subject.lingkupMateriList.push(lm);
      }

      // Check if TP exists in LM
      const tpExists = lm.tpList.some(
        (t) => t.code.toLowerCase() === row.tpCode.toLowerCase() && t.description === row.tpDescription
      );

      if (!tpExists && row.tpDescription) {
        const tp: TujuanPembelajaran = {
          id: `tp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          code: row.tpCode,
          description: row.tpDescription,
        };
        lm.tpList.push(tp);
      }
    });

    const resultSubjects = Object.values(subjectMap);
    onImport(resultSubjects, importMode === 'replace');
    onClose();
  };

  // Download Excel Template function
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Mata Pelajaran': 'Matematika',
        'Kode Mapel': 'MTK',
        'Kode Lingkup Materi': 'LM 1',
        'Judul Lingkup Materi': 'Pecahan dan Desimal',
        'Kode TP': 'TP 1.1',
        'Deskripsi TP': 'Membandingkan dan mengurutkan pecahan biasa dan pecahan campuran.',
      },
      {
        'Mata Pelajaran': 'Matematika',
        'Kode Mapel': 'MTK',
        'Kode Lingkup Materi': 'LM 1',
        'Judul Lingkup Materi': 'Pecahan dan Desimal',
        'Kode TP': 'TP 1.2',
        'Deskripsi TP': 'Mengubah bentuk pecahan biasa menjadi desimal dan persen.',
      },
      {
        'Mata Pelajaran': 'Matematika',
        'Kode Mapel': 'MTK',
        'Kode Lingkup Materi': 'LM 2',
        'Judul Lingkup Materi': 'Geometri Bangun Datar',
        'Kode TP': 'TP 2.1',
        'Deskripsi TP': 'Menghitung keliling dan luas bangun datar segi banyak teratur.',
      },
      {
        'Mata Pelajaran': 'Bahasa Indonesia',
        'Kode Mapel': 'BIN',
        'Kode Lingkup Materi': 'LM 1',
        'Judul Lingkup Materi': 'Teks Deskripsi dan Narasi',
        'Kode TP': 'TP 1.1',
        'Deskripsi TP': 'Menganalisis ide pokok dan gagasan pendukung pada teks narasi.',
      },
      {
        'Mata Pelajaran': 'IPA (Sains)',
        'Kode Mapel': 'IPA',
        'Kode Lingkup Materi': 'LM 1',
        'Judul Lingkup Materi': 'Sistem Organ Manusia',
        'Kode TP': 'TP 1.1',
        'Deskripsi TP': 'Menganalisis hubungan antara struktur organ pencernaan dan fungsinya.',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Mapel
      { wch: 12 }, // Kode Mapel
      { wch: 22 }, // Kode LM
      { wch: 30 }, // Judul LM
      { wch: 12 }, // Kode TP
      { wch: 55 }, // Deskripsi TP
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template TP Kurikulum');

    XLSX.writeFile(workbook, 'Template_Impor_TP_Kurikulum_Merdeka.xlsx');
  };

  // Export current curriculum to Excel
  const handleExportCurrentCurriculum = () => {
    const exportRows: any[] = [];

    currentSubjects.forEach((sub) => {
      if (sub.lingkupMateriList.length === 0) {
        exportRows.push({
          'Mata Pelajaran': sub.name,
          'Kode Mapel': sub.code,
          'Kode Lingkup Materi': '-',
          'Judul Lingkup Materi': '-',
          'Kode TP': '-',
          'Deskripsi TP': '-',
        });
      } else {
        sub.lingkupMateriList.forEach((lm) => {
          if (lm.tpList.length === 0) {
            exportRows.push({
              'Mata Pelajaran': sub.name,
              'Kode Mapel': sub.code,
              'Kode Lingkup Materi': lm.code,
              'Judul Lingkup Materi': lm.title,
              'Kode TP': '-',
              'Deskripsi TP': '-',
            });
          } else {
            lm.tpList.forEach((tp) => {
              exportRows.push({
                'Mata Pelajaran': sub.name,
                'Kode Mapel': sub.code,
                'Kode Lingkup Materi': lm.code,
                'Judul Lingkup Materi': lm.title,
                'Kode TP': tp.code,
                'Deskripsi TP': tp.description,
              });
            });
          }
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 22 },
      { wch: 30 },
      { wch: 12 },
      { wch: 55 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Kurikulum & TP');

    XLSX.writeFile(workbook, `Ekspor_Kurikulum_MataPelajaran_${Date.now()}.xlsx`);
  };

  // Count unique subjects, LMs, TPs parsed
  const uniqueSubjects = Array.from(new Set(parsedRows.map((r) => r.subjectName)));

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-[32px] max-w-2xl w-full p-6 shadow-2xl border border-slate-800 text-white animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-400 bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20">
              file_upload
            </span>
            <div>
              <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
                Impor Data TP & Lingkup Materi Excel
              </h3>
              <p className="text-xs text-slate-400">
                Unggah file .xlsx / .csv berisi Mata Pelajaran, Lingkup Materi (Bab), dan Tujuan Pembelajaran.
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
          {/* Action Bar: Download Template & Export */}
          <div className="flex flex-wrap gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Unduh Template Excel (.xlsx)
            </button>
            <button
              onClick={handleExportCurrentCurriculum}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">export_notes</span>
              Ekspor Kurikulum Saat Ini
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
              isDragOver
                ? 'border-emerald-400 bg-emerald-500/10'
                : file
                ? 'border-emerald-500/50 bg-slate-950'
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
              <span className="material-symbols-outlined text-4xl text-emerald-400">
                {file ? 'task_check' : 'cloud_upload'}
              </span>
              <p className="text-sm font-bold text-white">
                {file ? file.name : 'Tarik & Lepas File Excel (.xlsx / .csv) di Sini'}
              </p>
              <p className="text-xs text-slate-400">
                {file
                  ? `Ukuran: ${(file.size / 1024).toFixed(1)} KB`
                  : 'Atau klik untuk memilih file dari komputer Anda'}
              </p>
            </div>
          </div>

          {/* Error Message */}
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
                    <span className="material-symbols-outlined text-emerald-400 text-[18px]">
                      checklist
                    </span>
                    Hasil Penjelajahan Excel
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ditemukan <strong className="text-emerald-400">{parsedRows.length}</strong> baris TP di bawah <strong className="text-white">{uniqueSubjects.length}</strong> Mata Pelajaran ({uniqueSubjects.join(', ')}).
                  </p>
                </div>

                {/* Import Mode Radio */}
                <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      importMode === 'merge'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
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
                        ? 'bg-rose-500 text-white font-black shadow-md'
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
                      <th className="p-2.5">Mata Pelajaran</th>
                      <th className="p-2.5">Lingkup Materi</th>
                      <th className="p-2.5">Kode TP</th>
                      <th className="p-2.5">Deskripsi TP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {parsedRows.slice(0, 15).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-900/60">
                        <td className="p-2.5 font-bold text-rose-400 whitespace-nowrap">
                          {r.subjectName} ({r.subjectCode})
                        </td>
                        <td className="p-2.5 text-slate-300 whitespace-nowrap font-medium">
                          <span className="text-amber-400 font-mono mr-1">{r.lmCode}:</span>
                          {r.lmTitle}
                        </td>
                        <td className="p-2.5 font-mono text-emerald-400 font-bold whitespace-nowrap">
                          {r.tpCode}
                        </td>
                        <td className="p-2.5 text-slate-300 truncate max-w-[200px]">
                          {r.tpDescription}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 15 && (
                  <p className="p-2 text-center text-slate-500 italic text-[11px] bg-slate-900">
                    ...dan {parsedRows.length - 15} baris TP lainnya.
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
                ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Impor {parsedRows.length} Data Ke Kurikulum
          </button>
        </div>
      </div>
    </div>
  );
};
