import React, { useState } from 'react';
import {
  PageView,
  StudentGradeRecord,
  TaskToGrade,
  AttendanceStatus,
  NotificationItem,
  SubjectItem,
  LingkupMateri,
  TujuanPembelajaran,
  TeacherProfile,
} from './types';
import {
  INITIAL_STUDENTS,
  INITIAL_TASKS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TEACHER_PROFILE,
} from './data/mockData';
import { INITIAL_SUBJECTS, INITIAL_TP_GRADES } from './data/curriculumData';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { GradebookView } from './components/GradebookView';
import { CurriculumView } from './components/CurriculumView';
import { AttendanceView } from './components/AttendanceView';
import { ReportsView } from './components/ReportsView';
import { StudentsView } from './components/StudentsView';

import { NewAssessmentModal } from './components/NewAssessmentModal';
import { GradeTaskModal } from './components/GradeTaskModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpDrawer } from './components/HelpDrawer';
import { AttendanceNoteModal } from './components/AttendanceNoteModal';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { EditProfileModal } from './components/EditProfileModal';

export default function App() {
  const [activeView, setActiveView] = useState<PageView>('grades');
  const [students, setStudents] = useState<StudentGradeRecord[]>(INITIAL_STUDENTS);
  const [tasks, setTasks] = useState<TaskToGrade[]>(INITIAL_TASKS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Teacher Profile State
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(() => {
    const saved = localStorage.getItem('teacher_profile_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_TEACHER_PROFILE;
  });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);

  const handleSaveTeacherProfile = (updated: TeacherProfile) => {
    setTeacherProfile(updated);
    localStorage.setItem('teacher_profile_v1', JSON.stringify(updated));

    // Also update signature config if stored, so teacher name & NIP stay synced in Rapor
    const savedSig = localStorage.getItem('digital_signature_config_v1');
    if (savedSig) {
      try {
        const parsed = JSON.parse(savedSig);
        parsed.teacherName = updated.name;
        parsed.teacherNip = updated.nip;
        parsed.teacherTitle = updated.role;
        localStorage.setItem('digital_signature_config_v1', JSON.stringify(parsed));
      } catch (e) {
        // ignore
      }
    }

    showToast(`✓ Profil Guru "${updated.name}" berhasil disimpan!`);
  };

  // Curriculum Data State
  const [subjects, setSubjects] = useState<SubjectItem[]>(INITIAL_SUBJECTS);
  const [tpGrades, setTpGrades] = useState<{ [studentId: string]: { [tpId: string]: number } }>(
    INITIAL_TP_GRADES
  );

  const [passingThreshold, setPassingThreshold] = useState<number>(80);
  const [classNameTitle, setClassNameTitle] = useState<string>('Kelas 6A');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & UI Controls
  const [isNewAssessmentOpen, setIsNewAssessmentOpen] = useState<boolean>(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState<boolean>(false);
  const [gradingTask, setGradingTask] = useState<TaskToGrade | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [noteStudent, setNoteStudent] = useState<StudentGradeRecord | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Toast banner state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Grade updates for overall subject score
  const handleUpdateGrade = (
    studentId: string,
    field: 'matematika' | 'indonesia' | 'ipa' | 'ips' | string,
    score: number
  ) => {
    const clampedScore = Math.min(100, Math.max(0, score));
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            grades: {
              ...s.grades,
              [field]: clampedScore,
            },
          };
        }
        return s;
      })
    );
  };

  // Update TP grade for a student and re-calculate subject average
  const handleUpdateTpGrade = (
    studentId: string,
    tpId: string,
    score: number,
    subjectId: string
  ) => {
    const clampedScore = Math.min(100, Math.max(0, score));

    // Update TP grade map
    setTpGrades((prev) => {
      const studentMap = prev[studentId] || {};
      const updatedStudentMap = { ...studentMap, [tpId]: clampedScore };

      // Calculate new average for subject
      const targetSubject = subjects.find((s) => s.id === subjectId);
      if (targetSubject) {
        let total = 0;
        let count = 0;
        targetSubject.lingkupMateriList.forEach((lm) => {
          lm.tpList.forEach((tp) => {
            const val = updatedStudentMap[tp.id];
            if (val !== undefined) {
              total += val;
              count++;
            }
          });
        });

        if (count > 0) {
          const newAvg = Math.round(total / count);
          handleUpdateGrade(studentId, subjectId, newAvg);
        }
      }

      return {
        ...prev,
        [studentId]: updatedStudentMap,
      };
    });
  };

  const handleSaveGrades = () => {
    showToast(`✓ Nilai siswa untuk ${classNameTitle} telah berhasil disimpan!`);
  };

  // Curriculum Management Handlers
  const handleAddSubject = (code: string, name: string, icon?: string, color?: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '_').substring(0, 15) + `_${Date.now()}`;
    const newSub: SubjectItem = {
      id,
      code,
      name,
      icon: icon || 'school',
      color: color || 'rose',
      lingkupMateriList: [],
    };
    setSubjects((prev) => [...prev, newSub]);
    showToast(`✓ Mata Pelajaran "${name} (${code})" berhasil ditambahkan!`);
  };

  const handleEditSubject = (id: string, code: string, name: string, icon?: string, color?: string) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, code, name, icon: icon || s.icon, color: color || s.color } : s))
    );
    showToast(`✓ Mata Pelajaran "${name}" berhasil diperbarui.`);
  };

  const handleImportCurriculum = (importedSubjects: SubjectItem[], replace: boolean) => {
    if (replace) {
      setSubjects(importedSubjects);
    } else {
      setSubjects(importedSubjects);
    }
    const totalLm = importedSubjects.reduce((acc, s) => acc + s.lingkupMateriList.length, 0);
    const totalTp = importedSubjects.reduce(
      (acc, s) => acc + s.lingkupMateriList.reduce((sum, lm) => sum + lm.tpList.length, 0),
      0
    );
    showToast(`✓ Berhasil mengimpor ${importedSubjects.length} Mata Pelajaran, ${totalLm} Lingkup Materi, dan ${totalTp} TP dari Excel!`);
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    showToast(`✓ Mata Pelajaran berhasil dihapus.`);
  };

  const handleAddLingkupMateri = (subjectId: string, code: string, title: string) => {
    const lmId = `lm_${Date.now()}`;
    const newLm: LingkupMateri = {
      id: lmId,
      code,
      title,
      tpList: [],
    };

    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === subjectId) {
          return {
            ...s,
            lingkupMateriList: [...s.lingkupMateriList, newLm],
          };
        }
        return s;
      })
    );
    showToast(`✓ Lingkup Materi "${title}" berhasil ditambahkan!`);
  };

  const handleEditLingkupMateri = (
    subjectId: string,
    lmId: string,
    code: string,
    title: string
  ) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === subjectId) {
          return {
            ...s,
            lingkupMateriList: s.lingkupMateriList.map((lm) =>
              lm.id === lmId ? { ...lm, code, title } : lm
            ),
          };
        }
        return s;
      })
    );
    showToast(`✓ Lingkup Materi berhasil diperbarui.`);
  };

  const handleDeleteLingkupMateri = (subjectId: string, lmId: string) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === subjectId) {
          return {
            ...s,
            lingkupMateriList: s.lingkupMateriList.filter((lm) => lm.id !== lmId),
          };
        }
        return s;
      })
    );
    showToast(`✓ Lingkup Materi berhasil dihapus.`);
  };

  const handleAddTP = (
    subjectId: string,
    lmId: string,
    code: string,
    description: string
  ) => {
    const tpId = `tp_${Date.now()}`;
    const newTp: TujuanPembelajaran = {
      id: tpId,
      code,
      description,
    };

    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === subjectId) {
          return {
            ...s,
            lingkupMateriList: s.lingkupMateriList.map((lm) => {
              if (lm.id === lmId) {
                return {
                  ...lm,
                  tpList: [...lm.tpList, newTp],
                };
              }
              return lm;
            }),
          };
        }
        return s;
      })
    );
    showToast(`✓ Tujuan Pembelajaran (${code}) berhasil ditambahkan!`);
  };

  const handleEditTP = (
    subjectId: string,
    lmId: string,
    tpId: string,
    code: string,
    description: string
  ) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === subjectId) {
          return {
            ...s,
            lingkupMateriList: s.lingkupMateriList.map((lm) => {
              if (lm.id === lmId) {
                return {
                  ...lm,
                  tpList: lm.tpList.map((tp) =>
                    tp.id === tpId ? { ...tp, code, description } : tp
                  ),
                };
              }
              return lm;
            }),
          };
        }
        return s;
      })
    );
    showToast(`✓ Tujuan Pembelajaran berhasil diperbarui.`);
  };

  const handleDeleteTP = (subjectId: string, lmId: string, tpId: string) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === subjectId) {
          return {
            ...s,
            lingkupMateriList: s.lingkupMateriList.map((lm) => {
              if (lm.id === lmId) {
                return {
                  ...lm,
                  tpList: lm.tpList.filter((tp) => tp.id !== tpId),
                };
              }
              return lm;
            }),
          };
        }
        return s;
      })
    );
    showToast(`✓ Tujuan Pembelajaran berhasil dihapus.`);
  };

  // Attendance updates
  const handleUpdateAttendance = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, attendanceStatus: status } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, attendanceStatus: 'hadir' as AttendanceStatus }))
    );
    showToast('✓ Semua siswa berhasil ditandai HADIR!');
  };

  const handleSubmitAttendance = () => {
    showToast('✓ Presensi harian siswa telah resmi dikirim!');
  };

  const handleSaveNote = (studentId: string, note: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, attendanceNote: note } : s))
    );
    showToast('✓ Catatan presensi siswa berhasil diperbarui.');
  };

  // New assessment creation
  const handleAddAssessment = (title: string, subjectKey: string) => {
    const sub = subjects.find((s) => s.id === subjectKey);
    const newTask: TaskToGrade = {
      id: `t_${Date.now()}`,
      title,
      subject: sub ? sub.name : 'Matematika',
      subjectColor: 'bg-[#d7e2ff] text-[#004491]',
      submittedTime: 'Baru saja dibuat',
    };

    setTasks((prev) => [newTask, ...prev]);
    showToast(`✓ Assessment baru "${title}" berhasil ditambahkan!`);
  };

  // Task grading from Dashboard
  const handleSaveTaskScores = (
    taskId: string,
    scores: { [studentId: string]: number }
  ) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (scores[s.id] !== undefined) {
          return {
            ...s,
            grades: {
              ...s.grades,
              matematika: scores[s.id],
            },
          };
        }
        return s;
      })
    );

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('✓ Nilai tugas telah berhasil diperbarui ke Gradebook!');
  };

  // Add new student
  const handleAddStudent = (
    name: string,
    studentId: string,
    parentName: string,
    parentPhone: string
  ) => {
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const newStudent: StudentGradeRecord = {
      id: `s_${Date.now()}`,
      no: students.length + 1,
      initials,
      name,
      studentId,
      grades: {
        matematika: 80,
        indonesia: 80,
        ipa: 80,
        ips: 80,
      },
      attendanceStatus: 'hadir',
      attendanceNote: '',
      parentName,
      parentPhone,
    };

    setStudents((prev) => [...prev, newStudent]);
    showToast(`✓ Siswa baru "${name}" (ID: ${studentId}) telah didaftarkan!`);
  };

  const handleEditStudent = (
    id: string,
    name: string,
    studentId: string,
    parentName: string,
    parentPhone: string,
    grades?: { matematika: number; indonesia: number; ipa: number; ips: number }
  ) => {
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            name,
            studentId,
            initials,
            parentName,
            parentPhone,
            grades: grades ? { ...s.grades, ...grades } : s.grades,
          };
        }
        return s;
      })
    );

    showToast(`✓ Data siswa "${name}" berhasil diperbarui!`);
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    showToast('✓ Data siswa telah dihapus.');
  };

  const handleImportStudents = (importedStudents: StudentGradeRecord[], replace: boolean) => {
    setStudents(importedStudents);
    showToast(`✓ Berhasil mengimpor ${importedStudents.length} data siswa dari file Excel!`);
  };

  const handleMarkNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-['Inter',sans-serif]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 border border-rose-400/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenNewAssessment={() => setIsNewAssessmentOpen(true)}
        onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        teacherProfile={teacherProfile}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Top App Bar Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        teacherProfile={teacherProfile}
        onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        notifications={notifications}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[280px] flex flex-col">
        {activeView === 'dashboard' && (
          <DashboardView
            students={students}
            tasks={tasks}
            onOpenGradeTask={(task) => setGradingTask(task)}
            onNavigateToGrades={() => setActiveView('grades')}
            onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
            passingThreshold={passingThreshold}
            classNameTitle={classNameTitle}
          />
        )}

        {activeView === 'grades' && (
          <GradebookView
            students={students}
            subjects={subjects}
            tpGrades={tpGrades}
            onUpdateGrade={handleUpdateGrade}
            onUpdateTpGrade={handleUpdateTpGrade}
            onSaveGrades={handleSaveGrades}
            onNavigateToCurriculum={() => setActiveView('curriculum')}
            passingThreshold={passingThreshold}
            classNameTitle={classNameTitle}
            searchQuery={searchQuery}
          />
        )}

        {activeView === 'curriculum' && (
          <CurriculumView
            subjects={subjects}
            onAddSubject={handleAddSubject}
            onEditSubject={handleEditSubject}
            onDeleteSubject={handleDeleteSubject}
            onAddLingkupMateri={handleAddLingkupMateri}
            onEditLingkupMateri={handleEditLingkupMateri}
            onDeleteLingkupMateri={handleDeleteLingkupMateri}
            onAddTP={handleAddTP}
            onEditTP={handleEditTP}
            onDeleteTP={handleDeleteTP}
            onImportCurriculum={handleImportCurriculum}
            searchQuery={searchQuery}
          />
        )}

        {activeView === 'attendance' && (
          <AttendanceView
            students={students}
            onUpdateAttendance={handleUpdateAttendance}
            onMarkAllPresent={handleMarkAllPresent}
            onSubmitAttendance={handleSubmitAttendance}
            onOpenNoteModal={(s) => setNoteStudent(s)}
            searchQuery={searchQuery}
          />
        )}

        {activeView === 'reports' && (
          <ReportsView
            students={students}
            subjects={subjects}
            tpGrades={tpGrades}
            passingThreshold={passingThreshold}
            classNameTitle={classNameTitle}
            teacherProfile={teacherProfile}
            onShowToast={showToast}
          />
        )}

        {activeView === 'students' && (
          <StudentsView
            students={students}
            onAddStudent={handleAddStudent}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            onImportStudents={handleImportStudents}
            searchQuery={searchQuery}
          />
        )}
      </main>

      {/* Modals & Overlay Drawers */}
      <NewAssessmentModal
        isOpen={isNewAssessmentOpen}
        subjects={subjects}
        onClose={() => setIsNewAssessmentOpen(false)}
        onAddAssessment={handleAddAssessment}
      />

      <GradeTaskModal
        task={gradingTask}
        students={students}
        onClose={() => setGradingTask(null)}
        onSaveScores={handleSaveTaskScores}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        passingThreshold={passingThreshold}
        setPassingThreshold={setPassingThreshold}
        classNameTitle={classNameTitle}
        setClassNameTitle={setClassNameTitle}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
      />

      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <AttendanceNoteModal
        student={noteStudent}
        onClose={() => setNoteStudent(null)}
        onSaveNote={handleSaveNote}
      />

      <CalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
        subjects={subjects}
        classNameTitle={classNameTitle}
        onShowToast={showToast}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        teacherProfile={teacherProfile}
        onSaveProfile={handleSaveTeacherProfile}
      />
    </div>
  );
}
