import type { StudyMaterial, QuizSubmission, RevisionPlan } from '../types/index.ts';
import { chunkDocument, extractTopicsFromChunks } from './chunker.ts';
import { computeDeterministicGaps } from './gapAnalysis.ts';

const OS_TEXT = `# Operating Systems: Virtual Memory & Page Replacement

Chapter 1: Virtual Address Translation and Paging
Virtual memory is a memory management capability of an operating system that uses hardware and software to allow a computer to compensate for physical memory shortages by temporarily transferring data from random access memory (RAM) to disk storage. 

Virtual addresses are divided into two parts: the virtual page number (VPN) and the offset. The memory management unit (MMU) uses a page table to translate the virtual page number into a physical frame number (PFN). Because page table lookups can be slow, modern architectures use a Translation Lookaside Buffer (TLB), which is a hardware cache of recent virtual-to-physical address mappings. When a TLB hit occurs, address translation completes in a single CPU cycle. When a TLB miss occurs, the page table in RAM must be traversed.

Chapter 2: Page Faults and Demand Paging
Demand paging is a method of virtual memory management where pages are only loaded into physical memory when they are accessed by an executing process. If a process accesses a page that is not currently mapped into physical memory, the MMU triggers a page fault exception. 

The operating system handles the page fault by:
1. Trapping to kernel mode and saving CPU context.
2. Checking whether the virtual address reference is valid.
3. Finding an available physical frame or selecting a victim frame using a page replacement algorithm.
4. Reading the requested page from disk secondary storage into the allocated physical frame.
5. Updating the page table entry and setting the valid bit.
6. Restarting the instruction that caused the page fault.

Chapter 3: Page Replacement Algorithms
When physical memory is full, the operating system must evict an existing page to make room for a new one. The choice of which page to evict is governed by page replacement algorithms.
- First-In, First-Out (FIFO): Replaces the oldest page in memory. While simple, FIFO suffers from Belady's Anomaly, where increasing the number of physical page frames can paradoxically increase the number of page faults.
- Optimal Algorithm (OPT/MIN): Replaces the page that will not be used for the longest period of time in the future. While theoretically optimal with minimal page faults, it is impossible to implement in practice because it requires future knowledge of memory references.
- Least Recently Used (LRU): Replaces the page that has not been referenced for the longest period of time. LRU approximates OPT by using past behavior as a predictor of future references. It is implemented using hardware timestamps or reference stack matrices.`;

const BIO_TEXT = `# Cellular Biology: Cellular Respiration and ATP Synthesis

Section 1: Overview of Cellular Respiration and Glycolysis
Cellular respiration is a set of metabolic reactions and processes that take place in the cells of organisms to convert biochemical energy from nutrients into adenosine triphosphate (ATP), and then release waste products. The overall reaction oxidizes glucose into carbon dioxide and water.

Glycolysis is the first stage of cellular respiration and occurs in the cytoplasm of the cell. It does not require oxygen (anaerobic). During glycolysis, a six-carbon glucose molecule is broken down into two three-carbon molecules of pyruvate. The process yields a net gain of 2 ATP molecules (via substrate-level phosphorylation) and 2 molecules of NADH.

Section 2: The Citric Acid Cycle (Krebs Cycle)
In the presence of oxygen, pyruvate enters the mitochondrial matrix where it undergoes oxidative decarboxylation to form Acetyl-CoA, producing NADH and releasing CO2. Acetyl-CoA then enters the Citric Acid Cycle, also known as the Krebs cycle.

The citric acid cycle completely oxidizes acetyl groups to CO2. Each turn of the cycle produces 3 NADH, 1 FADH2, and 1 GTP (converted to ATP). Because one glucose molecule yields two pyruvate molecules, two turns of the cycle occur per glucose, yielding 6 NADH, 2 FADH2, and 2 ATP.

Section 3: Oxidative Phosphorylation and Chemiosmosis
Oxidative phosphorylation occurs along the inner mitochondrial membrane and generates the vast majority of cellular ATP. High-energy electrons carried by NADH and FADH2 are transferred through a series of protein complexes (Complex I through IV) known as the Electron Transport Chain (ETC).

As electrons move through the chain to oxygen (the final electron acceptor), protons (H+) are pumped from the mitochondrial matrix into the intermembrane space, creating a steep electrochemical proton gradient. Chemiosmosis is the process where protons flow back into the matrix through ATP synthase, driving the mechanical phosphorylation of ADP to generate approximately 26 to 28 ATP molecules.`;

