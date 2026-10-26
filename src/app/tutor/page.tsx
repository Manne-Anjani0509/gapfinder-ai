'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ChatMessage, TextChunk } from '@/types';
import {
  BotMessageSquare,
  Send,
  User,
  Sparkles,
  BookOpen,
  HelpCircle,
  FileText,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

function TutorLoading() {
  return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}

function TutorContent() {
  const searchParams = useSearchParams();
  const prefilledTopic = searchParams?.get('topic') || '';

  const { materials, isDemoMode, authFetch } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I am your **GapFinder AI Tutor**. 

I provide explanations **grounded strictly in your uploaded study materials**. Every answer I generate will cite the exact source passage from your notes. If your uploaded content does not contain the answer, I will let you know honestly rather than hallucinating facts.

Ask me anything about your course topics!`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitationIdx, setActiveCitationIdx] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefilledTopic) {
      setInputQuery(`Can you explain ${prefilledTopic} and why it's important according to my notes?`);
    }
  }, [prefilledTopic]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Aggregate all chunks from all uploaded materials
  const allChunks = materials.flatMap((m) => m.chunks || []);

  const handleSendMessage = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await authFetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          chunks: allChunks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process inquiry');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        retrievalMethod: data.retrievalMethod,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to retrieve explanation. Please verify your connection.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Grounded AI Tutor</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Retrieval-Augmented Generation (RAG)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Responses are verified and strictly grounded in {allChunks.length} indexed chunks across {materials.length} study materials.
          </p>
        </div>

        {materials.length === 0 && (
          <Link
            href="/materials"
            className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200"
          >
            Upload Notes to Enable Grounded Answers
          </Link>
        )}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto bg-white rounded-3xl border border-slate-200/80 p-6 space-y-5 shadow-xs">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 max-w-3xl ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white'
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <BotMessageSquare className="w-5 h-5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl p-4 sm:p-5 text-sm leading-relaxed space-y-3 ${
                  isUser
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50/80 border border-slate-200/90 text-slate-800'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Grounded Citations Box */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Retrieved Grounding Passages ({msg.citations.length}):</span>
                      </span>
                      {msg.retrievalMethod && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono">
                          {msg.retrievalMethod}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {msg.citations.map((cite, i) => (
                        <div
                          key={i}
                          className="p-3 bg-white rounded-xl border border-slate-200/90 text-xs text-slate-700 space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                            <span className="flex items-center gap-1 text-indigo-600 truncate">
                              <FileText className="w-3 h-3" />
                              {cite.materialTitle}
                            </span>
                            {cite.similarityScore !== undefined && (
                              <span className="text-slate-400 font-mono">
                                Score: {cite.similarityScore}
                              </span>
                            )}
                          </div>
                          {cite.sectionHeading && (
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                              Section: {cite.sectionHeading}
                            </p>
                          )}
                          <p className="italic text-slate-600">"{cite.chunkText}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3.5 max-w-xl">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0">
              <BotMessageSquare className="w-5 h-5" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Scanning document chunks and synthesizing grounded answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] shrink-0">
            Suggested:
          </span>
          <button
            onClick={() => handleSendMessage('What is the function of the Translation Lookaside Buffer?')}
            className="px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 whitespace-nowrap transition-colors"
          >
            "What is the function of the Translation Lookaside Buffer?"
          </button>
          <button
            onClick={() => handleSendMessage('Explain how glycolysis differs from the citric acid cycle.')}
            className="px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 whitespace-nowrap transition-colors"
          >
            "How does glycolysis differ from the citric acid cycle?"
          </button>
          <button
            onClick={() => handleSendMessage('What causes Belady\'s Anomaly in page replacement?')}
            className="px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 whitespace-nowrap transition-colors"
          >
            "What causes Belady's Anomaly?"
          </button>
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs"
      >
        <input
          type="text"
          placeholder={
            materials.length > 0
              ? 'Ask a question about your study materials (e.g., "What happens during a page fault?")...'
              : 'Please upload study materials first...'
          }
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={isLoading || materials.length === 0}
          className="flex-1 px-4 py-2 text-sm bg-transparent focus:outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading || materials.length === 0}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function AITutorPage() {
  return (
    <Suspense fallback={<TutorLoading />}>
      <TutorContent />
    </Suspense>
  );
}
