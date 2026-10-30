import { SubjectItem } from '../types';

export const INITIAL_SUBJECTS: SubjectItem[] = [
  {
    id: 'matematika',
    code: 'MTK',
    name: 'Matematika',
    icon: 'calculate',
    color: 'emerald',
    lingkupMateriList: [
      {
        id: 'lm_mtk_1',
        code: 'LM 1',
        title: 'Pecahan, Desimal, dan Persen',
        tpList: [
          {
            id: 'tp_mtk_1_1',
            code: 'TP 1.1',
            description: 'Membandingkan, mengurutkan, dan menyederhanakan pecahan biasa & campuran.',
          },
          {
            id: 'tp_mtk_1_2',
            code: 'TP 1.2',
            description: 'Melakukan operasi hitung perkalian dan pembagian pecahan dengan desimal.',
          },
          {
            id: 'tp_mtk_1_3',
            code: 'TP 1.3',
            description: 'Menyelesaikan masalah kontekstual yang melibatkan rasio dan persentase.',
          },
        ],
      },
      {
        id: 'lm_mtk_2',
        code: 'LM 2',
        title: 'Bangun Ruang dan Geometri',
        tpList: [
          {
            id: 'tp_mtk_2_1',
            code: 'TP 2.1',
            description: 'Mengidentifikasi jaring-jaring dan sifat-sifat kubus, balok, dan prisma.',
          },
          {
            id: 'tp_mtk_2_2',
            code: 'TP 2.2',
            description: 'Menghitung luas permukaan dan volume bangun ruang gabungan.',
          },
        ],
      },
    ],
  },
  {
    id: 'indonesia',
    code: 'BIN',
    name: 'Bahasa Indonesia',
    icon: 'menu_book',
    color: 'indigo',
    lingkupMateriList: [
      {
        id: 'lm_bin_1',
        code: 'LM 1',
        title: 'Teks Eksplanasi Ilmiah & Deskripsi',
        tpList: [
          {
            id: 'tp_bin_1_1',
            code: 'TP 1.1',
            description: 'Identifikasi gagasan pokok dan informasi penting teks eksplanasi ilmiah.',
          },
          {
            id: 'tp_bin_1_2',
            code: 'TP 1.2',
            description: 'Menyusun ringkasan teks ilmiah secara sistematis menggunakan bahasa sendiri.',
          },
        ],
      },
      {
        id: 'lm_bin_2',
        code: 'LM 2',
        title: 'Formulir Pendaftaran & Surat Resmi',
        tpList: [
          {
            id: 'tp_bin_2_1',
            code: 'TP 2.1',
            description: 'Mengisi teks formulir pendaftaran, slip penarikan, dan lembar jawaban komputer.',
          },
          {
            id: 'tp_bin_2_2',
            code: 'TP 2.2',
            description: 'Menulis surat undangan resmi dengan tata bahasa dan ejaan yang tepat.',
          },
        ],
      },
    ],
  },
  {
    id: 'ipa',
    code: 'IPA',
    name: 'Ilmu Pengetahuan Alam',
    icon: 'science',
    color: 'amber',
    lingkupMateriList: [
      {
        id: 'lm_ipa_1',
        code: 'LM 1',
        title: 'Sistem Organ & Kelangsungan Makhluk Hidup',
        tpList: [
          {
            id: 'tp_ipa_1_1',
            code: 'TP 1.1',
            description: 'Menganalisis sistem pernapasan dan pencernaan pada manusia serta gangguannya.',
          },
          {
            id: 'tp_ipa_1_2',
            code: 'TP 1.2',
            description: 'Mengidentifikasi cara perkembangbiakan tumbuhan dan hewan secara vegetatif & generatif.',
          },
        ],
      },
      {
        id: 'lm_ipa_2',
        code: 'LM 2',
        title: 'Rangkaian Listrik dan Kemagnetan',
        tpList: [
          {
            id: 'tp_ipa_2_1',
            code: 'TP 2.1',
            description: 'Membuat dan membedakan komponen serta karakteristik rangkaian listrik seri & paralel.',
          },
          {
            id: 'tp_ipa_2_2',
            code: 'TP 2.2',
            description: 'Menganalisis sifat-sifat magnet dan cara pembuatan magnet buatan.',
          },
        ],
      },
    ],
  },
  {
    id: 'ips',
    code: 'IPS',
    name: 'Ilmu Pengetahuan Sosial',
    icon: 'public',
    color: 'rose',
    lingkupMateriList: [
      {
        id: 'lm_ips_1',
        code: 'LM 1',
        title: 'Karakteristik Geografis & Peran ASEAN',
        tpList: [
          {
            id: 'tp_ips_1_1',
            code: 'TP 1.1',
            description: 'Mengidentifikasi posisi geografis dan kondisi sosial budaya negara-negara anggota ASEAN.',
          },
          {
            id: 'tp_ips_1_2',
            code: 'TP 1.2',
            description: 'Menganalisis peran Indonesia dalam kerja sama bidang ekonomi & politik di ASEAN.',
          },
        ],
      },
      {
        id: 'lm_ips_2',
        code: 'LM 2',
        title: 'Perubahan Sosial Budaya & Modernisasi',
        tpList: [
          {
            id: 'tp_ips_2_1',
            code: 'TP 2.1',
            description: 'Memahami dampak perubahan sosial budaya dalam rangka modernisasi bangsa Indonesia.',
          },
        ],
      },
    ],
  },
];

// Initial TP Scores for students (so the table is pre-filled with realistic sample grades)
export const INITIAL_TP_GRADES: { [studentId: string]: { [tpId: string]: number } } = {
  s1: {
    tp_mtk_1_1: 88,
    tp_mtk_1_2: 82,
    tp_mtk_1_3: 85,
    tp_mtk_2_1: 90,
    tp_mtk_2_2: 80,
    tp_bin_1_1: 94,
    tp_bin_1_2: 90,
    tp_bin_2_1: 92,
    tp_bin_2_2: 92,
    tp_ipa_1_1: 80,
    tp_ipa_1_2: 76,
    tp_ipa_2_1: 82,
    tp_ipa_2_2: 74,
    tp_ips_1_1: 90,
    tp_ips_1_2: 86,
    tp_ips_2_1: 88,
  },
  s2: {
    tp_mtk_1_1: 65,
    tp_mtk_1_2: 60,
    tp_mtk_1_3: 70,
    tp_mtk_2_1: 62,
    tp_mtk_2_2: 68,
    tp_bin_1_1: 76,
    tp_bin_1_2: 74,
    tp_bin_2_1: 78,
    tp_bin_2_2: 72,
    tp_ipa_1_1: 72,
    tp_ipa_1_2: 68,
    tp_ipa_2_1: 70,
    tp_ipa_2_2: 70,
    tp_ips_1_1: 84,
    tp_ips_1_2: 80,
    tp_ips_2_1: 82,
  },
  s3: {
    tp_mtk_1_1: 96,
    tp_mtk_1_2: 94,
    tp_mtk_1_3: 95,
    tp_mtk_2_1: 98,
    tp_mtk_2_2: 92,
    tp_bin_1_1: 90,
    tp_bin_1_2: 90,
    tp_bin_2_1: 92,
    tp_bin_2_2: 88,
    tp_ipa_1_1: 100,
    tp_ipa_1_2: 96,
    tp_ipa_2_1: 98,
    tp_ipa_2_2: 98,
    tp_ips_1_1: 94,
    tp_ips_1_2: 90,
    tp_ips_2_1: 92,
  },
};
