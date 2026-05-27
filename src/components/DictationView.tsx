/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Volume2, HelpCircle, ArrowRight, CheckCircle2, XCircle, RotateCcw, Home, Award, HelpCircle as HelpIcon, ChevronRight, ShieldAlert, Sparkles, AlertCircle, BookOpen } from 'lucide-react';
import { Word, DictationAttempt } from '../types';
import { playWordTTS } from './WordList';

interface DictationViewProps {
  words: Word[];
  onSessionFinish: (attempts: DictationAttempt[]) => void;
  onExit: () => void;
}

export default function DictationView({ words, onSessionFinish, onExit }: DictationViewProps) {
  // Session Configuration State
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'all' | 'wrong' | 'random' | 'learn'>('all');
  const [randomSize, setRandomSize] = useState<number>(10);
  const [showPhoneticHint, setShowPhoneticHint] = useState(true);
  const [showExampleHint, setShowExampleHint] = useState(true);

  // Active Dictation State
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState<DictationAttempt[]>([]);

  // Results State
  const [isFinished, setIsFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when active word changes
  useEffect(() => {
    if (hasStarted && !isFinished && !hasSubmitted) {
      inputRef.current?.focus();
    }
  }, [hasStarted, currentIndex, enjoysSubmittedFocus()]);

  function enjoysSubmittedFocus() {
    return hasSubmitted; 
  }

  // Trigger audio on active word load
  useEffect(() => {
    if (hasStarted && !isFinished && sessionWords.length > 0 && currentIndex < sessionWords.length && !hasSubmitted) {
      // Small timeout to give user breathing room
      const timer = setTimeout(() => {
        playWordTTS(sessionWords[currentIndex].word);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [hasStarted, currentIndex, sessionWords, isFinished]);

  // Handle Session Start
  const startSession = () => {
    let pool: Word[] = [];
    if (selectedMode === 'all') {
      pool = [...words];
    } else if (selectedMode === 'wrong') {
      pool = words.filter(w => w.wrongCount > 0);
    } else if (selectedMode === 'learn') {
      pool = words.filter(w => !w.mastered);
    } else if (selectedMode === 'random') {
      pool = [...words].sort(() => 0.5 - Math.random()).slice(0, Math.min(randomSize, words.length));
    }

    if (pool.length === 0) {
      alert("没有符合条件的单词！请添加单词。");
      return;
    }

    // Shuffle words for listening challenge
    const shuffled = pool.sort(() => 0.5 - Math.random());
    setSessionWords(shuffled);
    setCurrentIndex(0);
    setUserInput('');
    setHasSubmitted(false);
    setAttempts([]);
    setIsFinished(false);
    setHasStarted(true);
  };

  // Re-run session with only MISSED words (Redictate)
  const restartWithMissedWords = () => {
    const missedWordIds = attempts.filter(att => !att.isCorrect).map(att => att.wordId);
    const missedPool = words.filter(w => missedWordIds.includes(itemKey(w)));

    if (missedPool.length === 0) {
      alert("太棒了！您当前没有错误的单词！");
      return;
    }

    setSessionWords(missedPool.sort(() => 0.5 - Math.random()));
    setCurrentIndex(0);
    setUserInput('');
    setHasSubmitted(false);
    setAttempts([]);
    setIsFinished(false);
    setHasStarted(true);
  };

  function itemKey(w: Word) {
    return w.id;
  }

  // Handle Spell Submission
  const checkSpelling = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSubmitted) return;

    const currentWord = sessionWords[currentIndex];
    
    // Clean strings (lowercase, normalize spaces and hyphens)
    const cleanInput = userInput.trim().toLowerCase();
    const cleanTarget = currentWord.word.trim().toLowerCase();
    const correct = cleanInput === cleanTarget;

    setIsCorrect(correct);
    setHasSubmitted(true);

    const newAttempt: DictationAttempt = {
      wordId: currentWord.id,
      wordText: currentWord.word,
      userInput: userInput.trim(),
      isCorrect: correct
    };

    setAttempts(prev => [...prev, newAttempt]);

    // Give audio feedback
    if (correct) {
      // Correct sound fallback or playTTS
    } else {
      // Play correct word after misspelling
      playWordTTS(currentWord.word);
    }
  };

  // Skip visual word button
  const handleSkip = () => {
    if (hasSubmitted) return;
    setUserInput('[已跳过]');
    setHasSubmitted(true);
    setIsCorrect(false);

    const currentWord = sessionWords[currentIndex];
    const newAttempt: DictationAttempt = {
      wordId: currentWord.id,
      wordText: currentWord.word,
      userInput: '',
      isCorrect: false
    };
    setAttempts(prev => [...prev, newAttempt]);
  };

  // Progress to next word card
  const handleNext = () => {
    if (currentIndex + 1 < sessionWords.length) {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setHasSubmitted(false);
    } else {
      // Dictation Done - save attempts to main state storage and display outcomes
      onSessionFinish(attempts);
      setIsFinished(true);
    }
  };

  // Mask core target word in sentence to prevent cheating!
  const maskWordInSentence = (sentence: string, word: string) => {
    if (!sentence) return '';
    
    // Replace case-insensitive spelling match with blanks of matching character length
    const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    const mask = '_'.repeat(word.length);
    
    return sentence.replace(regex, `[ ${mask} ]`);
  };

  const currentWord = sessionWords[currentIndex];
  const correctCount = attempts.filter(a => a.isCorrect).length;
  const wrongCount = attempts.filter(a => !a.isCorrect).length;
  const accuracy = sessionWords.length ? Math.round((correctCount / sessionWords.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        
        {/* State 1: Before Session Starts Config */}
        {!hasStarted && (
          <motion.div
            key="config-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-150 space-y-6"
          >
            <div className="text-center space-y-1.5 border-b border-slate-100 pb-5">
              <h2 className="text-xl font-bold text-slate-800">单词听写默写 (Dictation Studio)</h2>
              <p className="text-xs text-slate-500">挑选你的词库练习模式，开始高效科学的拼写听写训练</p>
            </div>

            {/* Mode Picker Panels */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">1. 听写范围选择 (Select Mode)</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Mode: All Words */}
                <div 
                  onClick={() => setSelectedMode('all')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedMode === 'all' 
                      ? 'border-indigo-600 bg-indigo-50/50' 
                      : 'border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span id="mode-all-title" className={`font-bold text-sm block ${selectedMode === 'all' ? 'text-indigo-900' : 'text-slate-800'}`}>全部熟背词库</span>
                    <span className="text-xs text-slate-400 mt-0.5">随机打乱并默写你词库中的所有生词。</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-500 mt-3 align-bottom">当前共 {words.length} 个单词</span>
                </div>

                {/* Mode: Wrong Words Spec */}
                <div 
                  onClick={() => setSelectedMode('wrong')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedMode === 'wrong' 
                      ? 'border-rose-500 bg-rose-50/20' 
                      : 'border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span id="mode-wrong-title" className={`font-bold text-sm block flex items-center space-x-1 ${selectedMode === 'wrong' ? 'text-rose-900' : 'text-slate-800'}`}>
                      <ShieldAlert className="w-4 h-4 text-rose-500 mr-0.5" />
                      <span>错词专项必刷本</span>
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5">针对性强化曾经听写错误的生词，直到攻克。</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-rose-500 mt-3 align-bottom">当前有 {words.filter(w => w.wrongCount > 0).length} 个错词</span>
                </div>

                {/* Mode: Learning */}
                <div 
                  onClick={() => setSelectedMode('learn')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedMode === 'learn' 
                      ? 'border-yellow-600 bg-yellow-50/10' 
                      : 'border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span id="mode-learn-title" className={`font-bold text-sm block flex items-center space-x-1 ${selectedMode === 'learn' ? 'text-yellow-800' : 'text-slate-800'}`}>
                      <BookOpen className="w-4 h-4 text-yellow-500 mr-0.5" />
                      <span>正在学习 (未掌握)</span>
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5">仅听写默写那些尚未被你标记为“已掌握”的单词。</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-yellow-600 mt-3">剩余 {words.filter(w => !w.mastered).length} 个单词</span>
                </div>

                {/* Mode: Random Picks */}
                <div 
                  onClick={() => setSelectedMode('random')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedMode === 'random' 
                      ? 'border-teal-600 bg-teal-50/10' 
                      : 'border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span id="mode-random-title" className={`font-bold text-sm block ${selectedMode === 'random' ? 'text-teal-900' : 'text-slate-800'}`}>随机精选定量听写</span>
                    <span className="text-xs text-slate-400 mt-0.5">从词库挑选指定数额单词进行挑战。</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs text-slate-400 font-medium">题目数量:</span>
                    <input
                      type="number"
                      min={1}
                      max={words.length || 10}
                      value={randomSize}
                      onClick={(e) => e.stopPropagation()}
                      onChange={e => setRandomSize(Math.max(1, parseInt(e.target.value) || 10))}
                      className="w-16 px-1.5 py-0.5 border border-slate-200 text-xs text-center font-bold font-mono rounded bg-white text-teal-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Hint Settings Option Toggle */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">2. 默写显示偏好配置</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <label className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-100 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={showPhoneticHint}
                    onChange={e => setShowPhoneticHint(e.target.checked)}
                    className="accent-indigo-600 w-4 h-4 rounded"
                  />
                  <span>显示发音音标暗示 (/ɪɡˈzæm.pəl/)</span>
                </label>
                <label className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-100 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={showExampleHint}
                    onChange={e => setShowExampleHint(e.target.checked)}
                    className="accent-indigo-600 w-4 h-4 rounded"
                  />
                  <span>显示英中情境例句 (主词将被挖空)</span>
                </label>
              </div>
            </div>

            {/* Launch CTA */}
            <div className="pt-2">
              <button
                id="start-dictation-btn"
                onClick={startSession}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-150 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>开启听写测试</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* State 2: Active Dictation Testing Loop */}
        {hasStarted && !isFinished && currentWord && (
          <motion.div
            key="dictation-active"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-150 space-y-6"
          >
            {/* Header: Progress Counter */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-400 tracking-wider">
                当前单词 : <span className="font-mono text-indigo-600">{currentIndex + 1}</span> / {sessionWords.length}
              </span>
              <button
                onClick={onExit}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                退出本次测试
              </button>
            </div>

            {/* Word Audio Prompt Center */}
            <div className="py-2 flex flex-col items-center justify-center space-y-3.5">
              <button
                id="replay-audio-btn"
                onClick={() => playWordTTS(currentWord.word)}
                className="w-16 h-16 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center cursor-pointer transition hover:scale-105 shadow-md shadow-indigo-100/50"
                title="重新播放纯正发音 (Play Audio)"
              >
                <Volume2 className="w-7 h-7" />
              </button>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">英语朗读中</span>
                {showPhoneticHint && (
                  <p className="text-xs font-mono font-medium text-slate-400 mt-1">{currentWord.phonetic}</p>
                )}
              </div>
            </div>

            {/* Translation & Context clues */}
            <div className="space-y-4">
              {/* Chinese Meaning (Primary visual clue) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 text-center space-y-1">
                <span className="text-[10px] bg-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded">中文主意释义</span>
                <p id="dictation-definition" className="text-base sm:text-lg font-bold text-slate-700 pt-1">
                  {currentWord.translation}
                </p>
              </div>

              {/* Masked Example Sentence */}
              {showExampleHint && currentWord.sentence && (
                <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100 text-center space-y-1">
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded">情景例句暗示</span>
                  <p className="text-xs font-serif italic font-medium pt-1.5 text-slate-600 leading-relaxed">
                    {maskWordInSentence(currentWord.sentence, currentWord.word)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {currentWord.sentenceTranslation}
                  </p>
                </div>
              )}
            </div>

            {/* Input Form & Instant Correction feedback */}
            <div className="space-y-4 pt-2">
              <form onSubmit={checkSpelling} className="relative">
                <input
                  ref={inputRef}
                  id="dictation-input-box"
                  type="text"
                  disabled={hasSubmitted}
                  placeholder={hasSubmitted ? "请按回车键或点击下一步" : "在这里拼写该 English 单词..."}
                  value={userInput}
                  onChange={e => setUserInput(e.target.value.replace(/[^a-zA-Z\s'-]/, ''))}
                  className={`w-full text-center px-4 py-3 border-2 text-xl font-bold tracking-wide rounded-2xl focus:outline-none transition ${
                    hasSubmitted
                      ? isCorrect 
                        ? 'border-emerald-500 bg-emerald-50/20 text-emerald-800'
                        : 'border-rose-500 bg-rose-50/25 text-rose-800'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                  }`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </form>

              {/* Status Alert Panels */}
              <AnimatePresence>
                {hasSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      isCorrect 
                        ? 'bg-emerald-50/80 border border-emerald-100 text-emerald-900' 
                        : 'bg-rose-50/60 border border-rose-150 text-rose-950'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold flex items-center space-x-1.5">
                          <span>{isCorrect ? '拼写完全正确！' : '拼写错误，加固记忆！'}</span>
                          {isCorrect && <Sparkles className="w-4 h-4 text-emerald-500-slow animate-pulse" />}
                        </p>
                        
                        {!isCorrect && (
                          <div className="mt-1 space-y-0.5 text-xs">
                            <p className="text-slate-600">你的拼写: <span className="font-mono font-bold line-through text-rose-700">{userInput || '[未填]'}</span></p>
                            <p className="text-slate-700 font-semibold text-sm">正确英文: <span className="font-mono bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">{currentWord.word}</span></p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      id="next-word-btn"
                      onClick={handleNext}
                      className={`px-4 py-2 font-bold text-xs text-white rounded-xl shadow-md cursor-pointer flex items-center space-x-1 transition ${
                        isCorrect ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      <span>继续下一步</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Word skipping / checking button sets before submission */}
              {!hasSubmitted && (
                <div className="flex items-center gap-3">
                  <button
                    id="skip-word-btn"
                    onClick={handleSkip}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                  >
                    不知道，跳过此词
                  </button>
                  
                  <button
                    id="submit-spell-btn"
                    onClick={checkSpelling}
                    disabled={!userInput.trim()}
                    className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                  >
                    提交校验 spelling
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* State 3: Session Finished Scoring Dashboard */}
        {hasStarted && isFinished && (
          <motion.div
            key="finish-screen"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-150 space-y-6"
          >
            {/* Visual Trophy */}
            <div className="text-center py-4 space-y-2">
              <div className="w-16 h-16 bg-amber-50 rounded-full border border-amber-250 flex items-center justify-center mx-auto text-amber-500 animate-bounce">
                <Award className="w-9 h-9" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">听写测试已圆满结束！</h2>
                <p className="text-xs text-slate-400">词汇拼记是阅读、听力和写作的基础。继续加油！</p>
              </div>
            </div>

            {/* Math Stats Box Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">拼对词量</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 block mt-1">{correctCount}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">拼错词量</span>
                <span className="text-2xl font-bold font-mono text-rose-500 block mt-1">{wrongCount}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">准确率</span>
                <span className={`text-2xl font-bold font-mono block mt-1 ${accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>{accuracy}%</span>
              </div>
            </div>

            {/* Missed Wrong words Review lists */}
            {wrongCount > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 border-b border-rose-100/60 pb-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase">本次拼错的单词一览：</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {attempts.filter(att => !att.isCorrect).map((att, idx) => {
                    const matched = words.find(w => w.id === att.wordId);
                    return (
                      <div key={idx} className="p-2.5 bg-rose-50/20 border border-rose-100 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800 font-mono text-sm">{att.wordText}</p>
                          <p className="text-slate-400 mt-0.5 line-clamp-1">{matched?.translation}</p>
                        </div>
                        <span className="text-[10px] text-rose-600 bg-rose-50 font-semibold px-2 py-0.5 rounded-full border border-rose-100">
                          原拼错: {att.userInput || '[跳过]'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Finished CTA button sets */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="finish-exit-btn"
                onClick={onExit}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition text-center cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Home className="w-4 h-4" />
                <span>返回词库首页</span>
              </button>

              {wrongCount > 0 && (
                <button
                  id="finish-retry-wrong-btn"
                  onClick={restartWithMissedWords}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-650 text-white font-bold text-xs rounded-2xl shadow-md hover:scale-[1.01] transition text-center cursor-pointer flex items-center justify-center space-x-1.5 animate-pulse"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>专项重测拼错单词 ({wrongCount})</span>
                </button>
              )}

              <button
                id="finish-again-btn"
                onClick={startSession}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md hover:scale-[1.01] transition text-center cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新开始本轮</span>
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
