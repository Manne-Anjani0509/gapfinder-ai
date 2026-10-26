'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { StudyMaterial, TextChunk } from '@/types';
import {
  UploadCloud,
  FileText,
  FileCode,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  BookOpen,
  Eye,
  X,
  FileUp,
  FolderOpen,
} from 'lucide-react';

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function StudyMaterialsPage() {
  const { materials, addMaterial, deleteMaterial, isDemoMode, user, authFetch } = useApp();

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Paste form state
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');

  // Chunk inspection modal
  const [inspectMaterial, setInspectMaterial] = useState<StudyMaterial | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle selected or dropped file (Supports files of any size without 15MB cap)
  const processFile = async (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    setSuccessMsg(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt') {
      setUploadError('Unsupported format. Please select a text-based .pdf or .txt file.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    const documentTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    try {
      // 1. If user is logged in to live Supabase, upload to private Supabase Storage
      if (!isDemoMode && supabase && isSupabaseConfigured() && user) {
        setProcessingStage(`Uploading ${file.name} (${formatBytes(file.size)}) to private storage...`);
        setUploadProgress(25);

        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${user.id}/${Date.now()}-${safeFileName}`;

        const { data: storageData, error: storageErr } = await supabase.storage
          .from('study-materials')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (storageErr) {
          console.warn('Storage upload error:', storageErr);
          if (storageErr.message?.toLowerCase().includes('bucket not found')) {
            throw new Error(
              'Supabase Storage bucket "study-materials" not found. Please create the private "study-materials" bucket in your Supabase dashboard or execute the SQL migration.'
            );
          }
          throw new Error(`Cloud storage upload failed: ${storageErr.message}`);
        }

        setUploadProgress(70);
        setProcessingStage(
          `Extracting pages & generating semantic syllabus chunks for ${file.name}...`
        );

        const res = await authFetch('/api/materials/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePath: storageData?.path || storagePath,
            fileName: file.name,
            fileSize: file.size,
            title: documentTitle,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to process document on server');
        }

        setUploadProgress(100);
        setProcessingStage('Indexing semantic chunks & updating syllabus...');
        addMaterial(data.material);
        setSuccessMsg(
          `Successfully processed "${data.material.title}" (${formatBytes(file.size)})! Extracted ${data.material.topics?.length || 0} syllabus topics and ${data.material.chunks?.length || 0} chunks.`
        );
        setSelectedFile(null);
      } else {
        // 2. Demo mode or offline direct stream upload
        setProcessingStage('Uploading document to server...');
        setUploadProgress(35);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', documentTitle);

        setProcessingStage(`Extracting text and chunking ${file.name}...`);
        setUploadProgress(65);

        const res = await authFetch('/api/materials/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to process document');
        }

        setUploadProgress(100);
        setProcessingStage('Indexing semantic chunks & updating syllabus...');
        addMaterial(data.material);
        setSuccessMsg(
          `Successfully indexed "${data.material.title}" (${formatBytes(file.size)})! Extracted ${data.material.topics?.length || 0} topics and ${data.material.chunks?.length || 0} chunks.`
        );
        setSelectedFile(null);
      }
    } catch (err: any) {
      console.error('File processing error:', err);
      setUploadError(err.message || 'Error processing document.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setProcessingStage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Paste form submit handler
  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim() || pastedText.trim().length < 40) {
      setUploadError('Pasted text must be at least 40 characters for diagnostic analysis.');
      return;
    }

    setUploadError(null);
    setSuccessMsg(null);
    setIsUploading(true);
    setProcessingStage('Processing pasted notes & generating semantic chunks...');

    try {
      const res = await authFetch('/api/materials/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pastedTitle.trim() || 'Pasted Study Notes',
          content: pastedText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process pasted content');
      }

      addMaterial(data.material);
      setPastedTitle('');
      setPastedText('');
      setSuccessMsg(
        `Successfully ingested "${data.material.title}"! Extracted ${data.material.topics.length} syllabus topics and ${data.material.chunks.length} chunks.`
      );
    } catch (err: any) {
      setUploadError(err.message || 'Error processing pasted notes.');
    } finally {
      setIsUploading(false);
      setProcessingStage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
            Study Materials Hub
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Upload textbooks, lecture PDFs, or raw notes to extract topics and power diagnostic quizzes.
          </p>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_8px_30px_rgb(110,130,160,0.06)] border border-slate-100">
        {/* Sub-tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'upload'
                ? 'bg-[#EEF2FF] text-[#4F46E5] shadow-xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document (.pdf, .txt)</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'paste'
                ? 'bg-purple-50 text-purple-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Paste Lecture Notes</span>
          </button>
        </div>

        {/* Tab 1: Drag & Drop PDF / TXT Upload Area */}
        {activeTab === 'upload' && (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer relative ${
                isDragOver
                  ? 'border-[#4F46E5] bg-indigo-50/50 scale-[1.005]'
                  : isUploading
                  ? 'border-indigo-300 bg-indigo-50/20 cursor-wait'
                  : 'border-slate-200 hover:border-[#4F46E5] hover:bg-slate-50/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                }}
              />

              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mb-3.5 shadow-xs">
                  {isUploading ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <FileUp className="w-7 h-7 stroke-[2.2]" />
                  )}
                </div>

                <p className="text-sm font-bold text-slate-800">
                  {isUploading
                    ? 'Processing Document...'
                    : isDragOver
                    ? 'Drop your PDF or TXT file here'
                    : 'Drag & drop your study material here'}
                </p>

                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Supports searchable text <strong>.PDF</strong> and <strong>.TXT</strong> documents of any size with private cloud storage processing.
                </p>

                {/* Browse Files Button */}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse Files</span>
                  </button>
                )}

                {/* Selected File & Progress Stage */}
                {selectedFile && isUploading && (
                  <div className="mt-4 p-3.5 bg-white rounded-2xl border border-indigo-100 shadow-xs max-w-md w-full text-left">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800 truncate">{selectedFile.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {formatBytes(selectedFile.size)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {uploadProgress !== null && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#4F46E5] font-medium mt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span className="truncate">{processingStage || 'Processing document...'}</span>
                      </div>
                      {uploadProgress !== null && (
                        <span className="font-mono text-indigo-700 font-bold text-[10px] ml-2 shrink-0">
                          {uploadProgress}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Content */}
        {activeTab === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Document / Course Title
              </label>
              <input
                type="text"
                placeholder="e.g., Chapter 8: Virtual Memory & Page Replacement"
                value={pastedTitle}
                onChange={(e) => setPastedTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Lecture Notes / Syllabus Content
              </label>
              <textarea
                placeholder="Paste your notes or textbook excerpts here (minimum 40 characters)..."
                rows={7}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-mono leading-relaxed text-slate-800"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading || pastedText.trim().length < 40}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
              >
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isUploading ? 'Ingesting...' : 'Ingest & Extract Topics'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Status Alerts */}
        {uploadError && (
          <div className="mt-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Document Ingestion Notice</p>
              <p className="mt-0.5 leading-relaxed">{uploadError}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Ingestion Complete</p>
              <p className="mt-0.5 leading-relaxed">{successMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Materials List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1E293B] tracking-tight">
            Indexed Study Materials ({materials.length})
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Each document is split into ~220-word semantic passages for diagnostic quizzes and AI tutoring
          </span>
        </div>

        {materials.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-slate-400 border border-slate-100 shadow-[0_8px_30px_rgb(110,130,160,0.06)]">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No study materials uploaded yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Upload a course PDF or paste lecture notes above to start diagnosing knowledge gaps.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((mat) => (
              <div
                key={mat.id}
                className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(110,130,160,0.06)] border border-slate-100 hover:border-indigo-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                        {mat.fileType === 'pdf' ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <FileCode className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#1E293B] line-clamp-1">
                          {mat.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {mat.fileName} {mat.fileSize ? `• ${formatBytes(mat.fileSize)}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                      {mat.fileType}
                    </span>
                  </div>

                  {/* Metadata Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 rounded-2xl text-center text-xs">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">Words</p>
                      <p className="font-bold text-slate-800">{mat.wordCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">Chunks</p>
                      <p className="font-bold text-[#4F46E5]">{mat.chunks?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">Topics</p>
                      <p className="font-bold text-purple-600">{mat.topics?.length || 0}</p>
                    </div>
                  </div>

                  {/* Extracted Topics Preview */}
                  <div className="mt-3.5">
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Extracted Syllabus Topics:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {mat.topics?.slice(0, 4).map((t) => (
                        <span
                          key={t.id}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100"
                        >
                          {t.name}
                        </span>
                      ))}
                      {(mat.topics?.length || 0) > 4 && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-slate-100 text-slate-500">
                          +{mat.topics.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setInspectMaterial(mat)}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Chunks</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/quiz?materialId=${mat.id}`}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EEF2FF] hover:bg-indigo-100 text-[#4F46E5] transition-colors"
                    >
                      Quiz Me
                    </Link>

                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${mat.title}"?`)) {
                          deleteMaterial(mat.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chunk Inspection Modal */}
      {inspectMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Semantic Chunks & Grounding Passages
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectMaterial.title} &bull; {inspectMaterial.chunks.length} chunks indexed
                </p>
              </div>
              <button
                onClick={() => setInspectMaterial(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
              {inspectMaterial.chunks.map((c, i) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-[#F8FAFC] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span className="text-[#4F46E5] font-mono">
                      Chunk #{i + 1} &bull; ~{c.tokenCount} tokens
                    </span>
                    <span className="text-slate-400 font-medium">
                      Section: {c.sectionHeading || 'General'}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed font-sans">{c.text}</p>

                  {c.topicTags && c.topicTags.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Tags:</span>
                      {c.topicTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-indigo-50 text-[#4F46E5] text-[10px] font-semibold border border-indigo-100/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectMaterial(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