// Build demo materials
const osChunks = chunkDocument('demo-os-1', 'Operating Systems: Virtual Memory', OS_TEXT);
const osTopics = extractTopicsFromChunks('demo-os-1', 'Operating Systems: Virtual Memory', osChunks);

const bioChunks = chunkDocument('demo-bio-1', 'Cellular Biology: Respiration & ATP', BIO_TEXT);
const bioTopics = extractTopicsFromChunks('demo-bio-1', 'Cellular Biology: Respiration & ATP', bioChunks);

export const DEMO_MATERIALS: StudyMaterial[] = [
  {
    id: 'demo-os-1',
    title: 'Operating Systems: Virtual Memory & Page Replacement',
    fileName: 'CS301_Virtual_Memory_Notes.txt',
    fileType: 'txt',
    fileSize: 4200,
    wordCount: 520,
    rawContent: OS_TEXT,
    chunks: osChunks,
    topics: osTopics,
    status: 'ready',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    isDemo: true,
  },
  {
    id: 'demo-bio-1',
    title: 'Cellular Biology: Respiration and ATP Synthesis',
    fileName: 'BIO101_Cellular_Respiration.txt',
    fileType: 'txt',
    fileSize: 4600,
    wordCount: 560,
    rawContent: BIO_TEXT,
    chunks: bioChunks,
    topics: bioTopics,
    status: 'ready',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    isDemo: true,
  },
];

