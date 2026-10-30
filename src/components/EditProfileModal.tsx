import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TeacherProfile } from '../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherProfile: TeacherProfile;
  onSaveProfile: (updated: TeacherProfile) => void;
}

const AVATAR_PRESETS = [
  {
    name: 'Ibu Guru Formal',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHq41aqbdY9CHKrStBeth9s9RbT5VAFtmmyAkHExomkd2z0kmKlJmYm3jHePKRDAo6Xo8qawCZNINWUDU4WXiRpeqlCG7piCSistQUzpFxEMVgSL5OWTUxbnBwR7Tw-V2ZplX-Eg1gEM8WSp88ldAI3xh1H_i-w-uFv2DE0Al0DHn_Iew0zsrJTNqYz9SQpJ99K-TewXDzrKvENHnamKuZ6NUFEJ4b1qcIIRQmqrezs02TG0O8STsh',
  },
  {
    name: 'Ibu Guru Hijab',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
  },
  {
    name: 'Pak Guru Formal',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
  },
  {
    name: 'Guru Muda Minimalis',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
  },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  teacherProfile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<TeacherProfile>(teacherProfile);

  useEffect(() => {
    setFormData(teacherProfile);
  }, [teacherProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-white"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">badge</span>
              </div>
              <div>
                <h3 className="font-['Hanken_Grotesk'] text-xl font-black text-white">
                  Edit Profil Guru & Wali Kelas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Perbarui identitas, NIP, kontak, dan foto profil Anda. Informasi ini akan tercantum di dokumen Rapor.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
            {/* Live Profile Card Preview */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <img
                  src={formData.profilePhoto || teacherProfile.profilePhoto}
                  alt="Preview Profil"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500 shadow-md"
                  onError={(e) => {
                    // Fallback on broken image
                    (e.target as HTMLImageElement).src = teacherProfile.profilePhoto;
                  }}
                />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-slate-950" />
              </div>

              <div className="text-center sm:text-left flex-1">
                <h4 className="text-base font-black text-white">{formData.name || 'Nama Guru'}</h4>
                <p className="text-xs font-bold text-rose-400 mt-0.5">{formData.role || 'Jabatan Guru'}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] font-mono text-slate-400 mt-1.5">
                  <span>NIP: {formData.nip || '-'}</span>
                  <span>•</span>
                  <span>{formData.school || 'Sekolah'}</span>
                </div>
              </div>
            </div>

            {/* Avatar Photo Selection & Custom URL */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Foto Profil Guru
              </label>

              {/* Preset Avatar Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        profilePhoto: preset.url,
                        avatarPhoto: preset.url,
                      })
                    }
                    className={`p-2 rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                      formData.profilePhoto === preset.url
                        ? 'bg-rose-500/10 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-8 h-8 rounded-lg object-cover" />
                    <span className="text-[10px] font-bold truncate">{preset.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom Image URL */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Atau tautan URL foto kustom:
                </label>
                <input
                  type="url"
                  value={formData.profilePhoto}
                  onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value, avatarPhoto: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="mis. Ibu Rahmawati, S.Pd."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  NIP / NUPTK *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="19850412 201001 2 015"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Jabatan / Peran Mengajar *
                </label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="mis. Wali Kelas & Guru Matematika 6A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nama Sekolah / Satuan Pendidikan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  placeholder="mis. SD Negeri Harapan Bangsa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Email Resmi
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rahmawati@sdharapanbangsa.sch.id"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812-3456-7890"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-400 text-lg">info</span>
              <p className="text-[11px] text-amber-200 leading-relaxed font-medium">
                Data NIP dan Nama Guru ini akan otomatis disinkronkan ke lembar Rapor Siswa, tanda tangan PDF, dan lampiran evaluasi.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base">save</span>
                Simpan Perubahan Profil
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
