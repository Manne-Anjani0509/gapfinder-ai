'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send } from 'lucide-react';

export function ExplainTopicCard() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const quickTopics = [
    'Rotational motion',
    'Chemical bonding',
    'Probability',
    'Derivatives',
  ];

  const handleAsk = (text?: string) => {
    const q = text || query;
    if (!q.trim()) return;
    router.push(`/tutor?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(110,130,160,0.06)] border border-slate-100 flex flex-col justify-between">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
            Explain This Topic
          </h2>
        </div>
        <p className="text-xs text-[#64748B] mt-1">
          Get a simple, step-by-step explanation with examples.
        </p>
      </div>

      {/* Input Field with Inset Soft Style */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="relative my-auto"
      >
        <div className="relative flex items-center rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-1.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Ask about any topic... (e.g. "Explain rotational motion in simple terms")'
            className="w-full bg-transparent px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="w-8 h-8 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white flex items-center justify-center shadow-xs transition-colors shrink-0"
            aria-label="Send question to AI Tutor"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Suggestion Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2">
        {quickTopics.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => handleAsk(topic)}
            className="px-3 py-1 rounded-full bg-slate-50 hover:bg-indigo-50 border border-slate-200/70 hover:border-indigo-200 text-[11px] font-medium text-slate-600 hover:text-indigo-700 transition-colors"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}
