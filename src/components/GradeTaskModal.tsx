import React, { useState } from 'react';
import { TaskToGrade, StudentGradeRecord } from '../types';

interface GradeTaskModalProps {
  task: TaskToGrade | null;
  students: StudentGradeRecord[];
  onClose: () => void;
  onSaveScores: (taskId: string, scores: { [studentId: string]: number }) => void;
}

export const GradeTaskModal: React.FC<GradeTaskModalProps> = ({
  task,
  students,
  onClose,
  onSaveScores,
}) => {
  const [taskScores, setTaskScores] = useState<{ [studentId: string]: number }>({});

  if (!task) return null;

  const handleScoreChange = (studentId: string, val: number) => {
    setTaskScores((prev) => ({
      ...prev,
      [studentId]: Math.min(100, Math.max(0, val)),
    }));
  };

  const handleSave = () => {
    onSaveScores(task.id, taskScores);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-[32px] max-w-xl w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] flex flex-col text-white">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <div>
            <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-1 bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {task.subject}
            </span>
            <h3 className="font-['Hanken_Grotesk'] text-xl font-bold text-white">
              Nilai: {task.title}
            </h3>
            <p className="text-xs text-slate-400">{task.submittedTime}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-xl p-1 hover:bg-slate-800 cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
          {students.map((student) => {
            const currentScore =
              taskScores[student.id] !== undefined
                ? taskScores[student.id]
                : task.subject === 'Matematika'
                ? student.grades.matematika
                : task.subject === 'Sains'
                ? student.grades.ipa
                : student.grades.indonesia;

            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                    {student.initials}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">
                      {student.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      ID: {student.studentId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentScore}
                    onChange={(e) =>
                      handleScoreChange(student.id, Number(e.target.value))
                    }
                    className="grade-input w-16 p-1.5 text-center border border-slate-700 rounded-xl bg-slate-900 font-mono text-sm font-black text-rose-400 focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
              </div>
            );
          })}
        </div>

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
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Simpan Nilai Tugas
          </button>
        </div>
      </div>
    </div>
  );
};
