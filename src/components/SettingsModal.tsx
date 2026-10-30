import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  passingThreshold: number;
  setPassingThreshold: (val: number) => void;
  classNameTitle: string;
  setClassNameTitle: (name: string) => void;
  onOpenEditProfile?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  passingThreshold,
  setPassingThreshold,
  classNameTitle,
  setClassNameTitle,
  onOpenEditProfile,
}) => {
  const [tempThreshold, setTempThreshold] = useState(passingThreshold);
  const [tempClassName, setTempClassName] = useState(classNameTitle);

  if (!isOpen) return null;

  const handleSave = () => {
    setPassingThreshold(tempThreshold);
    setClassNameTitle(tempClassName);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-200 text-white">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
              settings
            </span>
            <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
              Pengaturan Kelas & Nilai
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
          {onOpenEditProfile && (
            <div className="p-3.5 bg-slate-800/80 border border-slate-700/70 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <span className="material-symbols-outlined text-lg">badge</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Profil & NIP Guru</h4>
                  <p className="text-[11px] text-slate-400">Ubah nama, NIP, jabatan, dan foto profil</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditProfile();
                }}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Edit
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Nama Kelas
            </label>
            <input
              type="text"
              value={tempClassName}
              onChange={(e) => setTempClassName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Ambang Batas Nilai Baik (Hijau)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="60"
                max="90"
                value={tempThreshold}
                onChange={(e) => setTempThreshold(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="font-mono text-base font-black text-rose-400 w-8">
                {tempThreshold}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Skor &gt; {tempThreshold} (Hijau Sangat Baik), {tempThreshold - 10}–{tempThreshold} (Kuning Cukup), &lt; {tempThreshold - 10} (Merah Perlu Bimbingan).
            </p>
          </div>

          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 text-xs space-y-2 text-slate-300">
            <p className="font-bold text-white uppercase tracking-wider text-[10px]">Indikator Warna Status:</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Sangat Baik (&gt; {tempThreshold})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span>Cukup ({tempThreshold - 10}–{tempThreshold})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Perlu Perhatian (&lt; {tempThreshold - 10})</span>
            </div>
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
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
};