// Realistic sample quiz submissions
export const DEMO_QUIZ_SUBMISSIONS: QuizSubmission[] = [
  {
    id: 'demo-sub-1',
    quizTitle: 'Diagnostic Assessment 1: OS Virtual Memory',
    materialId: 'demo-os-1',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    totalQuestions: 6,
    score: 3,
    percentage: 50,
    isDemo: true,
    answers: [
      {
        questionId: 'demo-q1',
        questionText: 'What is the primary role of the Translation Lookaside Buffer (TLB)?',
        selectedOptionIndex: 0,
        correctOptionIndex: 0,
        isCorrect: true,
        topicName: 'Virtual Address Translation and Paging',
        explanation: 'The TLB is a fast hardware cache that stores recent virtual-to-physical address translations.',
        sourcePassage: 'The TLB is a hardware cache of recent virtual-to-physical address mappings.',
      },
      {
        questionId: 'demo-q2',
        questionText: 'When does a page fault exception occur?',
        selectedOptionIndex: 1,
        correctOptionIndex: 1,
        isCorrect: true,
        topicName: 'Page Faults and Demand Paging',
        explanation: 'A page fault occurs when an executing process references a virtual page not currently present in RAM.',
        sourcePassage: 'If a process accesses a page that is not currently mapped into physical memory, the MMU triggers a page fault.',
      },
      {
        questionId: 'demo-q3',
        questionText: 'Which page replacement algorithm is known to suffer from Belady\'s Anomaly?',
        selectedOptionIndex: 1,
        correctOptionIndex: 0,
        isCorrect: false,
        topicName: 'Page Replacement Algorithms',
        explanation: 'FIFO suffers from Belady\'s Anomaly, where granting more physical frames can increase page faults.',
        sourcePassage: 'First-In, First-Out (FIFO) suffers from Belady\'s Anomaly, where increasing page frames increases page faults.',
      },
      {
        questionId: 'demo-q4',
        questionText: 'Why is the Optimal Page Replacement (OPT) algorithm not implemented in real OS kernels?',
        selectedOptionIndex: 2,
        correctOptionIndex: 3,
        isCorrect: false,
        topicName: 'Page Replacement Algorithms',
        explanation: 'OPT requires future knowledge of reference strings, which is impossible in real systems.',
        sourcePassage: 'It is impossible to implement in practice because it requires future knowledge of memory references.',
      },
      {
        questionId: 'demo-q5',
        questionText: 'How does the LRU algorithm approximate the Optimal algorithm?',
        selectedOptionIndex: 0,
        correctOptionIndex: 2,
        isCorrect: false,
        topicName: 'Page Replacement Algorithms',
        explanation: 'LRU uses past reference history as an indicator of future page demand.',
        sourcePassage: 'LRU approximates OPT by using past behavior as a predictor of future references.',
      },
      {
        questionId: 'demo-q6',
        questionText: 'What hardware component performs virtual-to-physical address translation?',
        selectedOptionIndex: 1,
        correctOptionIndex: 1,
        isCorrect: true,
        topicName: 'Virtual Address Translation and Paging',
        explanation: 'The MMU (Memory Management Unit) handles translation using page tables and TLB.',
        sourcePassage: 'The memory management unit (MMU) uses a page table to translate the virtual page number.',
      },
    ],
    topicBreakdown: {
      'Virtual Address Translation and Paging': { total: 2, correct: 2, percentage: 100 },
      'Page Faults and Demand Paging': { total: 1, correct: 1, percentage: 100 },
      'Page Replacement Algorithms': { total: 3, correct: 0, percentage: 0 },
    },
  },
  {
    id: 'demo-sub-2',
    quizTitle: 'Diagnostic Assessment 2: Cellular Respiration',
    materialId: 'demo-bio-1',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    totalQuestions: 5,
    score: 4,
    percentage: 80,
    isDemo: true,
    answers: [
      {
        questionId: 'demo-q7',
        questionText: 'Where does glycolysis occur within the eukaryotic cell?',
        selectedOptionIndex: 0,
        correctOptionIndex: 0,
        isCorrect: true,
        topicName: 'Overview of Cellular Respiration and Glycolysis',
        explanation: 'Glycolysis takes place in the cytoplasm of the cell.',
        sourcePassage: 'Glycolysis is the first stage of cellular respiration and occurs in the cytoplasm of the cell.',
      },
      {
        questionId: 'demo-q8',
        questionText: 'What is the net yield of ATP produced per glucose molecule during glycolysis alone?',
        selectedOptionIndex: 1,
        correctOptionIndex: 1,
        isCorrect: true,
        topicName: 'Overview of Cellular Respiration and Glycolysis',
        explanation: 'Glycolysis yields a net gain of 2 ATP molecules.',
        sourcePassage: 'The process yields a net gain of 2 ATP molecules via substrate-level phosphorylation.',
      },
      {
        questionId: 'demo-q9',
        questionText: 'What is the final electron acceptor in the electron transport chain during aerobic respiration?',
        selectedOptionIndex: 3,
        correctOptionIndex: 3,
        isCorrect: true,
        topicName: 'Oxidative Phosphorylation and Chemiosmosis',
        explanation: 'Oxygen acts as the terminal electron acceptor and combines with protons to form water.',
        sourcePassage: 'As electrons move through the chain to oxygen (the final electron acceptor)...',
      },
      {
        questionId: 'demo-q10',
        questionText: 'How many NADH molecules are produced in total per glucose molecule during the citric acid cycle?',
        selectedOptionIndex: 2,
        correctOptionIndex: 2,
        isCorrect: true,
        topicName: 'The Citric Acid Cycle (Krebs Cycle)',
        explanation: 'Each turn produces 3 NADH, and two turns yield 6 NADH total.',
        sourcePassage: 'Because one glucose yields two pyruvate, two turns occur yielding 6 NADH.',
      },
      {
        questionId: 'demo-q11',
        questionText: 'What directly powers the ATP synthase enzyme to generate ATP during chemiosmosis?',
        selectedOptionIndex: 0,
        correctOptionIndex: 2,
        isCorrect: false,
        topicName: 'Oxidative Phosphorylation and Chemiosmosis',
        explanation: 'The flow of protons down their electrochemical gradient drives mechanical rotation of ATP synthase.',
        sourcePassage: 'Chemiosmosis is the process where protons flow back into the matrix through ATP synthase.',
      },
    ],
    topicBreakdown: {
      'Overview of Cellular Respiration and Glycolysis': { total: 2, correct: 2, percentage: 100 },
      'The Citric Acid Cycle (Krebs Cycle)': { total: 1, correct: 1, percentage: 100 },
      'Oxidative Phosphorylation and Chemiosmosis': { total: 2, correct: 1, percentage: 50 },
    },
  },
];

