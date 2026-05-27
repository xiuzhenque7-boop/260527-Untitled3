/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Word {
  id: string;
  word: string;
  phonetic: string;
  translation: string;
  sentence: string;
  sentenceTranslation: string;
  createdAt: number;
  wrongCount: number; // 错误次数
  mastered: boolean;  // 是否已掌握
  lastTestedAt?: number;
}

export interface DictationAttempt {
  wordId: string;
  wordText: string;
  userInput: string;
  isCorrect: boolean;
}

export interface DictationSession {
  id: string;
  words: Word[];
  currentIndex: number;
  attempts: DictationAttempt[];
  startedAt: number;
  completedAt?: number;
  mode: 'all' | 'wrong' | 'random';
}
