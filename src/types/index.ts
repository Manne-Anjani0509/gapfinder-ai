export type FileType = 'pdf' | 'txt' | 'pasted';

export type TopicStatus = 'Unassessed' | 'Weak' | 'Medium' | 'Strong';

export interface TextChunk {
  id: string;
  materialId: string;
  materialTitle: string;
  chunkIndex: number;
  text: string;
  tokenCount?: number;
  sectionHeading?: string;
  pageNumber?: number;
  sourceOffsetStart?: number;
  sourceOffsetEnd?: number;
  topicTags?: string[];
  embedding?: number[];
}

export interface ExtractedTopic {
  id: string;
  materialId: string;
  materialTitle: string;
  name: string;
  description: string;
  subtopics: string[];
  keyConcepts: string[];
  sourcePassage: string;
  chunkId?: string;
  questionCount: number;
  assessed: boolean;
  accuracy: number; // 0 - 100
  status: TopicStatus;
  questionsAttempted?: number;
  correctAnswers?: number;
}

export interface StudyMaterial {
  id: string;
  title: string;
  fileName: string;
  fileType: FileType;
  fileSize?: number;
  wordCount: number;
  rawContent: string;
  storagePath?: string;
  chunks: TextChunk[];
  topics: ExtractedTopic[];
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface QuizQuestion {
  id: string;
  topicId: string;
  topicName: string;
  materialId: string;
  materialTitle: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  sourcePassage: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface UserAnswerRecord {
  questionId: string;
  questionText: string;
  selectedOptionIndex: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  topicName: string;
  explanation: string;
  sourcePassage: string;
}

export interface QuizSubmission {
  id: string;
  quizTitle: string;
  materialId?: string;
  timestamp: string;
  totalQuestions: number;
  score: number;
  percentage: number;
  answers: UserAnswerRecord[];
  topicBreakdown: Record<string, { total: number; correct: number; percentage: number }>;
  isDemo?: boolean;
}

export interface TopicGapEvidence {
  topicId: string;
  topicName: string;
  materialTitle: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  classification: TopicStatus;
  evidenceNotes: string;
  recommendedFocus: string[];
  sourcePassage: string;
}

export interface GapReportData {
  totalTopics: number;
  assessedCount: number;
  weakCount: number;
  mediumCount: number;
  strongCount: number;
  overallAccuracy: number;
  evidenceList: TopicGapEvidence[];
  isDemo?: boolean;
}

export interface RevisionTask {
  id: string;
  priority: 'high' | 'medium' | 'low';
  topicName: string;
  materialTitle: string;
  estimatedMinutes: number;
  title: string;
  actionItems: string[];
  targetConcept: string;
  sourcePassage: string;
  completed: boolean;
}

export interface RevisionPlan {
  id: string;
  createdAt: string;
  availableMinutes: number;
  tasks: RevisionTask[];
  isDemo?: boolean;
}

export interface Citation {
  documentId?: string;
  materialId?: string;
  materialTitle: string;
  chunkId?: string;
  chunkText: string;
  similarityScore?: number;
  sectionHeading?: string;
  pageNumber?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  retrievalMethod?: 'Gemini Vector Embeddings (Cosine Similarity)' | 'Deterministic BM25 / TF-IDF Semantic Retrieval' | 'insufficient-context';
}

export interface SystemStatus {
  geminiConfigured: boolean;
  supabaseConfigured: boolean;
  activeModel: string;
  storageMode: 'Supabase Cloud' | 'Local Browser Storage';
}
