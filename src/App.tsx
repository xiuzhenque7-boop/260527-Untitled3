/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, CheckCircle, ShieldAlert, Award, PlayCircle, PlusCircle, Volume2, Moon, Sun, Library, Info, HelpCircle } from 'lucide-react';
import { Word, DictationAttempt } from './types';
import WordList, { playWordTTS } from './components/WordList';
import DictationView from './components/DictationView';
import ImportModal from './components/ImportModal';

const LOCAL_STORAGE_KEY = 'word_dictation_app_words';

const INITIAL_WORDS: Word[] = [
  {
    id: "init-1",
    word: "vibrant",
    phonetic: "/ˈvaɪ.brənt/",
    translation: "adj. 充满生机的；气宇轩昂的；鲜艳的",
    sentence: "The local market is vibrant, filled with colorful stalls and noisy chatter.",
    sentenceTranslation: "当地的市场生机盎然，四处都是五彩缤纷的摊位和熙熙攘攘的喧哗声。",
    createdAt: Date.now() - 86450000 * 4,
    wrongCount: 1,
    mastered: false
  },
  {
    id: "init-2",
    word: "accomplish",
    phonetic: "/əˈkʌm.plɪʃ/",
    translation: "vt. 完成，实现，达到 (任务/心愿)",
    sentence: "Through persistent training, they were able to accomplish their final mission.",
    sentenceTranslation: "通过持续不懈的坚苦习练，他们得以圆满完成了最终的使命任务。",
    createdAt: Date.now() - 86450000 * 3,
    wrongCount: 0,
    mastered: false
  },
  {
    id: "init-3",
    word: "challenge",
    phonetic: "/ˈtʃæl.ɪndʒ/",
    translation: "n. 挑战，质问 | vt. 向...发起挑战，对...产生质疑",
    sentence: "Mastering English dictation is indeed a challenge, but the cognitive rewards are boundless.",
    sentenceTranslation: "精通英文单词默写确实是一项不小的挑战，但带来的认知收益是无限的。",
    createdAt: Date.now() - 86450000 * 2,
    wrongCount: 2,
    mastered: false
  },
  {
    id: "init-4",
    word: "persistent",
    phonetic: "/pəˈsɪs.tənt/",
    translation: "adj. 执着的，坚持不懈的；连绵不断的",
    sentence: "Her persistent efforts in academic research finally led to the great medical breakthrough.",
    sentenceTranslation: "她在学术研究中坚持不懈的付出，最终促成了这一重大的医学疗效突破。",
    createdAt: Date.now() - 86450000 * 1,
    wrongCount: 0,
    mastered: true
  }
];