export const DEMO_SUBMISSIONS = DEMO_QUIZ_SUBMISSIONS;

export const DEMO_GAP_REPORT = computeDeterministicGaps(DEMO_MATERIALS, DEMO_SUBMISSIONS, true).report;

export const DEMO_REVISION_PLAN: RevisionPlan = {
  id: 'demo-plan-1',
  createdAt: new Date().toISOString(),
  availableMinutes: 45,
  isDemo: true,
  tasks: [
    {
      id: 'task-rev-1',
      priority: 'high',
      topicName: 'Page Replacement Algorithms',
      materialTitle: 'Operating Systems: Virtual Memory & Page Replacement',
      estimatedMinutes: 20,
      title: 'Master FIFO Belady\'s Anomaly & LRU Stack Implementation',
      actionItems: [
        'Review why increasing page frames causes more page faults in FIFO (Belady\'s Anomaly).',
        'Compare OPT theoretical lower bound with LRU hardware timestamp approximation.',
        'Practice tracing reference string: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3] with 3 frames.',
      ],
      targetConcept: 'Belady\'s Anomaly and LRU Cache Mechanics',
      sourcePassage: 'FIFO suffers from Belady\'s Anomaly... LRU approximates OPT by using past behavior as a predictor.',
      completed: false,
    },
    {
      id: 'task-rev-2',
      priority: 'medium',
      topicName: 'Oxidative Phosphorylation and Chemiosmosis',
      materialTitle: 'Cellular Biology: Respiration and ATP Synthesis',
      estimatedMinutes: 15,
      title: 'Electrochemical Proton Gradient & ATP Synthase Coupling',
      actionItems: [
        'Diagram the proton pumping through Complexes I, III, and IV into the intermembrane space.',
        'Trace the role of oxygen as the terminal electron acceptor.',
        'Contrast substrate-level phosphorylation with chemiosmotic rotary catalysis.',
      ],
      targetConcept: 'Chemiosmotic ATP Synthase Mechanics',
      sourcePassage: 'Protons flow back into the matrix through ATP synthase, driving mechanical phosphorylation of ADP.',
      completed: false,
    },
    {
      id: 'task-rev-3',
      priority: 'low',
      topicName: 'Virtual Address Translation and Paging',
      materialTitle: 'Operating Systems: Virtual Memory & Page Replacement',
      estimatedMinutes: 10,
      title: 'TLB Hit/Miss Address Translation Refresh',
      actionItems: [
        'Re-verify virtual address structure: VPN vs Page Offset.',
        'Calculate effective memory access time given a 90% TLB hit rate.',
      ],
      targetConcept: 'TLB Hardware Cache Lookup',
      sourcePassage: 'When a TLB hit occurs, address translation completes in a single CPU cycle.',
      completed: true,
    },
  ],
};
