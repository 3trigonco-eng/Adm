export type PageView = 'dashboard' | 'grades' | 'attendance' | 'reports' | 'students' | 'curriculum';

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';

export interface TujuanPembelajaran {
  id: string;
  code: string; // e.g. 'TP 1.1'
  description: string; // e.g. 'Membandingkan dan mengurutkan pecahan'
}

export interface LingkupMateri {
  id: string;
  code: string; // e.g. 'LM 1'
  title: string; // e.g. 'Pecahan dan Desimal'
  tpList: TujuanPembelajaran[];
}

export interface SubjectItem {
  id: string; // e.g. 'matematika'
  code: string; // e.g. 'MTK'
  name: string; // e.g. 'Matematika'
  icon: string; // material symbol icon name
  color: string;
  lingkupMateriList: LingkupMateri[];
}

export interface SubjectGrade {
  subjectId: string;
  subjectName: string;
  score: number;
}

export interface StudentGradeRecord {
  id: string;
  no: number;
  initials: string;
  name: string;
  studentId: string;
  avatarBg?: string;
  avatarTextBg?: string;
  grades: {
    matematika: number;
    indonesia: number;
    ipa: number;
    ips: number;
    [customSubject: string]: number;
  };
  tpGrades?: {
    [tpId: string]: number;
  };
  attendanceStatus: AttendanceStatus;
  attendanceNote?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
}

export interface TaskToGrade {
  id: string;
  title: string;
  subject: string;
  subjectColor: string; // e.g. 'matematika', 'sains', 'sejarah'
  lingkupMateriId?: string;
  tpId?: string;
  submittedTime: string;
  studentName?: string;
  score?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  time: string;
  read: boolean;
  type: 'submission' | 'alert' | 'system';
}

export interface AssessmentCycle {
  id: string;
  name: string;
}

export interface ClassRoom {
  id: string;
  name: string;
}

export interface TeacherProfile {
  name: string;
  nip: string;
  role: string;
  school: string;
  email: string;
  phone: string;
  profilePhoto: string;
  avatarPhoto?: string;
}