export default function App() {
  const [words, setWords] = useState<Word[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'dictation'>('library');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Load words from local storage on mount
  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        setWords(JSON.parse(raw));
      } catch (e) {
        setWords(INITIAL_WORDS);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_WORDS));
      }
    } else {
      setWords(INITIAL_WORDS);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_WORDS));
    }
  }, []);

  // Sync words array changes to local storage
  const saveToLocalStorage = (updatedWords: Word[]) => {
    setWords(updatedWords);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedWords));
  };

  // Toggle Mastered Flag Handler
  const handleToggleMastered = (id: string) => {
    const updated = words.map(w => {
      if (w.id === id) {
        return { ...w, mastered: !w.mastered };
      }
      return w;
    });
    saveToLocalStorage(updated);
  };

  // Delete Word Handler
  const handleDeleteWord = (id: string) => {
    const updated = words.filter(w => w.id !== id);
    saveToLocalStorage(updated);
  };

  // Edit Word Inline Handler
  const handleEditWord = (id: string, updatedFields: Partial<Word>) => {
    const updated = words.map(w => {
      if (w.id === id) {
        return { ...w, ...updatedFields };
      }
      return w;
    });
    saveToLocalStorage(updated);
  };

  // Single Manual Word Add Handler
  const handleAddSingleManualWord = (newWordData: Omit<Word, 'id' | 'createdAt' | 'wrongCount' | 'mastered'>) => {
    // Prevent duplicate spellings
    const lowerSpelling = newWordData.word.trim().toLowerCase();
    const isExist = words.some(w => w.word.trim().toLowerCase() === lowerSpelling);
    if (isExist) {
      alert(`单词 “${newWordData.word}” 已经在词库中了！`);
      return;
    }

    const brandNew: Word = {
      ...newWordData,
      id: `w-${Date.now()}`,
      createdAt: Date.now(),
      wrongCount: 0,
      mastered: false
    };

    const updated = [brandNew, ...words];
    saveToLocalStorage(updated);
  };

  // Multiple Batch Word Import Handler
  const handleImportWordsBatch = (newWords: Omit<Word, 'id' | 'createdAt' | 'wrongCount' | 'mastered'>[]) => {
    // Filter duplicates against existing spelling
    const currentSpellings = new Set(words.map(w => w.word.trim().toLowerCase()));
    
    // Add IDs
    const formatted: Word[] = [];
    newWords.forEach((item, index) => {
      if (!currentSpellings.has(item.word.trim().toLowerCase())) {
        formatted.push({
          ...item,
          id: `w-import-${Date.now()}-${index}`,
          createdAt: Date.now(),
          wrongCount: 0,
          mastered: false
        });
      }
    });

    if (formatted.length === 0) {
      alert("太棒了！导入的所有单词当前均已存在于词库中，已为您自动过滤去重。");
      return;
    }

    const updated = [...formatted, ...words];
    saveToLocalStorage(updated);
    alert(`成功导入 ${formatted.length} 个全新词卡项目！`);
  };

  // Dictation Session Finish Action:
  // Automatically increment mistake counts and strip mastered flag for spelling errors
  const handleDictationSessionFinish = (attempts: DictationAttempt[]) => {
    const updated = words.map(wordItem => {
      const matchAttempt = attempts.find(att => att.wordId === wordItem.id);
      if (matchAttempt) {
        if (!matchAttempt.isCorrect) {
          return {
            ...wordItem,
            wrongCount: wordItem.wrongCount + 1,
            mastered: false, // Reset mastered flag, forcing revision
            lastTestedAt: Date.now()
          };
        } else {
          return {
            ...wordItem,
            lastTestedAt: Date.now()
          };
        }
      }
      return wordItem;
    });
    saveToLocalStorage(updated);
  };

  // Statistics
  const totalCount = words.length;
  const wrongCount = words.filter(w => w.wrongCount > 0).length;
  const learningCount = words.filter(w => !w.mastered).length;
  const masteredCount = words.filter(w => w.mastered).length;
  const masteryProgress = totalCount ? Math.round((masteredCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans leading-normal selection:bg-indigo-150">
      
      {/* Background visual abstract cards */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-slate-100 to-transparent pointer-events-none" />

      {/* Main Wrapper */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10 flex flex-col space-y-6">
        
        {/* Navigation / Word Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-md flex items-center justify-center font-bold text-lg leading-none">
              词
            </div>
            <div>
              <h1 id="app-main-title" className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-1.5">
                <span>智能背词默写 (Dictation Studio)</span>
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse fill-indigo-100" />
              </h1>
              <p className="text-xs text-slate-400 font-medium">照片生词扫描、标准音标生成与听写强化</p>
            </div>
          </div>

          {/* Core Tabs Routing */}
          <div className="flex bg-slate-200/60 p-1.5 rounded-xl border border-slate-100">
            <button
              id="tab-library-nav"
              onClick={() => setActiveTab('library')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Library className="w-4 h-4" />
              <span>词表词库 (Library)</span>
            </button>
            <button
              id="tab-dictation-nav"
              onClick={() => setActiveTab('dictation')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'dictation'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>听写默写 (Dictate)</span>
            </button>
          </div>
        </header>

        {/* Dashboard Analytics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 select-none">
          {/* Total Words */}
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm transition hover:shadow flex items-center space-x-3.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">词库总数</span>
              <span id="stat-total-words" className="text-lg font-bold text-slate-800 font-mono">{totalCount}</span>
            </div>
          </div>

          {/* Under Learning Words */}
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm transition hover:shadow flex items-center space-x-3.5">
            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">继续熟背</span>
              <span id="stat-learning-words" className="text-lg font-bold text-slate-800 font-mono">{learningCount}</span>
            </div>
          </div>

          {/* Critical Wrong Cards Notebook */}
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm transition hover:shadow flex items-center space-x-3.5">
            <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">错词本数量</span>
              <span id="stat-wrong-words" className="text-lg font-bold text-slate-800 font-mono">{wrongCount}</span>
            </div>
          </div>

          {/* Mastered Star Count */}
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm transition hover:shadow flex items-center space-x-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">已牢记掌握</span>
              <span id="stat-mastered-words" className="text-lg font-bold text-slate-800 font-mono">{masteredCount}</span>
            </div>
          </div>

          {/* Dynamic Progress circular-like meter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm transition hover:shadow col-span-2 lg:col-span-1 flex flex-col justify-center space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              <span>掌握率 Mastery KPI</span>
              <span className="text-indigo-600 font-mono font-bold text-xs">{masteryProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-1 pb-px">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${masteryProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Callouts for Dictionary Setup (Only shows on library tab) */}
        {activeTab === 'library' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-900 to-slate-800 rounded-2xl text-white shadow-xl shadow-slate-200">
            <div className="space-y-1 flex items-start space-x-3">
              <div className="p-2.5 bg-white/10 rounded-xl text-white mt-1 shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100">导入生词，体验 AI 释义自动标注！</h4>
                <p className="text-xs text-indigo-200/90 leading-relaxed max-w-lg">
                  点击右侧 “极速导入生词”，支持打字输入或拍照。我们会自动调用 Gemini flash 模型分析并拼配精准的 IPA 音标和中英对比情境例句，拒绝死记硬背！
                </p>
              </div>
            </div>
            
            <button
              id="open-import-modal-btn"
              onClick={() => setIsImportOpen(true)}
              className="w-full sm:w-auto px-5 py-3.5 bg-white hover:bg-slate-100 text-indigo-950 font-black text-xs sm:text-sm rounded-xl transition duration-200 shadow hover:shadow-lg hover:scale-[1.01] cursor-pointer shrink-0"
            >
              极速导入生词 (Import Now)
            </button>
          </div>
        )}

        {/* Tab Routing Dynamic Containers with AnimatePresence */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            
            {/* View A: Word List Library */}
            {activeTab === 'library' && (
              <motion.div
                key="library-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <WordList
                  words={words}
                  onToggleMastered={handleToggleMastered}
                  onDeleteWord={handleDeleteWord}
                  onEditWord={handleEditWord}
                  onAddNewManualWord={handleAddSingleManualWord}
                />
              </motion.div>
            )}

            {/* View B: Dictation Control Suite */}
            {activeTab === 'dictation' && (
              <motion.div
                key="dictation-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <DictationView
                  words={words}
                  onSessionFinish={handleDictationSessionFinish}
                  onExit={() => setActiveTab('library')}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* Global Import Dialog Popup */}
        <AnimatePresence>
          {isImportOpen && (
            <ImportModal
              isOpen={isImportOpen}
              onClose={() => setIsImportOpen(false)}
              onImport={handleImportWordsBatch}
            />
          )}
        </AnimatePresence>

        {/* UI Disclaimer & Footer */}
        <footer className="text-center text-xs text-slate-400/80 pt-16 pb-4 border-t border-slate-100 flex flex-col items-center space-y-2">
          <p>© 2026 单词听写默写助手 · Standard Web Speech Pronunciation · Serverless Processing Ready</p>
          <div className="flex items-center space-x-1 pl-1 text-[10px] text-slate-400">
            <Info className="w-3.5 h-3.5" />
            <span>默写发音功能使用浏览器本地 SpeechSynthesis 引擎。导入提取功能全程基于 Gemini-3.5-flash AI 驱动。</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
