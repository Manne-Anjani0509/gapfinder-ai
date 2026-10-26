'use client';

import React from 'react';
import { Info, ChevronDown } from 'lucide-react';

export function TopicPerformanceCard() {
  const subjects = [
    { name: 'Physics', percentage: 68, color: '#818CF8' },
    { name: 'Chemistry', percentage: 54, color: '#FDBA74' },
    { name: 'Mathematics', percentage: 78, color: '#C084FC' },
    { name: 'Biology', percentage: 62, color: '#60A5FA' },
    { name: 'English', percentage: 85, color: '#A5B4FC' },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(110,130,160,0.06)] border border-slate-100 flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
            Topic-wise Performance
          </h2>
          <button className="text-slate-400 hover:text-slate-600" title="Performance breakdown by subject">
            <Info className="w-4 h-4" />
          </button>
        </div>

        <button className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-medium text-slate-600 transition-colors">
          <span>By Subject</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Chart Canvas */}
      <div className="relative pt-2 pb-1">
        {/* Y-axis background grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pl-6 pr-1 pb-6">
          <div className="border-b border-dashed border-slate-100 w-full" />
          <div className="border-b border-dashed border-slate-100 w-full" />
          <div className="border-b border-dashed border-slate-100 w-full" />
          <div className="border-b border-dashed border-slate-100 w-full" />
          <div className="border-b border-slate-100 w-full" />
        </div>

        {/* Bars Container */}
        <div className="relative flex items-end justify-between h-36 pl-6 pr-2">
          {/* Y Axis Labels */}
          <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] font-medium text-slate-400">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>

          {/* Individual Bars */}
          {subjects.map((sub) => (
            <div key={sub.name} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              {/* Percentage label above bar */}
              <span className="text-[11px] font-bold text-slate-700">
                {sub.percentage}%
              </span>

              {/* Bar Column */}
              <div className="w-6 sm:w-7 bg-slate-100 rounded-t-lg h-28 flex items-end overflow-hidden">
                <div
                  className="w-full rounded-t-lg transition-all duration-700 ease-out"
                  style={{
                    height: `${sub.percentage}%`,
                    backgroundColor: sub.color,
                  }}
                />
              </div>

              {/* Subject Name */}
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 w-full text-center mt-0.5 tracking-tight">
                {sub.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
