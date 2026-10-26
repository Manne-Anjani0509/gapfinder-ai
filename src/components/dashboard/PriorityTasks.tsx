'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Clock, Check, ArrowRight, Sparkles } from 'lucide-react';

export function PriorityTasks() {
  const { revisionPlan, toggleTaskComplete } = useApp();

  const tasks = revisionPlan?.tasks || [];
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-bold text-[#172033] tracking-tight">
              Today&apos;s Revision Plan
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {tasks.length > 0
                ? `${completedCount} of ${tasks.length} tasks completed (${revisionPlan?.availableMinutes || 45} min)`
                : 'No active revision tasks'}
            </p>
          </div>

          <Link
            href="/revision-plan"
            className="text-xs font-semibold text-[#4F46E5] hover:text-indigo-800 inline-flex items-center gap-1"
          >
            <span>Customize Plan</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {tasks.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
            <p className="text-sm font-medium text-slate-700">No revision plan generated yet</p>
            <p className="text-xs mt-1 text-[#64748B]">
              Generate a study schedule focused on your lowest-scoring diagnostic topics.
            </p>
            <Link
              href="/revision-plan"
              className="inline-block mt-3 px-3.5 py-1.5 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              Generate Revision Plan
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {tasks.slice(0, 4).map((task) => {
              const isHigh = task.priority === 'high';
              const isMedium = task.priority === 'medium';

              let priorityBadge = 'bg-slate-100 text-slate-700 border-slate-200';
              if (isHigh) {
                priorityBadge = 'bg-red-50 text-red-700 border-red-200';
              } else if (isMedium) {
                priorityBadge = 'bg-amber-50 text-amber-700 border-amber-200';
              }

              return (
                <div
                  key={task.id}
                  onClick={() => toggleTaskComplete(task.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    task.completed
                      ? 'bg-slate-50/60 border-slate-200/60 opacity-60'
                      : 'bg-white border-[#E2E8F0] hover:border-indigo-200 hover:bg-indigo-50/20'
                  }`}
                >
                  {/* Custom Checkbox */}
                  <button
                    type="button"
                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                      task.completed
                        ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                        : 'border-slate-300 bg-white hover:border-[#4F46E5]'
                    }`}
                    aria-label={`Mark task ${task.title} as ${
                      task.completed ? 'incomplete' : 'complete'
                    }`}
                  >
                    {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-xs font-semibold leading-snug break-words ${
                          task.completed
                            ? 'line-through text-slate-400'
                            : 'text-[#172033]'
                        }`}
                      >
                        {task.title}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <span className="flex items-center gap-0.5 text-[11px] text-[#64748B] font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {task.estimatedMinutes}m
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border uppercase ${priorityBadge}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    {task.actionItems.length > 0 && (
                      <p className="text-[11px] text-[#64748B] mt-1 line-clamp-1">
                        {task.actionItems[0]}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium truncate max-w-[140px]">
                        {task.topicName}
                      </span>
                      <span className="text-slate-400 truncate max-w-[160px]">
                        From: {task.materialTitle}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
        <span>
          {tasks.length > 0 ? `${tasks.length - completedCount} tasks remaining` : 'No pending tasks'}
        </span>
        <span className="text-[10px] text-slate-400">
          Targeted to diagnostic gaps
        </span>
      </div>
    </div>
  );
}
