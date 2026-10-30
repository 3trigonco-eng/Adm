import { StudentGradeRecord, TaskToGrade, NotificationItem, TeacherProfile } from '../types';

export const INITIAL_TEACHER_PROFILE: TeacherProfile = {
  name: 'Ibu Rahmawati, S.Pd.',
  nip: '19850412 201001 2 015',
  role: 'Wali Kelas & Guru Matematika 6A',
  school: 'SD Negeri Harapan Bangsa',
  email: 'rahmawati@sdharapanbangsa.sch.id',
  phone: '0812-3456-7890',
  profilePhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHq41aqbdY9CHKrStBeth9s9RbT5VAFtmmyAkHExomkd2z0kmKlJmYm3jHePKRDAo6Xo8qawCZNINWUDU4WXiRpeqlCG7piCSistQUzpFxEMVgSL5OWTUxbnBwR7Tw-V2ZplX-Eg1gEM8WSp88ldAI3xh1H_i-w-uFv2DE0Al0DHn_Iew0zsrJTNqYz9SQpJ99K-TewXDzrKvENHnamKuZ6NUFEJ4b1qcIIRQmqrezs02TG0O8STsh',
  avatarPhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkCqwTwrghV13i2X2sDfiP_UmfL0rFf5SWP5Actnv9COn1gVGWU0wz6-0a0wWAyeVSqu1j1aQDXY6xNLfTpOznOeW_7lQTpOznOeW_7lQTpHrZ8dPwEUxd-SnHaA4ba7k43SGgIpy8x7ESdKMT_vYJ2_yMxD4jA6N_X3L3zhd5azxlT21lDDWUhgjp2kN9P6uvlINctvCnSBMeXtwCf8_zcc0Oo-tZrGW-G0zRmKuPJzae_tQtri3qv5a27LIVCRGI'
};

export const TEACHER_INFO = INITIAL_TEACHER_PROFILE;

export const INITIAL_STUDENTS: StudentGradeRecord[] = [
  {
    id: 's1',
    no: 1,
    initials: 'AA',
    name: 'Ahmad Arif',
    studentId: '6018',
    grades: {
      matematika: 85,
      indonesia: 92,
      ipa: 78,
      ips: 88,
    },
    attendanceStatus: 'hadir',
    attendanceNote: '',
    parentName: 'Rahmat Arif',
    parentPhone: '0812-3456-7890'
  },
  {
    id: 's2',
    no: 2,
    initials: 'BS',
    name: 'Budi Santoso',
    studentId: '6019',
    grades: {
      matematika: 65,
      indonesia: 75,
      ipa: 70,
      ips: 82,
    },
    attendanceStatus: 'hadir',
    attendanceNote: '',
    parentName: 'Bambang Santoso',
    parentPhone: '0813-9876-5432'
  },
  {
    id: 's3',
    no: 3,
    initials: 'CD',
    name: 'Citra Dewi',
    studentId: '6020',
    grades: {
      matematika: 95,
      indonesia: 90,
      ipa: 98,
      ips: 92,
    },
    attendanceStatus: 'hadir',
    attendanceNote: '',
    parentName: 'Dewi Lestari',
    parentPhone: '0811-2233-4455'
  },
  {
    id: 's4',
    no: 4,
    initials: 'AL',
    name: 'Alexander, Liam',
    studentId: '6021',
    grades: {
      matematika: 88,
      indonesia: 85,
      ipa: 90,
      ips: 87,
    },
    attendanceStatus: 'hadir',
    attendanceNote: '',
    parentName: 'David Alexander',
    parentPhone: '0815-6677-8899'
  },
  {
    id: 's5',
    no: 5,
    initials: 'BC',
    name: 'Baker, Chloe',
    studentId: '6022',
    grades: {
      matematika: 78,
      indonesia: 82,
      ipa: 80,
      ips: 85,
    },
    attendanceStatus: 'sakit',
    attendanceNote: "Surat dokter sudah diterima via WhatsApp dari Ibu Chloe.",
    parentName: 'Sarah Baker',
    parentPhone: '0817-4455-6677'
  },
  {
    id: 's6',
    no: 6,
    initials: 'DJ',
    name: 'Davis, James',
    studentId: '6023',
    grades: {
      matematika: 90,
      indonesia: 88,
      ipa: 92,
      ips: 89,
    },
    attendanceStatus: 'hadir',
    attendanceNote: '',
    parentName: 'Robert Davis',
    parentPhone: '0819-3344-5566'
  },
  {
    id: 's7',
    no: 7,
    initials: 'EM',
    name: 'Evans, Mia',
    studentId: '6024',
    grades: {
      matematika: 60,
      indonesia: 72,
      ipa: 68,
      ips: 70,
    },
    attendanceStatus: 'alpa',
    attendanceNote: 'Belum ada konfirmasi orang tua.',
    parentName: 'Mark Evans',
    parentPhone: '0812-7788-9900'
  },
  {
    id: 's8',
    no: 8,
    initials: 'FI',
    name: 'Farhan Ibrahim',
    studentId: '6025',
    grades: {
      matematika: 82,
      indonesia: 88,
      ipa: 84,
      ips: 86,
    },
    attendanceStatus: 'hadir',
    attendanceNote: '',
    parentName: 'Ibrahim Malik',
    parentPhone: '0818-1122-3344'
  },
  {
    id: 's9',
    no: 9,
    initials: 'GP',
    name: 'Grace Putri',
    studentId: '6026',
    grades: {
      matematika: 91,
      indonesia: 94,
      ipa: 89,
      ips: 90,
    },
    attendanceStatus: 'izin',
    attendanceNote: 'Izin lomba sains antar sekolah.',
    parentName: 'Hendra Putri',
    parentPhone: '0816-5544-3322'
  },
  {
    id: 's10',
    no: 10,
    initials: 'HR',
    name: 'Hendra Ramadhan',
    studentId: '6027',
    grades: {
      matematika: 75,
      indonesia: 80,
      ipa: 76,
      ips: 78,
    },
    attendanceStatus: 'hadir',
    attendanceNote: '',
    parentName: 'Ramadhan Kurnia',
    parentPhone: '0813-2211-0099'
  }
];

export const INITIAL_TASKS: TaskToGrade[] = [
  {
    id: 't1',
    title: 'Kuis Aljabar Dasar',
    subject: 'Matematika',
    subjectColor: 'bg-[#d7e2ff] text-[#004491]',
    submittedTime: 'Diserahkan 2j lalu',
  },
  {
    id: 't2',
    title: 'Proyek Sains: Tata Surya',
    subject: 'Sains',
    subjectColor: 'bg-[#66df75]/30 text-[#00531a]',
    submittedTime: 'Diserahkan 5j lalu',
  },
  {
    id: 't3',
    title: 'Esai Sejarah Kuno',
    subject: 'Sejarah',
    subjectColor: 'bg-[#ffdfa0] text-[#5c4300]',
    submittedTime: 'Diserahkan 1h lalu',
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Kuis Aljabar Dasar diserahkan oleh 5 siswa baru',
    time: '10 menit lalu',
    read: false,
    type: 'submission'
  },
  {
    id: 'n2',
    title: 'Kehadiran kelas 6A hari ini telah diperbarui (96%)',
    time: '1 jam lalu',
    read: false,
    type: 'alert'
  },
  {
    id: 'n3',
    title: 'Pengingat: Batas waktu pengisian nilai Siklus 1',
    time: 'Kemarin',
    read: true,
    type: 'system'
  }
];
