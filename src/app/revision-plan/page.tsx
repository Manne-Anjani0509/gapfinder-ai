'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { RevisionTask, RevisionPlan } from '@/types';
import {
  CalendarCheck2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  ArrowRight,
  BookOpen,
  Check,
  BotMessageSquare,
} from 'lucide-react';

const TIME_OPTIONS = [
  { minutes: 15, label: '15 Min', desc: 'Quick Sprint' },
  { minutes: 30, label: '30 Min', desc: 'Targeted Gap Fix' },
  { minutes: 45, label: '45 Min', desc: 'Standard Session' },
  { minutes: 60, label: '60 Min', desc: 'Deep Focus' },
  { minutes: 90, label: '90 Min', desc: 'Comprehensive' },
];

export default function RevisionPlanPage() {
  const { revisionPlan, setRevisionPlan, toggleTaskComplete, gapReport, isDemoMode, authFetch } = useApp();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(
    revisionPlan?.availableMinutes || 45
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate or regenerate plan
  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await authFetch('/api/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableMinutes: selectedMinutes,
          evidenceList: gapReport.evidenceList,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate plan');
      }

      setRevisionPlan(data.plan);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating plan.');
    } finally {
      setIsGenerating(false);
    }
  };

  const tasks = revisionPlan?.tasks || [];
  const completedTasks = tasks.filter((t) => t.completed);
  const completedMinutes = completedTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const totalPlanMinutes = tasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Personalized Revision Roadmap</h2>
            {isDemoMode && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Demo Revision Schedule
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Prioritized tasks dynamically calibrated to your weak topics, assessment evidence, and available study time.
          </p>
        </div>
      </div>

      {/* Time Budget Selector & Generator */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Select Your Available Study Window
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => setSelectedMinutes(opt.minutes)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedMinutes === opt.minutes
                    ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>{opt.label}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <p className="text-xs text-slate-500">
            Based on <strong>{gapReport.weakCount}</strong> weak topics and{' '}
            <strong>{gapReport.assessedCount}</strong> assessed topics.
          </p>

          <button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Calibrating Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{revisionPlan ? 'Regenerate Study Plan' : 'Generate Personalized Plan'}</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Active Plan Overview */}
      {revisionPlan && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              {totalPlanMinutes > 0 ? `${Math.round((completedMinutes / totalPlanMinutes) * 100)}%` : '0%'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Session Progress: {completedTasks.length} of {tasks.length} tasks completed
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {completedMinutes} of {totalPlanMinutes} minutes completed &bull; Calibrated {new Date(revisionPlan.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
              {revisionPlan.availableMinutes} Min Total Allocation
            </span>
          </div>
        </div>
      )}

      {/* Revision Tasks List */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
            <CalendarCheck2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No active revision schedule</p>
            <p className="text-xs text-slate-500 mt-1">
              Select your available study time above and click "Generate Personalized Plan".
            </p>
          </div>
        ) : (
          tasks.map((task, idx) => {
            const isHigh = task.priority === 'high';
            const isMedium = task.priority === 'medium';

            let priorityBadge = 'bg-slate-100 text-slate-600 border-slate-200';
            if (isHigh) {
              priorityBadge = 'bg-rose-50 text-rose-700 border-rose-300';
            } else if (isMedium) {
              priorityBadge = 'bg-amber-50 text-amber-700 border-amber-300';
            }

            return (
              <div
                key={task.id}
                className={`p-6 bg-white rounded-2xl border shadow-xs transition-all ${
                  task.completed
                    ? 'border-slate-200/60 bg-slate-50/60 opacity-60'
                    : 'border-slate-200/80 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Custom Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleTaskComplete(task.id)}
                    className={`mt-1 w-6 h-6 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                      task.completed
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white hover:border-indigo-500'
                    }`}
                    aria-label={`Toggle task ${task.title}`}
                  >
                    {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityBadge}`}
                        >
                          {task.priority.toUpperCase()} PRIORITY
                        </span>
                        <span className="text-xs font-semibold text-indigo-600">
                          {task.topicName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Estimated: {task.estimatedMinutes} minutes</span>
                      </div>
                    </div>

                    <h3
                      className={`text-base font-bold mt-2 ${
                        task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h3>

                    <p className="text-xs text-slate-400 mt-0.5">
                      Target Material: {task.materialTitle}
                    </p>

                    {/* Action Items List */}
                    <div className="mt-4 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                      <p className="text-xs font-bold text-slate-700 mb-2">
                        Actionable Revision Checklist:
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {task.actionItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-500 font-bold">&bull;</span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Source excerpt */}
                    {task.sourcePassage && (
                      <div className="mt-3 text-xs text-slate-500 font-sans">
                        <span className="font-semibold text-slate-700">Review Passage: </span>
                        <span className="italic">"{task.sourcePassage.slice(0, 220)}..."</span>
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <Link
                        href={`/tutor?topic=${encodeURIComponent(task.topicName)}`}
                        className="flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <BotMessageSquare className="w-3.5 h-3.5" />
                        <span>Ask AI Tutor to clarify this concept</span>
                      </Link>

                      <Link
                        href={`/quiz?topic=${encodeURIComponent(task.topicName)}`}
                        className="px-3 py-1.5 rounded-xl font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                      >
                        Retake Topic Quiz
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
