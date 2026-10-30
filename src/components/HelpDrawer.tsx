import React from 'react';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex justify-end">
      <div className="bg-slate-900 w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200 text-white border-l border-slate-800">
        <div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
                help
              </span>
              <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
                Bantuan & Panduan
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white rounded-xl p-1 hover:bg-slate-800 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-6 text-sm text-slate-300">
            {/* Feature 1 */}
            <div className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="flex items-center gap-2 font-bold text-rose-400 mb-2">
                <span className="material-symbols-outlined text-[20px]">
                  grade
                </span>
                Gradebook & Perhitungan Rata-rata
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Setiap perubahan nilai di kolom Matematika, B. Indonesia, IPA, atau IPS akan langsung memperbarui rata-rata siswa secara otomatis. Warna indikator (Hijau, Kuning, Merah) menyesuaikan ambang batas performa siswa.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="flex items-center gap-2 font-bold text-rose-400 mb-2">
                <span className="material-symbols-outlined text-[20px]">
                  calendar_today
                </span>
                Presensi Siswa & Ringkasan Grafik
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Pilih status (Hadir, Izin, Sakit, Alpa) untuk setiap siswa. Tombol <b className="text-white">Mark All Present</b> membantu pengisian cepat. Ringkasan Donut Chart dan persentase kehadiran akan ter-update secara real-time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="flex items-center gap-2 font-bold text-rose-400 mb-2">
                <span className="material-symbols-outlined text-[20px]">
                  dashboard
                </span>
                Ringkasan Kelas & Penilaian Tugas
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Pantau grafik perkembangan mingguan, statistik rata-rata kelas, dan beri nilai tugas langsung dari widget <i className="text-slate-300">Tugas Perlu Dinilai</i>.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-500/20 transition-all cursor-pointer active:scale-95"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
