'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ExtractedTopic, TopicStatus } from '@/types';
import {
  Network,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BotMessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';

export default function TopicMapPage() {
  const { materials, gapReport, isDemoMode } = useApp();

  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  // Combine topics across materials and merge with assessment accuracy from gapReport
  const topicsWithStats = useMemo(() => {
    const list: (ExtractedTopic & {
      materialFileName?: string;
      questionsAttempted: number;
      correctAnswers: number;
      accuracy: number;
      calculatedStatus: TopicStatus;
    })[] = [];

    for (const mat of materials) {
      if (!mat.topics) continue;
      for (const t of mat.topics) {
        // Find matching evidence from gapReport
        const ev = gapReport.evidenceList.find(
          (e) => e.topicName.trim().toLowerCase() === t.name.trim().toLowerCase()
        );

        list.push({
          ...t,
          materialTitle: mat.title,
          materialFileName: mat.fileName,
          questionsAttempted: ev?.questionsAttempted || 0,
          correctAnswers: ev?.correctAnswers || 0,
          accuracy: ev?.accuracy || 0,
          calculatedStatus: ev?.classification || 'Unassessed',
        });
      }
    }
    return list;
  }, [materials, gapReport]);

  // Filter topics
  const filteredTopics = useMemo(() => {
    return topicsWithStats.filter((t) => {
      const matchesMaterial =
        selectedMaterialId === 'all' || t.materialId === selectedMaterialId;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'assessed' && t.calculatedStatus !== 'Unassessed') ||
        (statusFilter === 'unassessed' && t.calculatedStatus === 'Unassessed') ||
        (statusFilter === 'weak' && t.calculatedStatus === 'Weak') ||
        (statusFilter === 'strong' && t.calculatedStatus === 'Strong');

      const matchesSearch =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subtopics?.some((st) => st.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.keyConcepts?.some((kc) => kc.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesMaterial && matchesStatus && matchesSearch;
    });
  }, [topicsWithStats, selectedMaterialId, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Syllabus Topic Map</h2>
          <p className="text-xs text-slate-500">
            Hierarchy of course topics and subtopics linked directly to source passages and diagnostic coverage.
          </p>
        </div>

        <Link
          href="/quiz"
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
        >
          Assess Unassessed Topics
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search topics, subtopics, or concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Material Filter */}
          <select
            value={selectedMaterialId}
            onChange={(e) => setSelectedMaterialId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Study Materials ({materials.length})</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Coverage Statuses</option>
            <option value="assessed">Assessed Only</option>
            <option value="unassessed">Unassessed Only</option>
            <option value="weak">Weak Gaps (&lt;50%)</option>
            <option value="strong">Mastered (≥80%)</option>
          </select>
        </div>

        {/* Stats counter */}
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredTopics.length}</strong> of{' '}
          <strong>{topicsWithStats.length}</strong> topics
        </div>
      </div>

      {/* Topics Grid */}
      {filteredTopics.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
          <Network className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No topics match your filter</p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search criteria or upload additional materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTopics.map((topic) => {
            const isExpanded = expandedTopicId === topic.id;
            const isUnassessed = topic.calculatedStatus === 'Unassessed';
            const isWeak = topic.calculatedStatus === 'Weak';
            const isMedium = topic.calculatedStatus === 'Medium';
            const isStrong = topic.calculatedStatus === 'Strong';

            let statusBadge = 'bg-slate-100 text-slate-600 border-slate-200';
            if (isWeak) {
              statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
            } else if (isMedium) {
              statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
            } else if (isStrong) {
              statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            }

            return (
              <div
                key={topic.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}
                    >
                      {topic.calculatedStatus}
                      {!isUnassessed && ` (${topic.accuracy}%)`}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {isUnassessed
                        ? '0 tests'
                        : `${topic.correctAnswers}/${topic.questionsAttempted} correct`}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                    {topic.name}
                  </h3>

                  {/* Linked Source Material */}
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate" title={topic.materialTitle}>
                      {topic.materialTitle}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {topic.description}
                  </p>

                  {/* Subtopics */}
                  {topic.subtopics && topic.subtopics.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                        Subtopics & Units
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {topic.subtopics.map((st) => (
                          <span
                            key={st}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Concepts */}
                  {topic.keyConcepts && topic.keyConcepts.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                        Key Concepts
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {topic.keyConcepts.map((kc) => (
                          <span
                            key={kc}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium border border-purple-100/60"
                          >
                            {kc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collapsible Source Passage */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                      className="flex items-center justify-between w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      <span>{isExpanded ? 'Hide Grounding Excerpt' : 'View Source Grounding'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 leading-relaxed font-sans">
                        <p className="font-semibold text-slate-800 mb-1">Source Excerpt:</p>
                        <p className="italic">"{topic.sourcePassage}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footers */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    href={`/tutor?topic=${encodeURIComponent(topic.name)}`}
                    className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium"
                  >
                    <BotMessageSquare className="w-3.5 h-3.5 text-purple-500" />
                    <span>Ask Tutor</span>
                  </Link>

                  <Link
                    href={`/quiz?topic=${encodeURIComponent(topic.name)}`}
                    className="px-3 py-1.5 rounded-xl font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                  >
                    Quiz Topic
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
