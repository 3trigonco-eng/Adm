import React, { useState, useMemo, useEffect } from 'react';
import { StudentGradeRecord, SubjectItem, TeacherProfile } from '../types';
import { INITIAL_SUBJECTS, INITIAL_TP_GRADES } from '../data/curriculumData';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  Cell,
} from 'recharts';

interface ReportsViewProps {
  students: StudentGradeRecord[];
  subjects?: SubjectItem[];
  tpGrades?: { [studentId: string]: { [tpId: string]: number } };
  passingThreshold?: number;
  classNameTitle?: string;
  teacherProfile?: TeacherProfile;
  onShowToast?: (msg: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  subjects,
  tpGrades,
  passingThreshold = 80,
  classNameTitle = 'Kelas 6A',
  teacherProfile,
  onShowToast,
}) => {
  const [chartType, setChartType] = useState<
    'subject_compare' | 'student_bar' | 'radar' | 'tp_difficulty'
  >('student_bar');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    students.slice(0, 4).map((s) => s.id)
  );

  const [selectedRaporStudentId, setSelectedRaporStudentId] = useState<string>(
    students[0]?.id || ''
  );

  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Student Personal Notes & Evaluation Comments State
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('student_personal_evaluation_notes_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    const initial: Record<string, string> = {};
    students.forEach((s) => {
      const avg = Number(
        ((s.grades.matematika + s.grades.indonesia + s.grades.ipa + s.grades.ips) / 4).toFixed(1)
      );
      if (s.notes) {
        initial[s.id] = s.notes;
      } else if (avg >= 85) {
        initial[s.id] =
          'Siswa sangat aktif, santun, dan menunjukkan kepemimpinan yang sangat baik di kelas. Pertahankan prestasi ini!';
      } else if (avg >= 75) {
        initial[s.id] =
          'Siswa memiliki pemahaman materi yang baik. Tingkatkan lagi ketelitian dalam mengerjakan soal latihan mandiri.';
      } else {
        initial[s.id] =
          'Siswa memerlukan bimbingan tambahan dan latihan mandiri di rumah. Disarankan mengikuti pendampingan remedial terbimbing.';
      }
    });
    return initial;
  });

  const handleSaveStudentNote = (studentId: string, noteText: string) => {
    const updated = { ...studentNotes, [studentId]: noteText };
    setStudentNotes(updated);
    localStorage.setItem('student_personal_evaluation_notes_v1', JSON.stringify(updated));
  };

  // Email Schedule Configuration State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState(() => {
    const saved = localStorage.getItem('parent_email_schedule_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore error
      }
    }
    return {
      enabled: true,
      dayOfWeek: 'Jumat',
      timeOfDay: '15:00',
      targetRecipients: 'all' as 'all' | 'remedial' | 'top',
      includePdf: true,
      includeExcel: false,
      includeSummaryText: true,
      subjectTemplate: '[SD Harapan Bangsa] Ringkasan Hasil Belajar Mingguan - {Nama Siswa}',
      customIntro:
        'Bapak/Ibu Wali Siswa yang terhormat, berikut kami sampaikan ringkasan performa akademik putra/putri Anda pekan ini. Mohon terus dampingi belajar di rumah.',
      lastSentDate: 'Jumat Lalu, 15:00 WIB',
    };
  });

  // Digital Signature Modal & Config State
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureConfig, setSignatureConfig] = useState(() => {
    const saved = localStorage.getItem('digital_signature_config_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (teacherProfile) {
          parsed.teacherName = teacherProfile.name || parsed.teacherName;
          parsed.teacherNip = teacherProfile.nip || parsed.teacherNip;
        }
        return parsed;
      } catch (e) {
        // ignore
      }
    }
    return {
      enabled: true,
      teacherName: teacherProfile?.name || 'Ibu Rahmawati, S.Pd.',
      teacherNip: teacherProfile?.nip || '19850412 201001 2 015',
      teacherTitle: teacherProfile?.role || `Wali Kelas ${classNameTitle}`,
      signatureDataUrl: '',
      includeStamp: true,
      stampCode: `E-SIGN-2026-${classNameTitle.replace(/\s+/g, '')}`,
    };
  });

  useEffect(() => {
    if (teacherProfile) {
      setSignatureConfig((prev: any) => ({
        ...prev,
        teacherName: teacherProfile.name || prev.teacherName,
        teacherNip: teacherProfile.nip || prev.teacherNip,
        teacherTitle: teacherProfile.role || prev.teacherTitle,
      }));
    }
  }, [teacherProfile]);

  const sigCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [sigPenColor, setSigPenColor] = useState('#0f172a'); // navy/slate

  const startSigDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawingSig(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawSig = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = sigPenColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopSigDrawing = () => {
    if (!isDrawingSig) return;
    setIsDrawingSig(false);
    const canvas = sigCanvasRef.current;
    if (canvas) {
      setSignatureConfig((prev) => ({
        ...prev,
        signatureDataUrl: canvas.toDataURL('image/png'),
      }));
    }
  };

  const handleClearSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureConfig((prev) => ({
      ...prev,
      signatureDataUrl: '',
    }));
  };

  const handleGenerateSampleSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = sigPenColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw an elegant sample signature loop
    ctx.beginPath();
    ctx.moveTo(35, 65);
    ctx.bezierCurveTo(55, 20, 85, 20, 95, 75);
    ctx.bezierCurveTo(105, 35, 135, 35, 145, 70);
    ctx.bezierCurveTo(155, 85, 185, 25, 225, 55);
    ctx.moveTo(70, 70);
    ctx.lineTo(240, 70);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    setSignatureConfig((prev) => ({
      ...prev,
      signatureDataUrl: dataUrl,
    }));
  };

  const handleUploadSignatureFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSignatureConfig((prev) => ({
          ...prev,
          signatureDataUrl: dataUrl,
        }));
        const img = new Image();
        img.onload = () => {
          const canvas = sigCanvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignatureConfig = () => {
    localStorage.setItem('digital_signature_config_v1', JSON.stringify(signatureConfig));
    triggerToast('✓ Konfigurasi dan tanda tangan digital berhasil disimpan!');
    setIsSignatureModalOpen(false);
  };

  // Parent Email Addresses State
  const [parentEmails, setParentEmails] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('parent_email_directory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    const initialEmails: Record<string, string> = {};
    students.forEach((s) => {
      if (s.parentEmail) {
        initialEmails[s.id] = s.parentEmail;
      } else {
        const cleanName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        initialEmails[s.id] = `ortu.${cleanName}@gmail.com`;
      }
    });
    return initialEmails;
  });

  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [isSendingTestEmails, setIsSendingTestEmails] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendLogs, setSendLogs] = useState<string[]>([]);

  const handleParentEmailChange = (studentId: string, emailVal: string) => {
    const updated = { ...parentEmails, [studentId]: emailVal };
    setParentEmails(updated);
    localStorage.setItem('parent_email_directory', JSON.stringify(updated));
  };

  const triggerToast = (msg: string) => {
    setDownloadSuccessMessage(msg);
    if (onShowToast) onShowToast(msg);
    setTimeout(() => {
      setDownloadSuccessMessage(null);
    }, 4000);
  };

  const handleSaveScheduleConfig = () => {
    localStorage.setItem('parent_email_schedule_config', JSON.stringify(scheduleConfig));
    triggerToast('✓ Pengaturan jadwal pengiriman email mingguan ke orang tua berhasil disimpan!');
    setIsScheduleModalOpen(false);
  };

  const handleSendTestEmails = () => {
    setIsSendingTestEmails(true);
    setSendProgress(0);
    setSendLogs([]);

    const targetStudents = studentAverages.filter((s) => {
      if (scheduleConfig.targetRecipients === 'remedial') return s.avg < passingThreshold;
      if (scheduleConfig.targetRecipients === 'top') return s.avg >= 85;
      return true;
    });

    if (targetStudents.length === 0) {
      triggerToast('⚠️ Tidak ada siswa yang sesuai dengan kriteria penerima saat ini.');
      setIsSendingTestEmails(false);
      return;
    }

    let current = 0;
    const total = targetStudents.length;

    const interval = setInterval(() => {
      current += 1;
      const progressPercent = Math.round((current / total) * 100);
      const student = targetStudents[current - 1];
      const email =
        parentEmails[student.id] ||
        `ortu.${student.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;

      setSendProgress(progressPercent);
      setSendLogs((prev) => [
        `[${new Date().toLocaleTimeString('id-ID')}] Terkirim ke ${student.name} (${email}) - Rata-rata: ${student.avg.toFixed(1)}`,
        ...prev,
      ]);

      if (current >= total) {
        clearInterval(interval);
        setTimeout(() => {
          setIsSendingTestEmails(false);
          const nowStr = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const updatedConfig = { ...scheduleConfig, lastSentDate: `${nowStr} WIB` };
          setScheduleConfig(updatedConfig);
          localStorage.setItem('parent_email_schedule_config', JSON.stringify(updatedConfig));
          triggerToast(`✓ Berhasil mengirimkan ${total} email ringkasan performa ke orang tua siswa!`);
        }, 500);
      }
    }, 350);
  };

  // Compute overall averages and per-subject statistics
  const activeSubjects = subjects || INITIAL_SUBJECTS;
  const activeTpGrades = tpGrades || INITIAL_TP_GRADES;

  // Filter state for TP difficulty analysis
  const [tpFilterSubject, setTpFilterSubject] = useState<string>('all');
  const [tpDisplayLimit, setTpDisplayLimit] = useState<number>(5);

  // Calculate TP statistics across all subjects and TPs
  const allTpStats = useMemo(() => {
    const statsList: Array<{
      tpId: string;
      tpCode: string;
      tpDescription: string;
      lmCode: string;
      lmTitle: string;
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      subjectIcon: string;
      subjectColor: string;
      avgScore: number;
      remedialCount: number;
      tuntasCount: number;
      minScore: number;
      maxScore: number;
      totalStudents: number;
      interventionNote: string;
    }> = [];

    activeSubjects.forEach((subj) => {
      subj.lingkupMateriList.forEach((lm) => {
        lm.tpList.forEach((tp) => {
          let sum = 0;
          let count = 0;
          let remedialCount = 0;
          let minScore = 100;
          let maxScore = 0;

          students.forEach((st) => {
            const score =
              activeTpGrades[st.id]?.[tp.id] ??
              st.tpGrades?.[tp.id] ??
              (st.grades as any)[subj.id] ??
              80;
            sum += score;
            count++;
            if (score < passingThreshold) remedialCount++;
            if (score < minScore) minScore = score;
            if (score > maxScore) maxScore = score;
          });

          const avgScore = count > 0 ? Number((sum / count).toFixed(1)) : 0;
          const tuntasCount = count - remedialCount;

          let note = '';
          if (avgScore < passingThreshold) {
            if (subj.id === 'matematika') {
              note = 'Perlu perbaikan pemahaman konsep dasar, remedial berbasis contoh konkret & bimbingan visual.';
            } else if (subj.id === 'ipa') {
              note = 'Disarankan pendampingan praktikum kontekstual & diagram konsep bergambar.';
            } else if (subj.id === 'indonesia') {
              note = 'Memerlukan sesi bimbingan membaca intensif, struktur kalimat & pemahaman teks.';
            } else if (subj.id === 'ips') {
              note = 'Disarankan diskusi interaktif, peta pikiran (mind map) & peta sejarah.';
            } else {
              note = 'Memerlukan sesi pendampingan khusus (re-teaching) & latihan mandiri terpandu.';
            }
          } else if (avgScore < passingThreshold + 5) {
            note = 'Sudah memenuhi kriteria minimal. Disarankan penguatan latihan soal agar lebih mantap.';
          } else {
            note = 'Tingkat penguasaan materi sangat baik. Siap untuk pengayaan materi tingkat lanjut.';
          }

          statsList.push({
            tpId: tp.id,
            tpCode: tp.code,
            tpDescription: tp.description,
            lmCode: lm.code,
            lmTitle: lm.title,
            subjectId: subj.id,
            subjectName: subj.name,
            subjectCode: subj.code,
            subjectIcon: subj.icon || 'school',
            subjectColor: subj.color || 'indigo',
            avgScore,
            remedialCount,
            tuntasCount,
            minScore: count > 0 ? minScore : 0,
            maxScore: count > 0 ? maxScore : 0,
            totalStudents: count,
            interventionNote: note,
          });
        });
      });
    });

    // Sort ascending by average score (lowest avg score = hardest TP first)
    return statsList.sort((a, b) => a.avgScore - b.avgScore);
  }, [activeSubjects, activeTpGrades, students, passingThreshold]);

  const filteredTpStats = useMemo(() => {
    if (tpFilterSubject === 'all') return allTpStats;
    return allTpStats.filter((tp) => tp.subjectId === tpFilterSubject);
  }, [allTpStats, tpFilterSubject]);

  const displayedTpStats = useMemo(() => {
    if (tpDisplayLimit === 0) return filteredTpStats;
    return filteredTpStats.slice(0, tpDisplayLimit);
  }, [filteredTpStats, tpDisplayLimit]);

  const criticalTpCount = useMemo(() => {
    return allTpStats.filter((tp) => tp.avgScore < passingThreshold).length;
  }, [allTpStats, passingThreshold]);

  const lowestAvgTp = useMemo(() => {
    return allTpStats[0] || null;
  }, [allTpStats]);

  const studentAverages = students.map((s) => {
    const avg =
      (s.grades.matematika +
        s.grades.indonesia +
        s.grades.ipa +
        s.grades.ips) /
      4;
    return { ...s, avg };
  });

  const highPerformers = studentAverages.filter((s) => s.avg >= 85);
  const mediumPerformers = studentAverages.filter((s) => s.avg >= 70 && s.avg < 85);
  const needsAttention = studentAverages.filter((s) => s.avg < 70);

  // Prepare Subject Average Data
  const subjectsConfig = [
    { key: 'matematika' as const, label: 'Matematika', color: '#f43f5e' },
    { key: 'indonesia' as const, label: 'B. Indonesia', color: '#3b82f6' },
    { key: 'ipa' as const, label: 'IPA (Sains)', color: '#10b981' },
    { key: 'ips' as const, label: 'IPS (Sosial)', color: '#f59e0b' },
  ];

  const subjectStatsData = subjectsConfig.map((sub) => {
    const scores = students.map((s) => Number(s.grades[sub.key] || 0));
    const total = scores.reduce((acc, curr) => acc + curr, 0);
    const avg = scores.length > 0 ? Number((total / scores.length).toFixed(1)) : 0;
    const max = Math.max(...scores, 0);
    const min = Math.min(...scores, 100);

    return {
      subject: sub.label,
      "Rata-rata Kelas": avg,
      "Nilai Tertinggi": max,
      "Nilai Terendah": min,
    };
  });

  // Prepare Student Comparison Bar Data
  const studentBarData = students.map((s) => ({
    name: s.name.split(' ')[0],
    fullName: s.name,
    Matematika: s.grades.matematika || 0,
    "B. Indonesia": s.grades.indonesia || 0,
    IPA: s.grades.ipa || 0,
    IPS: s.grades.ips || 0,
    Ratarata: Number(
      (
        ((s.grades.matematika || 0) +
          (s.grades.indonesia || 0) +
          (s.grades.ipa || 0) +
          (s.grades.ips || 0)) /
        4
      ).toFixed(1)
    ),
  }));

  const filteredBarData =
    selectedStudentIds.length > 0
      ? studentBarData.filter((d) =>
          students
            .filter((s) => selectedStudentIds.includes(s.id))
            .some((s) => s.name === d.fullName)
        )
      : studentBarData;

  // Radar Data
  const radarSubjects = [
    { key: 'matematika' as const, label: 'Matematika' },
    { key: 'indonesia' as const, label: 'B. Indonesia' },
    { key: 'ipa' as const, label: 'IPA' },
    { key: 'ips' as const, label: 'IPS' },
  ];

  const radarData = radarSubjects.map((sub) => {
    const point: Record<string, string | number> = { subject: sub.label };
    students.forEach((s) => {
      if (selectedStudentIds.includes(s.id)) {
        point[s.name] = s.grades[sub.key] || 0;
      }
    });
    return point;
  });

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  // 1. Export Multi-Sheet Excel Report
  const handleExportExcelAll = () => {
    const dateStr = new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Sheet 1: Rekap Nilai Siswa
    const rekapData = studentAverages.map((s, idx) => ({
      'No': idx + 1,
      'NIS / NISN': s.studentId,
      'Nama Siswa': s.name,
      'Status Presensi': s.attendanceStatus.toUpperCase(),
      'Matematika': s.grades.matematika,
      'Bahasa Indonesia': s.grades.indonesia,
      'IPA (Sains)': s.grades.ipa,
      'IPS (Sosial)': s.grades.ips,
      'Rata-Rata Nilai': Number(s.avg.toFixed(1)),
      'Status KKTP': s.avg >= passingThreshold ? 'TUNTAS' : 'BELUM TUNTAS',
      'Predikat Performa': s.avg >= 85 ? 'Sangat Baik' : s.avg >= 70 ? 'Baik' : 'Perlu Bimbingan',
      'Catatan & Komentar Evaluasi Wali Kelas':
        studentNotes[s.id] ||
        s.notes ||
        (s.avg >= 85 ? 'Sangat baik, pertahankan prestasi!' : 'Perlu bimbingan dan pemantauan belajar mandiri.'),
      'Nama Orang Tua / Wali': s.parentName || '-',
      'No. HP Wali': s.parentPhone || '-'
    }));

    const sheet1 = XLSX.utils.json_to_sheet(rekapData);
    sheet1['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 28 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
    ];

    // Sheet 2: Analisis Per Mata Pelajaran
    const mapelData = subjectsConfig.map((sub) => {
      const scores = students.map((s) => Number(s.grades[sub.key] || 0));
      const total = scores.reduce((acc, curr) => acc + curr, 0);
      const avg = scores.length > 0 ? Number((total / scores.length).toFixed(1)) : 0;
      const max = Math.max(...scores, 0);
      const min = Math.min(...scores, 100);
      const passedCount = scores.filter((sc) => sc >= passingThreshold).length;
      const passRate = scores.length > 0 ? `${Math.round((passedCount / scores.length) * 100)}%` : '0%';

      return {
        'Mata Pelajaran': sub.label,
        'Rata-Rata Kelas': avg,
        'Nilai Tertinggi': max,
        'Nilai Terendah': min,
        'Target KKM / KKTP': passingThreshold,
        'Jumlah Siswa Tuntas': `${passedCount} dari ${scores.length}`,
        'Persentase Ketuntasan': passRate,
      };
    });

    const sheet2 = XLSX.utils.json_to_sheet(mapelData);
    sheet2['!cols'] = [
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 24 },
    ];

    // Sheet 3: Siswa Perlu Remedial
    const remedialStudents = studentAverages.filter((s) => {
      return (
        s.avg < passingThreshold ||
        s.grades.matematika < passingThreshold ||
        s.grades.indonesia < passingThreshold ||
        s.grades.ipa < passingThreshold ||
        s.grades.ips < passingThreshold
      );
    });

    const remedialData = remedialStudents.map((s, idx) => {
      const lowSubjects: string[] = [];
      if (s.grades.matematika < passingThreshold) lowSubjects.push(`Matematika (${s.grades.matematika})`);
      if (s.grades.indonesia < passingThreshold) lowSubjects.push(`B. Indo (${s.grades.indonesia})`);
      if (s.grades.ipa < passingThreshold) lowSubjects.push(`IPA (${s.grades.ipa})`);
      if (s.grades.ips < passingThreshold) lowSubjects.push(`IPS (${s.grades.ips})`);

      return {
        'No': idx + 1,
        'NIS / ID': s.studentId,
        'Nama Siswa': s.name,
        'Rata-Rata Kelas': Number(s.avg.toFixed(1)),
        'Mata Pelajaran Belum Tuntas (< KKTP)': lowSubjects.join(', '),
        'Nama Orang Tua': s.parentName || '-',
        'No. HP Wali': s.parentPhone || '-'
      };
    });

    const sheet3 = XLSX.utils.json_to_sheet(
      remedialData.length > 0
        ? remedialData
        : [{ 'Status': `Semua siswa telah tuntas mencapai target KKTP (${passingThreshold})!` }]
    );
    sheet3['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 28 },
      { wch: 16 },
      { wch: 45 },
      { wch: 24 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet1, 'Rekap Rapor Kelas');
    XLSX.utils.book_append_sheet(workbook, sheet2, 'Analisis Per Mapel');
    XLSX.utils.book_append_sheet(workbook, sheet3, 'Program Remedial');

    const fileName = `Laporan_Akademik_${classNameTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    triggerToast(`✓ Laporan Excel (.xlsx) "${fileName}" berhasil diunduh!`);
  };

  // 2. Export CSV Format
  const handleExportCsv = () => {
    const csvHeader = ['No', 'NIS', 'Nama Siswa', 'Status Presensi', 'Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'Rata-Rata', 'Status KKTP'];
    const rows = studentAverages.map((s, idx) => [
      idx + 1,
      `"${s.studentId}"`,
      `"${s.name}"`,
      `"${s.attendanceStatus}"`,
      s.grades.matematika,
      s.grades.indonesia,
      s.grades.ipa,
      s.grades.ips,
      s.avg.toFixed(1),
      s.avg >= passingThreshold ? 'TUNTAS' : 'BELUM TUNTAS'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [csvHeader.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const fileName = `Laporan_Nilai_${classNameTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`✓ Laporan CSV "${fileName}" berhasil diunduh!`);
  };

  // 3. Export Individual Student Rapor (.xlsx)
  const handleExportSingleStudentRapor = (st?: StudentGradeRecord) => {
    const targetStudent = st || students.find((s) => s.id === selectedRaporStudentId) || students[0];
    if (!targetStudent) return;

    const avg = Number(
      ((targetStudent.grades.matematika +
        targetStudent.grades.indonesia +
        targetStudent.grades.ipa +
        targetStudent.grades.ips) /
        4).toFixed(1)
    );

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const raporRows = [
      { A: 'LEMBAR HASIL BELAJAR SISWA (RAPOR AKADEMIK)', B: '', C: '', D: '', E: '' },
      { A: 'SEKOLAH: SD NEGERI HARAPAN BANGSA', B: '', C: '', D: 'KELAS:', E: classNameTitle },
      { A: 'NAMA SISWA:', B: targetStudent.name, C: '', D: 'NIS / NISN:', E: targetStudent.studentId },
      { A: 'ORANG TUA / WALI:', B: targetStudent.parentName || '-', C: '', D: 'NO HP WALI:', E: targetStudent.parentPhone || '-' },
      { A: 'PRESENSI HARI INI:', B: targetStudent.attendanceStatus.toUpperCase(), C: '', D: 'TANGGAL CETAK:', E: dateStr },
      { A: '', B: '', C: '', D: '', E: '' },
      { A: 'MATA PELAJARAN', B: 'NILAI', C: 'TARGET KKTP', D: 'STATUS', E: 'CAPAIAN KOMPETENSI / CATATAN' },
      {
        A: 'Matematika',
        B: targetStudent.grades.matematika,
        C: passingThreshold,
        D: targetStudent.grades.matematika >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
        E: targetStudent.grades.matematika >= passingThreshold
          ? 'Sangat baik dalam operasi hitung dan pemecahan masalah logika numerik.'
          : 'Memerlukan latihan tambahan pada soal cerita dan materi matematika dasar.'
      },
      {
        A: 'Bahasa Indonesia',
        B: targetStudent.grades.indonesia,
        C: passingThreshold,
        D: targetStudent.grades.indonesia >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
        E: targetStudent.grades.indonesia >= passingThreshold
          ? 'Terampil membaca pemahaman, menyusun kalimat efektif dan kosa kata.'
          : 'Perlu bimbingan dalam kelancaran membaca dan membuat paragraf deskripsi.'
      },
      {
        A: 'IPA (Sains)',
        B: targetStudent.grades.ipa,
        C: passingThreshold,
        D: targetStudent.grades.ipa >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
        E: targetStudent.grades.ipa >= passingThreshold
          ? 'Memahami konsep ekosistem, sains lingkungan, dan prosedur percobaan.'
          : 'Perlu penguatan konsep sains alam dan siklus makhluk hidup.'
      },
      {
        A: 'IPS (Sosial)',
        B: targetStudent.grades.ips,
        C: passingThreshold,
        D: targetStudent.grades.ips >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
        E: targetStudent.grades.ips >= passingThreshold
          ? 'Aktif memahami keragaman sejarah, budaya nusantara, dan kondisi geografis.'
          : 'Perlu wawasan tambahan mengenai peta dan lingkungan sosial.'
      },
      { A: '', B: '', C: '', D: '', E: '' },
      {
        A: 'RATA-RATA AKADEMIK',
        B: avg,
        C: passingThreshold,
        D: avg >= passingThreshold ? 'LULUS KKTP' : 'PERLU BIMBINGAN',
        E: avg >= passingThreshold
          ? 'Selamat! Siswa berhasil mencapai standar kelulusan KKTP kelas dengan sangat baik.'
          : 'Siswa disarankan mengikuti program pengayaan dan remedial terbimbing.'
      },
      { A: '', B: '', C: '', D: '', E: '' },
      { A: 'CATATAN PERSONAL & EVALUASI WALI KELAS:', B: studentNotes[targetStudent.id] || targetStudent.notes || (avg >= 85 ? 'Siswa sangat aktif, santun, dan menjadi teladan di kelas.' : 'Tingkatkan semangat belajar dan terus berlatih mandiri di rumah.') },
      { A: '', B: '', C: '', D: '', E: '' },
      { A: 'Mengetahui, Orang Tua / Wali', B: '', C: '', D: 'Wali Kelas,', E: '' },
      { A: '', B: '', C: '', D: '', E: '' },
      { A: `( ${targetStudent.parentName || '.....................................'} )`, B: '', C: '', D: `( Guru ${classNameTitle} )`, E: '' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(raporRows, { skipHeader: true });
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 65 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapor Siswa');

    const fileName = `Rapor_${targetStudent.name.replace(/\s+/g, '_')}_${targetStudent.studentId}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    triggerToast(`✓ Rapor individual "${targetStudent.name}" berhasil diunduh!`);
  };

  // 4. Export All Individual Student Rapors in 1 Workbook
  const handleExportAllIndividualRapors = () => {
    const workbook = XLSX.utils.book_new();

    students.forEach((targetStudent) => {
      const avg = Number(
        ((targetStudent.grades.matematika +
          targetStudent.grades.indonesia +
          targetStudent.grades.ipa +
          targetStudent.grades.ips) /
          4).toFixed(1)
      );

      const raporRows = [
        { A: 'LEMBAR HASIL BELAJAR SISWA (RAPOR AKADEMIK)', B: '', C: '', D: '', E: '' },
        { A: 'SEKOLAH: SD NEGERI HARAPAN BANGSA', B: '', C: '', D: 'KELAS:', E: classNameTitle },
        { A: 'NAMA SISWA:', B: targetStudent.name, C: '', D: 'NIS / NISN:', E: targetStudent.studentId },
        { A: 'ORANG TUA / WALI:', B: targetStudent.parentName || '-', C: '', D: 'NO HP WALI:', E: targetStudent.parentPhone || '-' },
        { A: 'PRESENSI HARI INI:', B: targetStudent.attendanceStatus.toUpperCase() },
        { A: '', B: '', C: '', D: '', E: '' },
        { A: 'MATA PELAJARAN', B: 'NILAI', C: 'TARGET KKTP', D: 'STATUS' },
        { A: 'Matematika', B: targetStudent.grades.matematika, C: passingThreshold, D: targetStudent.grades.matematika >= passingThreshold ? 'TUNTAS' : 'REMEDIAL' },
        { A: 'Bahasa Indonesia', B: targetStudent.grades.indonesia, C: passingThreshold, D: targetStudent.grades.indonesia >= passingThreshold ? 'TUNTAS' : 'REMEDIAL' },
        { A: 'IPA (Sains)', B: targetStudent.grades.ipa, C: passingThreshold, D: targetStudent.grades.ipa >= passingThreshold ? 'TUNTAS' : 'REMEDIAL' },
        { A: 'IPS (Sosial)', B: targetStudent.grades.ips, C: passingThreshold, D: targetStudent.grades.ips >= passingThreshold ? 'TUNTAS' : 'REMEDIAL' },
        { A: 'RATA-RATA AKADEMIK', B: avg, C: passingThreshold, D: avg >= passingThreshold ? 'LULUS KKTP' : 'PERLU BIMBINGAN' }
      ];

      const worksheet = XLSX.utils.json_to_sheet(raporRows, { skipHeader: true });
      worksheet['!cols'] = [
        { wch: 26 },
        { wch: 12 },
        { wch: 14 },
        { wch: 18 }
      ];

      const safeSheetName = targetStudent.name.replace(/[\\/?*\[\]]/g, '').slice(0, 25);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    });

    const fileName = `Kumpulan_Rapor_Semua_Siswa_${classNameTitle.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    triggerToast(`✓ Kumpulan ${students.length} Rapor Siswa berhasil diunduh dalam 1 file Excel!`);
  };

  // 5. Export Single Student PDF Rapor (Rapor Sementara)
  const handleExportPdfSingleStudent = (st?: StudentGradeRecord) => {
    const targetStudent = st || students.find((s) => s.id === selectedRaporStudentId) || students[0];
    if (!targetStudent) return;

    const avg = Number(
      ((targetStudent.grades.matematika +
        targetStudent.grades.indonesia +
        targetStudent.grades.ipa +
        targetStudent.grades.ips) /
        4).toFixed(1)
    );

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Header Title Banner
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SD NEGERI HARAPAN BANGSA', 105, 12, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('LEMBAR HASIL BELAJAR SISWA (RAPOR SEMENTARA)', 105, 20, { align: 'center' });

    // Accent line under header
    doc.setDrawColor(244, 63, 94); // rose-500 accent
    doc.setLineWidth(1.5);
    doc.line(0, 28, 210, 28);

    // Metadata section box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(14, 34, 182, 34, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.roundedRect(14, 34, 182, 34, 3, 3, 'S');

    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    // Left column
    doc.setFont('helvetica', 'bold');
    doc.text('Nama Siswa', 18, 42);
    doc.text(':', 52, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(targetStudent.name, 55, 42);

    doc.setFont('helvetica', 'bold');
    doc.text('NIS / NISN', 18, 49);
    doc.text(':', 52, 49);
    doc.setFont('helvetica', 'normal');
    doc.text(targetStudent.studentId, 55, 49);

    doc.setFont('helvetica', 'bold');
    doc.text('Status Presensi', 18, 56);
    doc.text(':', 52, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(targetStudent.attendanceStatus.toUpperCase(), 55, 56);

    // Right column
    doc.setFont('helvetica', 'bold');
    doc.text('Kelas', 112, 42);
    doc.text(':', 148, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(classNameTitle, 151, 42);

    doc.setFont('helvetica', 'bold');
    doc.text('Orang Tua / Wali', 112, 49);
    doc.text(':', 148, 49);
    doc.setFont('helvetica', 'normal');
    doc.text(targetStudent.parentName || '-', 151, 49);

    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal Cetak', 112, 56);
    doc.text(':', 148, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, 151, 56);

    // Grades Table using autoTable
    const tableHead = [['No', 'Mata Pelajaran', 'Nilai', 'KKTP', 'Status', 'Capaian Kompetensi / Catatan']];
    const tableBody = [
      [
        '1',
        'Matematika',
        targetStudent.grades.matematika,
        passingThreshold,
        targetStudent.grades.matematika >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
        targetStudent.grades.matematika >= passingThreshold
          ? 'Sangat baik dalam operasi hitung dan logika numerik.'
          : 'Perlu latihan tambahan pada soal cerita matematika dasar.',
      ],
      [
        '2',
        'Bahasa Indonesia',
        targetStudent.grades.indonesia,
        passingThreshold,
        targetStudent.grades.indonesia >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
        targetStudent.grades.indonesia >= passingThreshold
          ? 'Terampil membaca pemahaman dan menyusun kalimat efektif.'
          : 'Perlu bimbingan dalam kelancaran membaca dan menulis.',
      ],
      [
        '3',
        'IPA (Sains)',
        targetStudent.grades.ipa,
        passingThreshold,
        targetStudent.grades.ipa >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
        targetStudent.grades.ipa >= passingThreshold
          ? 'Memahami konsep ekosistem dan pengamatan sains.'
          : 'Perlu penguatan konsep dasar sains dan fenomena alam.',
      ],
      [
        '4',
        'IPS (Sosial)',
        targetStudent.grades.ips,
        passingThreshold,
        targetStudent.grades.ips >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
        targetStudent.grades.ips >= passingThreshold
          ? 'Aktif memahami keragaman budaya dan kondisi geografis.'
          : 'Perlu wawasan tambahan mengenai peta dan lingkungan sosial.',
      ],
      [
        '',
        'RATA-RATA AKADEMIK',
        avg,
        passingThreshold,
        avg >= passingThreshold ? 'LULUS KKTP' : 'PERLU BIMBINGAN',
        avg >= passingThreshold
          ? 'Selamat! Berhasil mencapai standar KKTP kelas dengan baik.'
          : 'Disarankan mengikuti program pengayaan & remedial terbimbing.',
      ],
    ];

    autoTable(doc, {
      startY: 74,
      margin: { left: 14, right: 14 },
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold', cellWidth: 38 },
        2: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
        3: { halign: 'center', cellWidth: 16 },
        4: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
        5: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        // Highlight summary row
        if (data.row.index === 4) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
          if (data.column.index === 2) {
            data.cell.styles.textColor = [225, 29, 72];
          }
        }
        // Highlight status cell
        if (data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === 'TUNTAS' || val === 'LULUS KKTP') {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (val === 'REMEDIAL' || val === 'PERLU BIMBINGAN') {
            data.cell.styles.textColor = [225, 29, 72];
          }
        }
      },
    });

    // @ts-ignore
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 150;

    // Catatan Personal & Komentar Evaluasi Wali Kelas Box
    const customNote =
      studentNotes[targetStudent.id] ||
      targetStudent.notes ||
      (avg >= 85
        ? 'Siswa sangat aktif, santun, dan menjadi contoh yang sangat baik di kelas. Pertahankan prestasi!'
        : 'Tingkatkan semangat belajar dan terus berlatih mandiri di rumah. Bimbingan khusus tersedia setelah jam KBM.');

    const splitNotes = doc.splitTextToSize(customNote, 174);
    const notesBoxHeight = Math.max(22, 10 + splitNotes.length * 4.5);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, finalY, 182, notesBoxHeight, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, finalY, 182, notesBoxHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('CATATAN PERSONAL & KOMENTAR EVALUASI WALI KELAS:', 18, finalY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(splitNotes, 18, finalY + 12);

    // Signatures Section
    const sigY = finalY + notesBoxHeight + 8;
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');

    // Left signature: Parent
    doc.text('Mengetahui,', 25, sigY);
    doc.text('Orang Tua / Wali Siswa,', 25, sigY + 5);
    doc.line(25, sigY + 22, 75, sigY + 22);
    doc.text(`( ${targetStudent.parentName || '.....................................'} )`, 25, sigY + 26);

    // Right signature: Teacher
    doc.text(`Kota, ${dateStr}`, 135, sigY);
    doc.text(`${signatureConfig.teacherTitle || `Wali Kelas ${classNameTitle}`},`, 135, sigY + 5);

    // Embed Digital Signature Image if enabled and data URL exists
    if (signatureConfig.enabled && signatureConfig.signatureDataUrl) {
      try {
        doc.addImage(signatureConfig.signatureDataUrl, 'PNG', 135, sigY + 6, 42, 15);
      } catch (e) {
        console.error('Error rendering digital signature image in PDF:', e);
      }
    }

    doc.line(135, sigY + 22, 185, sigY + 22);
    const displayTeacherName = signatureConfig.teacherName || `( Guru Wali ${classNameTitle} )`;
    doc.text(displayTeacherName.startsWith('(') ? displayTeacherName : `( ${displayTeacherName} )`, 135, sigY + 26);

    if (signatureConfig.teacherNip) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`NIP. ${signatureConfig.teacherNip}`, 135, sigY + 30);
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
    }

    // Digital Validation Stamp Badge
    if (signatureConfig.enabled && signatureConfig.includeStamp) {
      const stampY = signatureConfig.teacherNip ? sigY + 33 : sigY + 30;
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.roundedRect(135, stampY, 52, 11, 1.5, 1.5, 'F');
      doc.setDrawColor(16, 185, 129); // emerald-500
      doc.setLineWidth(0.3);
      doc.roundedRect(135, stampY, 52, 11, 1.5, 1.5, 'S');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('✓ DISAHKAN SECARA DIGITAL', 137, stampY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      doc.text(`Ref: ${signatureConfig.stampCode || 'E-SIGN-2026'}`, 137, stampY + 8);
    }

    const fileName = `Rapor_Sementara_${targetStudent.name.replace(/\s+/g, '_')}_${targetStudent.studentId}.pdf`;
    doc.save(fileName);
    triggerToast(`✓ Rapor Sementara PDF "${targetStudent.name}" berhasil diunduh!`);
  };

  // 6. Export Class Performance Summary PDF
  const handleExportPdfClassSummary = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Header Banner
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('SD NEGERI HARAPAN BANGSA', 148.5, 10, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`REKAPITULASI LAPORAN PERFORMA SISWA - ${classNameTitle.toUpperCase()}`, 148.5, 17, { align: 'center' });

    doc.setDrawColor(244, 63, 94);
    doc.setLineWidth(1.2);
    doc.line(0, 24, 297, 24);

    // Info bar
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text(`Jumlah Siswa: ${students.length} orang`, 14, 30);
    doc.text(`Target KKTP: ${passingThreshold}`, 75, 30);

    const overallAvg = (
      studentAverages.reduce((acc, s) => acc + s.avg, 0) / (students.length || 1)
    ).toFixed(1);
    doc.text(`Rata-rata Kelas: ${overallAvg}`, 130, 30);

    const passedStudentsCount = studentAverages.filter((s) => s.avg >= passingThreshold).length;
    doc.text(
      `Ketuntasan KKTP: ${passedStudentsCount} / ${students.length} Siswa (${Math.round((passedStudentsCount / (students.length || 1)) * 100)}%)`,
      185,
      30
    );
    doc.text(`Tanggal Cetak: ${dateStr}`, 245, 30);

    // Table
    const tableHead = [['No', 'NIS/ID', 'Nama Siswa', 'Presensi', 'Matematika', 'B. Indo', 'IPA', 'IPS', 'Rata-Rata', 'Status KKTP', 'Nama Orang Tua']];
    const tableBody = studentAverages.map((s, idx) => [
      idx + 1,
      s.studentId,
      s.name,
      s.attendanceStatus.toUpperCase(),
      s.grades.matematika,
      s.grades.indonesia,
      s.grades.ipa,
      s.grades.ips,
      s.avg.toFixed(1),
      s.avg >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
      s.parentName || '-',
    ]);

    autoTable(doc, {
      startY: 34,
      margin: { left: 14, right: 14 },
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 22 },
        2: { fontStyle: 'bold', cellWidth: 45 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 20 },
        7: { halign: 'center', cellWidth: 20 },
        8: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
        9: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
        10: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        if (data.column.index === 9) {
          const val = String(data.cell.raw);
          if (val === 'TUNTAS') {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (val === 'REMEDIAL') {
            data.cell.styles.textColor = [225, 29, 72];
          }
        }
      },
    });

    // Add Attachment Page: Catatan Personal & Komentar Evaluasi Siswa
    doc.addPage('a4', 'landscape');

    // Header Banner
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LAMPIRAN: CATATAN PERSONAL & KOMENTAR EVALUASI SISWA WALI KELAS', 148.5, 10, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`KELAS: ${classNameTitle.toUpperCase()} - SD NEGERI HARAPAN BANGSA`, 148.5, 17, { align: 'center' });

    doc.setDrawColor(244, 63, 94);
    doc.setLineWidth(1.2);
    doc.line(0, 24, 297, 24);

    const notesTableHead = [['No', 'NIS/ID', 'Nama Siswa', 'Rata-Rata', 'Status KKTP', 'Catatan Personal & Komentar Evaluasi Wali Kelas']];
    const notesTableBody = studentAverages.map((s, idx) => [
      idx + 1,
      s.studentId,
      s.name,
      s.avg.toFixed(1),
      s.avg >= passingThreshold ? 'TUNTAS' : 'REMEDIAL',
      studentNotes[s.id] ||
        s.notes ||
        (s.avg >= 85
          ? 'Siswa sangat aktif, santun, dan menunjukkan kepemimpinan yang baik di kelas.'
          : 'Siswa memerlukan bimbingan tambahan dan latihan mandiri di rumah.'),
    ]);

    autoTable(doc, {
      startY: 30,
      margin: { left: 14, right: 14 },
      head: notesTableHead,
      body: notesTableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 24 },
        2: { fontStyle: 'bold', cellWidth: 42 },
        3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
        4: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
        5: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        if (data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === 'TUNTAS') {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (val === 'REMEDIAL') {
            data.cell.styles.textColor = [225, 29, 72];
          }
        }
      },
    });

    const fileName = `Rekap_Nilai_${classNameTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    triggerToast(`✓ Laporan PDF Rekap Kelas "${fileName}" berhasil diunduh!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedRaporStudent = students.find((s) => s.id === selectedRaporStudentId) || students[0];
  const selectedRaporAvg = selectedRaporStudent
    ? Number(
        ((selectedRaporStudent.grades.matematika +
          selectedRaporStudent.grades.indonesia +
          selectedRaporStudent.grades.ipa +
          selectedRaporStudent.grades.ips) /
          4).toFixed(1)
      )
    : 0;

  const radarColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Toast alert banner */}
        {downloadSuccessMessage && (
          <div className="bg-emerald-500 text-slate-950 font-black p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top duration-300 border border-emerald-400">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-xl">check_circle</span>
              <span>{downloadSuccessMessage}</span>
            </div>
            <button
              onClick={() => setDownloadSuccessMessage(null)}
              className="text-slate-950 hover:opacity-75"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Header & Download Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-['Hanken_Grotesk'] text-3xl md:text-4xl font-black text-white tracking-tight">
              Laporan Akademik & Unduh Rapor
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              Ekspor rekapitulasi nilai kelas, analisis ketuntasan KKTP, dan rapor individual siswa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95 border border-indigo-400/30 relative"
              title="Atur pengiriman otomatis ringkasan performa ke email orang tua siswa"
            >
              <span className="material-symbols-outlined text-[18px]">
                forward_to_inbox
              </span>
              Jadwal Email Orang Tua
              {scheduleConfig.enabled && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-slate-900" />
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer hover:bg-slate-800 active:scale-95"
              title="Cetak atau simpan laporan ke format PDF"
            >
              <span className="material-symbols-outlined text-[18px]">
                print
              </span>
              Cetak / PDF
            </button>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer hover:bg-slate-700 active:scale-95"
              title="Unduh data nilai dalam format CSV"
            >
              <span className="material-symbols-outlined text-[18px]">
                csv
              </span>
              Unduh CSV
            </button>

            <button
              onClick={handleExportPdfClassSummary}
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20 active:scale-95"
              title="Unduh rekapitulasi performa kelas format PDF"
            >
              <span className="material-symbols-outlined text-[18px]">
                picture_as_pdf
              </span>
              Unduh PDF Rekap Kelas
            </button>

            <button
              onClick={handleExportExcelAll}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              title="Unduh laporan kelas lengkap (3 Sheet Excel)"
            >
              <span className="material-symbols-outlined text-[18px]">
                download
              </span>
              Unduh Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* INDIVIDUAL STUDENT RAPOR DOWNLOAD CARD */}
        <div className="bg-slate-900 border border-indigo-500/30 rounded-[32px] p-6 shadow-2xl text-white space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
                <span className="material-symbols-outlined text-2xl">workspace_premium</span>
              </div>
              <div>
                <h2 className="font-['Hanken_Grotesk'] text-xl font-black text-white">
                  Unduh Rapor Individual Siswa
                </h2>
                <p className="text-xs text-slate-400">
                  Pilih siswa untuk mengunduh Lembar Hasil Belajar (Rapor Sementara) format PDF atau Excel (.xlsx).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsSignatureModalOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                title="Atur & sahkan tanda tangan digital wali kelas untuk rapor PDF"
              >
                <span className="material-symbols-outlined text-[16px]">draw</span>
                Tanda Tangan Digital PDF
                {signatureConfig.enabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                title="Atur jadwal pengiriman ringkasan performa siswa ke email orang tua"
              >
                <span className="material-symbols-outlined text-[16px]">schedule_send</span>
                Jadwalkan Email
              </button>

              <button
                onClick={handleExportAllIndividualRapors}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">folder_zip</span>
                Unduh Semua Rapor ({students.length} Excel)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Dropdown Selector */}
            <div className="md:col-span-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Pilih Nama Siswa:
              </label>
              <select
                value={selectedRaporStudentId}
                onChange={(e) => setSelectedRaporStudentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-sm font-bold rounded-xl p-3 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} (NIS: {st.studentId})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Summary Preview */}
            {selectedRaporStudent && (
              <div className="md:col-span-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Ringkasan Rapor:</p>
                  <p className="font-bold text-sm text-white truncate max-w-[180px]">
                    {selectedRaporStudent.name}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                      selectedRaporAvg >= passingThreshold
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {selectedRaporAvg >= passingThreshold ? 'LULUS KKTP' : 'REMEDIAL'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Rata-Rata</span>
                  <span className="font-mono text-2xl font-black text-rose-400">{selectedRaporAvg}</span>
                </div>
              </div>
            )}

            {/* Download Buttons for single student (PDF & Excel) */}
            <div className="md:col-span-4 flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => handleExportPdfSingleStudent(selectedRaporStudent)}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                title="Unduh Lembar Rapor Sementara format PDF"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                Unduh PDF Rapor
              </button>

              <button
                onClick={() => handleExportSingleStudentRapor(selectedRaporStudent)}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                title="Unduh Rapor format Excel (.xlsx)"
              >
                <span className="material-symbols-outlined text-[18px]">file_download</span>
                Excel
              </button>
            </div>
          </div>

          {/* Editor Catatan Personal & Komentar Evaluasi Siswa */}
          {selectedRaporStudent && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400 text-lg">edit_note</span>
                  <label className="text-xs font-bold text-white">
                    Catatan Personal & Komentar Evaluasi Wali Kelas ({selectedRaporStudent.name}):
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNotesModalOpen(true)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Buka panel kelola semua catatan evaluasi siswa"
                  >
                    <span className="material-symbols-outlined text-sm">list_alt</span>
                    Kelola Semua Catatan ({students.length} Siswa)
                  </button>
                </div>
              </div>

              {/* Textarea Editor */}
              <div className="relative">
                <textarea
                  rows={2}
                  value={studentNotes[selectedRaporStudent.id] || ''}
                  onChange={(e) => handleSaveStudentNote(selectedRaporStudent.id, e.target.value)}
                  placeholder="Ketik catatan personal, apresiasi, atau saran evaluasi perkembangan siswa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed font-medium"
                />
              </div>

              {/* Quick Preset Template Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Template Cepat:
                </span>
                {[
                  '🌟 Sangat aktif, santun & berprestasi tinggi.',
                  '💡 Pemahaman materi baik, tingkatkan ketelitian.',
                  '📚 Perlu bimbingan membaca & memahami teks.',
                  '🎯 Perlu latihan mandiri & remedial terbimbing.',
                  '✨ Sikap disiplin & rajin, menjadi teladan kelas.',
                  '🚀 Memiliki potensi besar, siap untuk pengayaan.',
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      handleSaveStudentNote(selectedRaporStudent.id, preset);
                      triggerToast(`✓ Catatan evaluasi "${selectedRaporStudent.name}" diperbarui!`);
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] font-medium transition-all cursor-pointer active:scale-95"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[28px] shadow-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-3xl">
                star
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Performa Sangat Baik (&ge;85)
              </p>
              <p className="font-['Hanken_Grotesk'] text-3xl font-black text-white">
                {highPerformers.length} Siswa
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[28px] shadow-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-3xl">
                trending_flat
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Performa Cukup (70–84)
              </p>
              <p className="font-['Hanken_Grotesk'] text-3xl font-black text-white">
                {mediumPerformers.length} Siswa
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[28px] shadow-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <span className="material-symbols-outlined text-3xl">
                warning
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Perlu Bimbingan (&lt;70)
              </p>
              <p className="font-['Hanken_Grotesk'] text-3xl font-black text-white">
                {needsAttention.length} Siswa
              </p>
            </div>
          </div>
        </div>

        {/* RECHARTS INTEGRATION: GRAPHICAL PERFORMANCE COMPARISON SECTION */}
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[32px] shadow-2xl text-white space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
                  analytics
                </span>
                <h2 className="font-['Hanken_Grotesk'] text-2xl font-black text-white">
                  Grafik Perbandingan Performa Siswa
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visualisasi interaktif per perbandingan siswa, rata-rata mata pelajaran, dan analisis radar potensi.
              </p>
            </div>

            {/* Chart View Mode Tabs */}
            <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex-wrap gap-1">
              <button
                onClick={() => setChartType('student_bar')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  chartType === 'student_bar'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                Per Performa Siswa
              </button>
              <button
                onClick={() => setChartType('subject_compare')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  chartType === 'subject_compare'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">show_chart</span>
                Rata-rata Mapel & KKTP
              </button>
              <button
                onClick={() => setChartType('radar')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  chartType === 'radar'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">radar</span>
                Radar Multi-Siswa
              </button>
              <button
                onClick={() => setChartType('tp_difficulty')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  chartType === 'tp_difficulty'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan analisis grafik TP dengan rata-rata terendah"
              >
                <span className="material-symbols-outlined text-[18px]">psychology_alt</span>
                TP Tersulit (Diagnostic)
              </button>
            </div>
          </div>

          {/* Student Selection Filter Chips for Multi-student Charts */}
          {(chartType === 'student_bar' || chartType === 'radar') && (
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-rose-400">filter_list</span>
                  Pilih Siswa yang Dibandingkan:
                </span>
                <button
                  onClick={handleSelectAllStudents}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  {selectedStudentIds.length === students.length ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {students.map((st) => {
                  const isSelected = selectedStudentIds.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      onClick={() => toggleStudentSelection(st.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-rose-400' : 'bg-slate-700'}`} />
                      {st.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHART DISPLAY CONTAINER WITH ANIMATION TRANSITION */}
          <div className="w-full h-[400px] pt-4 relative">
            <AnimatePresence mode="wait">
              {chartType === 'student_bar' && (
                <motion.div
                  key={`student_bar_${selectedStudentIds.join('-')}`}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredBarData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '16px',
                          color: '#ffffff',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '15px' }}
                        formatter={(value) => <span className="text-slate-300 text-xs font-bold">{value}</span>}
                      />
                      <ReferenceLine
                        y={passingThreshold}
                        label={{
                          value: `Target KKTP (${passingThreshold})`,
                          fill: '#f43f5e',
                          fontSize: 11,
                          fontWeight: 700,
                          position: 'top',
                        }}
                        stroke="#f43f5e"
                        strokeDasharray="4 4"
                      />
                      <Bar
                        dataKey="Matematika"
                        fill="#f43f5e"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                        animationBegin={50}
                      />
                      <Bar
                        dataKey="B. Indonesia"
                        fill="#3b82f6"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                        animationBegin={150}
                      />
                      <Bar
                        dataKey="IPA"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                        animationBegin={250}
                      />
                      <Bar
                        dataKey="IPS"
                        fill="#f59e0b"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                        animationBegin={350}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {chartType === 'subject_compare' && (
                <motion.div
                  key="subject_compare"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={subjectStatsData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="subject"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '16px',
                          color: '#ffffff',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '15px' }}
                        formatter={(value) => <span className="text-slate-300 text-xs font-bold">{value}</span>}
                      />
                      <ReferenceLine
                        y={passingThreshold}
                        label={{
                          value: `Batas Tuntas KKTP (${passingThreshold})`,
                          fill: '#f43f5e',
                          fontSize: 11,
                          fontWeight: 700,
                          position: 'top',
                        }}
                        stroke="#f43f5e"
                        strokeDasharray="5 5"
                      />
                      <Line
                        type="monotone"
                        dataKey="Rata-rata Kelas"
                        stroke="#f43f5e"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#f43f5e', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 8 }}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                        animationBegin={100}
                      />
                      <Line
                        type="monotone"
                        dataKey="Nilai Tertinggi"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        dot={{ r: 4, fill: '#10b981' }}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                        animationBegin={250}
                      />
                      <Line
                        type="monotone"
                        dataKey="Nilai Terendah"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        dot={{ r: 4, fill: '#f59e0b' }}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                        animationBegin={400}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {chartType === 'radar' && (
                <motion.div
                  key={`radar_${selectedStudentIds.join('-')}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '16px',
                          color: '#ffffff',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '10px' }}
                        formatter={(value) => <span className="text-slate-300 text-xs font-bold">{value}</span>}
                      />
                      {students
                        .filter((s) => selectedStudentIds.includes(s.id))
                        .map((s, idx) => {
                          const color = radarColors[idx % radarColors.length];
                          return (
                            <Radar
                              key={s.id}
                              name={s.name}
                              dataKey={s.name}
                              stroke={color}
                              fill={color}
                              fillOpacity={0.25}
                              isAnimationActive={true}
                              animationDuration={1100}
                              animationEasing="ease-out"
                              animationBegin={idx * 120}
                            />
                          );
                        })}
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {chartType === 'tp_difficulty' && (
                <motion.div
                  key="tp_difficulty"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={displayedTpStats.map((tp) => ({
                        name: `${tp.subjectCode} ${tp.tpCode}`,
                        fullName: `${tp.subjectName} - ${tp.tpCode}`,
                        "Rata-Rata TP": tp.avgScore,
                        "Target KKTP": passingThreshold,
                        description: tp.tpDescription,
                        remedialCount: tp.remedialCount,
                        minScore: tp.minScore,
                        maxScore: tp.maxScore,
                      }))}
                      margin={{ top: 20, right: 30, left: 10, bottom: 35 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl shadow-xl text-xs text-white max-w-xs space-y-1.5">
                                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                                  <span className="font-bold text-rose-400">{data.fullName}</span>
                                  <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                                    {data.name}
                                  </span>
                                </div>
                                <p className="text-slate-300 font-medium text-[11px] leading-relaxed">
                                  {data.description}
                                </p>
                                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800">
                                  <span className="text-slate-400">Rata-Rata Kelas:</span>
                                  <span className="font-bold text-rose-400 font-mono text-sm">{data["Rata-Rata TP"]}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400">Siswa Remedial:</span>
                                  <span className="font-bold text-amber-400 font-mono">{data.remedialCount} Siswa</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                                  <span>Rentang Nilai:</span>
                                  <span>{data.minScore} s/d {data.maxScore}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span className="text-slate-300 text-xs font-bold">{value}</span>}
                      />
                      <ReferenceLine
                        y={passingThreshold}
                        label={{
                          value: `Batas KKTP (${passingThreshold})`,
                          fill: '#f43f5e',
                          fontSize: 11,
                          fontWeight: 700,
                          position: 'top',
                        }}
                        stroke="#f43f5e"
                        strokeDasharray="4 4"
                      />
                      <Bar
                        dataKey="Rata-Rata TP"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      >
                        {displayedTpStats.map((tp, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              tp.avgScore < passingThreshold
                                ? '#f43f5e'
                                : tp.avgScore < passingThreshold + 5
                                ? '#f59e0b'
                                : '#10b981'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ANALISIS DIAGNOSIS KESULITAN BELAJAR: TP DENGAN RATA-RATA TERENDAH */}
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[32px] shadow-2xl text-white space-y-6">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl shrink-0">
                <span className="material-symbols-outlined text-2xl">psychology_alt</span>
              </div>
              <div>
                <h2 className="font-['Hanken_Grotesk'] text-2xl font-black text-white flex items-center gap-2">
                  Analisis Diagnosis Kesulitan Belajar
                  <span className="text-xs font-bold px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full">
                    Materi Sulit Siswa
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Daftar Tujuan Pembelajaran (TP) dengan nilai rata-rata terendah. Gunakan indikator ini untuk merancang intervensi kelas, kegiatan remedial, dan pengulangan materi (re-teaching).
                </p>
              </div>
            </div>

            {/* Quick Export / Print Button */}
            <button
              onClick={() => {
                triggerToast('✓ Laporan Diagnosis TP Tersulit & Rekomendasi Remedial berhasil disiapkan!');
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-base">print</span>
              Cetak Rekomendasi Remedial
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  TP Kategori Kritis (&lt; KKTP)
                </p>
                <p className="font-['Hanken_Grotesk'] text-2xl font-black text-rose-400 mt-1">
                  {criticalTpCount} TP
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Memerlukan intervensi remedial</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Materi Paling Sulit
                </p>
                <p className="font-['Hanken_Grotesk'] text-lg font-black text-amber-400 mt-1 truncate max-w-[160px]">
                  {lowestAvgTp ? `${lowestAvgTp.subjectCode} - ${lowestAvgTp.tpCode}` : '-'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  Rata-rata: {lowestAvgTp ? lowestAvgTp.avgScore : 0} / 100
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">trending_down</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tingkat Ketuntasan TP
                </p>
                <p className="font-['Hanken_Grotesk'] text-2xl font-black text-emerald-400 mt-1">
                  {allTpStats.length > 0
                    ? `${Math.round(((allTpStats.length - criticalTpCount) / allTpStats.length) * 100)}%`
                    : '100%'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {allTpStats.length - criticalTpCount} dari {allTpStats.length} TP mencapai KKTP
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">verified</span>
              </div>
            </div>
          </div>

          {/* Filter Bar for TP List */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            {/* Subject Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Filter Mata Pelajaran:
              </span>
              <select
                value={tpFilterSubject}
                onChange={(e) => setTpFilterSubject(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="all">Semua Mata Pelajaran ({allTpStats.length} TP)</option>
                {activeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Limit Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Tampilkan:
              </span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setTpDisplayLimit(5)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tpDisplayLimit === 5
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Top 5 Tersulit
                </button>
                <button
                  onClick={() => setTpDisplayLimit(10)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tpDisplayLimit === 10
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Top 10
                </button>
                <button
                  onClick={() => setTpDisplayLimit(0)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tpDisplayLimit === 0
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({filteredTpStats.length})
                </button>
              </div>
            </div>
          </div>

          {/* List of TP items ordered by lowest average score */}
          <div className="space-y-4">
            {displayedTpStats.map((tp, idx) => {
              const isBelowKktp = tp.avgScore < passingThreshold;
              const isNearKktp = !isBelowKktp && tp.avgScore < passingThreshold + 5;

              return (
                <div
                  key={tp.tpId}
                  className={`p-5 rounded-2xl border transition-all ${
                    isBelowKktp
                      ? 'bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 border-rose-500/40 hover:border-rose-500/70'
                      : isNearKktp
                      ? 'bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/30 hover:border-amber-500/60'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Rank & TP Info */}
                    <div className="flex items-start gap-3.5">
                      {/* Rank Badge */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                          idx === 0
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400'
                            : idx === 1
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : idx === 2
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        #{idx + 1}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              {tp.subjectIcon}
                            </span>
                            {tp.subjectName} ({tp.subjectCode})
                          </span>

                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-[11px] font-mono font-bold text-indigo-300">
                            {tp.tpCode}
                          </span>

                          <span className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                            {tp.lmCode}: {tp.lmTitle}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white leading-snug">
                          {tp.tpDescription}
                        </h3>
                      </div>
                    </div>

                    {/* Stats & Progress Bar */}
                    <div className="lg:w-72 shrink-0 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400">Rata-Rata Kelas:</span>
                        <span
                          className={`font-mono text-base font-black ${
                            isBelowKktp
                              ? 'text-rose-400'
                              : isNearKktp
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {tp.avgScore} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                        </span>
                      </div>

                      {/* Visual Bar */}
                      <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isBelowKktp ? 'bg-rose-500' : isNearKktp ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, tp.avgScore))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Siswa Remedial: <strong className="text-amber-400 font-bold">{tp.remedialCount}</strong> / {tp.totalStudents}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isBelowKktp
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isNearKktp
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isBelowKktp ? 'REMEDIAL KRITIS' : isNearKktp ? 'WASPADA' : 'TUNTAS KKTP'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Teacher Intervention Recommendation Box */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="material-symbols-outlined text-rose-400 text-base shrink-0 mt-0.5">
                      recommend
                    </span>
                    <p className="leading-relaxed">
                      <strong className="text-rose-300 font-bold">Rekomendasi Intervensi: </strong>
                      {tp.interventionNote}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-2xl text-white">
            <h2 className="font-['Hanken_Grotesk'] text-xl font-black text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 bg-emerald-400/10 p-2 rounded-xl">
                workspace_premium
              </span>
              Peringkat Teratas (Top Performers)
            </h2>
            <div className="space-y-3">
              {highPerformers.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">
                      {st.initials}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">
                        {st.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        ID: {st.studentId}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-black text-emerald-400">
                      {st.avg.toFixed(1)}
                    </span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Rata-rata</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Intervention Needed Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-2xl text-white">
            <h2 className="font-['Hanken_Grotesk'] text-xl font-black text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 bg-rose-500/10 p-2 rounded-xl">
                error_med
              </span>
              Siswa Perlu Bimbingan Ekstra
            </h2>
            <div className="space-y-3">
              {needsAttention.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
                  <p className="text-sm text-slate-400 font-medium">
                    Semua siswa berada di atas ambang batas bimbingan.
                  </p>
                </div>
              ) : (
                needsAttention.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xs">
                        {st.initials}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">
                          {st.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Matematika: {st.grades.matematika} • IPA: {st.grades.ipa}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-lg font-black text-rose-400">
                        {st.avg.toFixed(1)}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Rata-rata</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* WEEKLY EMAIL SCHEDULE MODAL */}
        <AnimatePresence>
          {isScheduleModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl text-white my-8 flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-6 md:p-8 border-b border-slate-800 flex items-start justify-between gap-4 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
                      <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-['Hanken_Grotesk'] text-2xl font-black text-white">
                          Penjadwalan Email Orang Tua
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Otomatis Mingguan
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Kirim ringkasan performa siswa ke email orang tua secara berkala atau jadwalkan pengiriman mingguan.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                <div className="p-6 md:p-8 space-y-6 flex-1">
                  {/* Status & Toggle Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 to-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Status Jadwal Pengiriman Mingguan</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            scheduleConfig.enabled
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {scheduleConfig.enabled ? '● Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {scheduleConfig.enabled
                          ? `Jadwal aktif dikirim setiap hari ${scheduleConfig.dayOfWeek} pukul ${scheduleConfig.timeOfDay} WIB. (Terakhir dikirim: ${scheduleConfig.lastSentDate})`
                          : 'Penjadwalan otomatis saat ini dinonaktifkan.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScheduleConfig({ ...scheduleConfig, enabled: !scheduleConfig.enabled })}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                        scheduleConfig.enabled
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {scheduleConfig.enabled ? 'toggle_on' : 'toggle_off'}
                      </span>
                      {scheduleConfig.enabled ? 'Jadwal Aktif' : 'Aktifkan Jadwal'}
                    </button>
                  </div>

                  {/* Config Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Schedule Day & Time */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400 text-base">calendar_today</span>
                        Hari & Jam Pengiriman
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[11px] text-slate-400 block mb-1">Hari:</span>
                          <select
                            value={scheduleConfig.dayOfWeek}
                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, dayOfWeek: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
                          >
                            <option value="Senin">Setiap Hari Senin</option>
                            <option value="Kamis">Setiap Hari Kamis</option>
                            <option value="Jumat">Setiap Hari Jumat</option>
                            <option value="Sabtu">Setiap Hari Sabtu</option>
                            <option value="Minggu">Setiap Hari Minggu</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block mb-1">Jam (WIB):</span>
                          <input
                            type="time"
                            value={scheduleConfig.timeOfDay}
                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, timeOfDay: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Target Recipients */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400 text-base">groups</span>
                        Target Penerima Email
                      </label>
                      <select
                        value={scheduleConfig.targetRecipients}
                        onChange={(e) =>
                          setScheduleConfig({
                            ...scheduleConfig,
                            targetRecipients: e.target.value as 'all' | 'remedial' | 'top',
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">Semua Orang Tua Siswa ({students.length} Orang)</option>
                        <option value="remedial">
                          Hanya Siswa Belum Tuntas KKTP (&lt; {passingThreshold}) ({needsAttention.length + mediumPerformers.filter(m => m.avg < passingThreshold).length} Orang)
                        </option>
                        <option value="top">Hanya Siswa Performa Tinggi (&ge; 85) ({highPerformers.length} Orang)</option>
                      </select>
                    </div>

                    {/* Format Attachments */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400 text-base">attachment</span>
                        Format Konten & Lampiran Laporan
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="flex items-center gap-2.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                          <input
                            type="checkbox"
                            checked={scheduleConfig.includePdf}
                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, includePdf: e.target.checked })}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">Lampiran Rapor PDF</p>
                            <p className="text-[10px] text-slate-400">Lembar hasil belajar siswa sementara</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                          <input
                            type="checkbox"
                            checked={scheduleConfig.includeSummaryText}
                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, includeSummaryText: e.target.checked })}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">Rangkuman Teks Nilai</p>
                            <p className="text-[10px] text-slate-400">Ringkasan nilai pada bodi email</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                          <input
                            type="checkbox"
                            checked={scheduleConfig.includeExcel}
                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, includeExcel: e.target.checked })}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">Lampiran Excel (.xlsx)</p>
                            <p className="text-[10px] text-slate-400">Tabel Rapor format spreadsheet</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Email Subject & Note Template */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400 text-base">edit_note</span>
                        Subjek & Catatan Pengantar Email
                      </label>

                      <div className="space-y-2">
                        <div>
                          <span className="text-[11px] text-slate-400 block mb-1">Subjek Email:</span>
                          <input
                            type="text"
                            value={scheduleConfig.subjectTemplate}
                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, subjectTemplate: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                            placeholder="Subjek email..."
                          />
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 block mb-1">Pesan Catatan Guru:</span>
                          <textarea
                            rows={2}
                            value={scheduleConfig.customIntro}
                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, customIntro: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                            placeholder="Tuliskan pesan pembuka untuk orang tua..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parent Email Directory Table */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-2">
                          <span className="material-symbols-outlined text-indigo-400 text-lg">contacts</span>
                          Daftar Email Orang Tua Siswa ({students.length})
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Pastikan alamat email wali murid sudah sesuai agar laporan terkirim dengan tepat.
                        </p>
                      </div>

                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-sm">
                          search
                        </span>
                        <input
                          type="text"
                          placeholder="Cari nama siswa / email..."
                          value={emailSearchQuery}
                          onChange={(e) => setEmailSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-56"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-56">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-bold sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5">Siswa</th>
                            <th className="p-2.5">Wali Murid</th>
                            <th className="p-2.5">Email Penerima</th>
                            <th className="p-2.5 text-center">Rata-rata</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {students
                            .filter(
                              (st) =>
                                st.name.toLowerCase().includes(emailSearchQuery.toLowerCase()) ||
                                (parentEmails[st.id] || '').toLowerCase().includes(emailSearchQuery.toLowerCase()) ||
                                (st.parentName || '').toLowerCase().includes(emailSearchQuery.toLowerCase())
                            )
                            .map((st) => {
                              const stAvg =
                                (st.grades.matematika + st.grades.indonesia + st.grades.ipa + st.grades.ips) / 4;
                              return (
                                <tr key={st.id} className="hover:bg-slate-900/50">
                                  <td className="p-2.5 font-bold text-white">
                                    {st.name}
                                    <span className="block text-[10px] text-slate-500 font-normal">NIS: {st.studentId}</span>
                                  </td>
                                  <td className="p-2.5 text-slate-300 font-medium">{st.parentName || 'Orang Tua / Wali'}</td>
                                  <td className="p-2.5">
                                    <input
                                      type="email"
                                      value={
                                        parentEmails[st.id] !== undefined
                                          ? parentEmails[st.id]
                                          : `ortu.${st.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`
                                      }
                                      onChange={(e) => handleParentEmailChange(st.id, e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                                    />
                                  </td>
                                  <td className="p-2.5 text-center font-bold font-mono">
                                    <span className={stAvg >= passingThreshold ? 'text-emerald-400' : 'text-rose-400'}>
                                      {stAvg.toFixed(1)}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      Terjadwal
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sending Progress & Logs during test broadcast */}
                  {isSendingTestEmails && (
                    <div className="bg-indigo-950/50 border border-indigo-500/40 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-200">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-indigo-400 animate-spin">
                            sync
                          </span>
                          Sedang Memproses Pengiriman Email Performa Siswa...
                        </span>
                        <span>{sendProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${sendProgress}%` }}
                        />
                      </div>
                      <div className="max-h-24 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                        {sendLogs.map((log, idx) => (
                          <p key={idx}>{log}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="p-6 md:p-8 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleSendTestEmails}
                    disabled={isSendingTestEmails}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    Kirim Email Uji Coba Sekarang
                  </button>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setIsScheduleModalOpen(false)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveScheduleConfig}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <span className="material-symbols-outlined text-base">save</span>
                      Simpan Jadwal Mingguan
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DIGITAL SIGNATURE MODAL */}
        <AnimatePresence>
          {isSignatureModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl text-white my-8 flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-6 md:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                      <span className="material-symbols-outlined text-2xl">draw</span>
                    </div>
                    <div>
                      <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white flex items-center gap-2">
                        Pengesahan & Tanda Tangan Digital Rapor
                      </h3>
                      <p className="text-xs text-slate-400">
                        Buat atau unggah tanda tangan digital wali kelas untuk pengesahan otomatis pada dokumen PDF Rapor.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSignatureModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 md:p-8 overflow-y-auto space-y-6">
                  {/* Toggle & Quick Status Banner */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-3.5 h-3.5 rounded-full ${signatureConfig.enabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'}`} />
                      <div>
                        <p className="text-xs font-bold text-white">
                          Status Tanda Tangan Digital: {signatureConfig.enabled ? 'AKTIF' : 'NONAKTIF'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {signatureConfig.enabled
                            ? 'Tanda tangan digital dan stempel validasi akan otomatis tertera pada cetakan PDF Rapor.'
                            : 'Tanda tangan digital tidak akan dicetak pada PDF Rapor.'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={signatureConfig.enabled}
                        onChange={(e) =>
                          setSignatureConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Teacher Information Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Nama Lengkap & Gelar Wali Kelas:
                      </label>
                      <input
                        type="text"
                        value={signatureConfig.teacherName}
                        onChange={(e) =>
                          setSignatureConfig((prev) => ({ ...prev, teacherName: e.target.value }))
                        }
                        placeholder="Contoh: Drs. Ahmad Dahlan, M.Pd"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        NIP / NUPTK Wali Kelas:
                      </label>
                      <input
                        type="text"
                        value={signatureConfig.teacherNip}
                        onChange={(e) =>
                          setSignatureConfig((prev) => ({ ...prev, teacherNip: e.target.value }))
                        }
                        placeholder="Contoh: 19850312 201001 1 002"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* DRAWING CANVAS SIGNATURE PAD */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-400 text-sm">edit</span>
                        Pad Tanda Tangan Digital (Goreskan pada Kotak di Bawah)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">Warna Tinta:</span>
                        <button
                          type="button"
                          onClick={() => setSigPenColor('#0f172a')}
                          className={`w-5 h-5 rounded-full bg-slate-900 border ${sigPenColor === '#0f172a' ? 'ring-2 ring-emerald-400 border-white' : 'border-slate-700'}`}
                          title="Tinta Slate / Navy"
                        />
                        <button
                          type="button"
                          onClick={() => setSigPenColor('#1e1b4b')}
                          className={`w-5 h-5 rounded-full bg-indigo-950 border ${sigPenColor === '#1e1b4b' ? 'ring-2 ring-emerald-400 border-white' : 'border-slate-700'}`}
                          title="Tinta Biru Gelap / Indigo"
                        />
                        <button
                          type="button"
                          onClick={() => setSigPenColor('#000000')}
                          className={`w-5 h-5 rounded-full bg-black border ${sigPenColor === '#000000' ? 'ring-2 ring-emerald-400 border-white' : 'border-slate-700'}`}
                          title="Tinta Hitam Pekat"
                        />
                      </div>
                    </div>

                    <div className="relative bg-white rounded-2xl border-2 border-slate-700 overflow-hidden shadow-inner touch-none">
                      <canvas
                        ref={sigCanvasRef}
                        width={600}
                        height={160}
                        onMouseDown={startSigDrawing}
                        onMouseMove={drawSig}
                        onMouseUp={stopSigDrawing}
                        onMouseLeave={stopSigDrawing}
                        onTouchStart={startSigDrawing}
                        onTouchMove={drawSig}
                        onTouchEnd={stopSigDrawing}
                        className="w-full h-40 cursor-crosshair bg-white"
                      />
                      {!signatureConfig.signatureDataUrl && !isDrawingSig && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-3xl mb-1">gesture</span>
                          <span className="text-xs font-medium">Goreskan tanda tangan Anda di sini menggunakan mouse atau touch screen</span>
                        </div>
                      )}
                    </div>

                    {/* Canvas Action Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleClearSigCanvas}
                          className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Bersihkan Canvas
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateSampleSignature}
                          className="px-3.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                          Contoh Tanda Tangan Otomatis
                        </button>
                      </div>

                      <label className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
                        <span className="material-symbols-outlined text-sm">upload_file</span>
                        Unggah Gambar (.PNG/.JPG)
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadSignatureFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Stamp & Verification Badge Settings */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={signatureConfig.includeStamp}
                        onChange={(e) =>
                          setSignatureConfig((prev) => ({ ...prev, includeStamp: e.target.checked }))
                        }
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-white">
                        Sertakan Stempel Validasi Digital & Kode Verifikasi (E-SIGN Badge)
                      </span>
                    </label>

                    {signatureConfig.includeStamp && (
                      <div className="flex items-center gap-3 pt-1">
                        <label className="text-xs text-slate-400 font-medium shrink-0">
                          Kode Referensi Stempel:
                        </label>
                        <input
                          type="text"
                          value={signatureConfig.stampCode}
                          onChange={(e) =>
                            setSignatureConfig((prev) => ({ ...prev, stampCode: e.target.value }))
                          }
                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-emerald-400 font-mono w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* PREVIEW BOX */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Tampilan Pengesahan pada PDF Rapor:
                    </span>
                    <div className="p-4 bg-white rounded-xl text-slate-900 text-xs flex flex-col items-end justify-center min-h-[130px] border border-slate-300">
                      <div className="text-right space-y-1">
                        <p className="font-semibold">Kota, 3 Agustus 2026</p>
                        <p className="font-semibold">{signatureConfig.teacherTitle}</p>
                        <div className="h-12 my-1 flex items-center justify-end">
                          {signatureConfig.signatureDataUrl ? (
                            <img
                              src={signatureConfig.signatureDataUrl}
                              alt="Tanda Tangan Digital"
                              className="h-12 object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              [ Area Tanda Tangan Digital ]
                            </span>
                          )}
                        </div>
                        <p className="font-bold underline">{signatureConfig.teacherName || '( Nama Wali Kelas )'}</p>
                        {signatureConfig.teacherNip && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            NIP. {signatureConfig.teacherNip}
                          </p>
                        )}
                        {signatureConfig.includeStamp && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded text-[9px] text-emerald-700 font-bold">
                            <span className="material-symbols-outlined text-[12px] text-emerald-600">
                              verified
                            </span>
                            DISAHKAN SECARA DIGITAL ({signatureConfig.stampCode})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 md:p-8 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSignatureConfig}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    Simpan Tanda Tangan Digital
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: KELOLA SEMUA CATATAN PERSONAL & EVALUASI SISWA */}
        <AnimatePresence>
          {isNotesModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-white"
              >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                      <span className="material-symbols-outlined text-2xl">edit_note</span>
                    </div>
                    <div>
                      <h3 className="font-['Hanken_Grotesk'] text-xl font-black text-white">
                        Kelola Catatan Personal & Komentar Evaluasi Siswa
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Komentar ini akan dicetak pada lembar Rapor PDF dan lampiran rekapitulasi kelas.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsNotesModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
                  {/* Search Bar & Auto Filler */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="relative w-full sm:w-72">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">
                        search
                      </span>
                      <input
                        type="text"
                        value={notesSearchQuery}
                        onChange={(e) => setNotesSearchQuery(e.target.value)}
                        placeholder="Cari siswa atau NIS..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...studentNotes };
                          students.forEach((s) => {
                            const avg = Number(
                              ((s.grades.matematika + s.grades.indonesia + s.grades.ipa + s.grades.ips) / 4).toFixed(1)
                            );
                            if (avg >= 85) {
                              updated[s.id] = 'Siswa sangat aktif, santun, dan menunjukkan prestasi yang sangat baik di kelas.';
                            } else if (avg >= 75) {
                              updated[s.id] = 'Siswa memiliki pemahaman materi yang baik. Tingkatkan lagi ketelitian saat latihan.';
                            } else {
                              updated[s.id] = 'Siswa memerlukan bimbingan tambahan dan latihan mandiri di rumah.';
                            }
                          });
                          setStudentNotes(updated);
                          localStorage.setItem('student_personal_evaluation_notes_v1', JSON.stringify(updated));
                          triggerToast('✓ Semua catatan evaluasi siswa berhasil diisi rekomendasi otomatis!');
                        }}
                        className="px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                        Isi Rekomendasi Otomatis
                      </button>
                    </div>
                  </div>

                  {/* Student Note Cards List */}
                  <div className="space-y-4">
                    {students
                      .filter(
                        (s) =>
                          s.name.toLowerCase().includes(notesSearchQuery.toLowerCase()) ||
                          s.studentId.includes(notesSearchQuery)
                      )
                      .map((st) => {
                        const avg = Number(
                          ((st.grades.matematika + st.grades.indonesia + st.grades.ipa + st.grades.ips) / 4).toFixed(1)
                        );
                        return (
                          <div
                            key={st.id}
                            className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-slate-200">
                                  {st.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                    {st.name}
                                    <span className="text-[10px] font-mono text-slate-400">
                                      NIS: {st.studentId}
                                    </span>
                                  </h4>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">
                                  Rata-rata: <strong className="text-rose-400 font-mono">{avg}</strong>
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    avg >= passingThreshold
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  {avg >= passingThreshold ? 'TUNTAS KKTP' : 'REMEDIAL'}
                                </span>
                              </div>
                            </div>

                            <textarea
                              rows={2}
                              value={studentNotes[st.id] || ''}
                              onChange={(e) => handleSaveStudentNote(st.id, e.target.value)}
                              placeholder="Ketik catatan personal atau komentar evaluasi untuk siswa ini..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-medium leading-relaxed"
                            />

                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">
                                Quick Preset:
                              </span>
                              {[
                                '🌟 Sangat aktif & berprestasi.',
                                '💡 Pemahaman baik, tingkatkan ketelitian.',
                                '📚 Perlu bimbingan membaca.',
                                '🎯 Perlu latihan remedial.',
                              ].map((chip, cIdx) => (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => handleSaveStudentNote(st.id, chip)}
                                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded text-[10px] transition-all cursor-pointer"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    Tersimpan otomatis ke penyimpanan lokal (localStorage)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerToast('✓ Semua catatan personal & komentar evaluasi siswa tersimpan!');
                      setIsNotesModalOpen(false);
                    }}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">check</span>
                    Selesai & Simpan
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
