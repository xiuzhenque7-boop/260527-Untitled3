/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Volume2, Trash2, Edit2, Check, CheckSquare, Square, Star, ShieldAlert, Award, AlertCircle, Sparkles, BookOpen, Plus, X } from 'lucide-react';
import { Word } from '../types';

interface WordListProps {
  words: Word[];
  onToggleMastered: (id: string) => void;
  onDeleteWord: (id: string) => void;
  onEditWord: (id: string, updated: Partial<Word>) => void;
  onAddNewManualWord: (word: Omit<Word, 'id' | 'createdAt' | 'wrongCount' | 'mastered'>) => void;
}

// Global text-to-speech speaker assistant
export const playWordTTS = (text: string, isSentence = false) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    // Slightly slower for isolated English words to catch phonetic transitions
    utterance.rate = isSentence ? 0.9 : 0.8;
    window.speechSynthesis.speak(utterance);
  }
};

export default function WordList({ words, onToggleMastered, onDeleteWord, onEditWord, onAddNewManualWord }: WordListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'wrong' | 'not_mastered' | 'mastered'>('all');
  
  // Create / Edit word states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Word>>({});
  
  // Manual single word add popover state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({
    word: '',
    phonetic: '',
    translation: '',
    sentence: '',
    sentenceTranslation: ''
  });

  // Filter & Search logic
  const filteredWords = words.filter(item => {
    const matchesSearch = item.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.translation.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filter === 'wrong') return item.wrongCount > 0;
    if (filter === 'not_mastered') return !item.mastered;
    if (filter === 'mastered') return item.mastered;
    return true;
  });

  // Sort: Wrong count descending, then alphabetical
  const sortedWords = [...filteredWords].sort((a, b) => {
    if (b.wrongCount !== a.wrongCount) {
      return b.wrongCount - a.wrongCount;
    }
    return a.word.localeCompare(b.word);
  });

  // Start Editing Handler
  const startEditing = (item: Word) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  // Submit Edit Handler
  const saveEdit = (id: string) => {
    onEditWord(id, editForm);
    setEditingId(null);
  };

  // Manual Add Form Submit
  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.word.trim() || !newForm.translation.trim()) {
      alert("单词和中文翻译为必填项！");
      return;
    }

    onAddNewManualWord({
      word: newForm.word.trim(),
      phonetic: newForm.phonetic.trim() || '/no-phonetic/',
      translation: newForm.translation.trim(),
      sentence: newForm.sentence.trim() || 'This is a test sentence.',
      sentenceTranslation: newForm.sentenceTranslation.trim() || '这是一个测试句子。'
    });

    // Reset Form
    setNewForm({
      word: '',
      phonetic: '',
      translation: '',
      sentence: '',
      sentenceTranslation: ''
    });
    setIsAddingNew(false);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Hub */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="word-search-input"
            type="text"
            placeholder="在库中搜索英文单词或中文释义..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-slate-700"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="filter-all-btn"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            全部单词 ({words.length})
          </button>
          <button
            id="filter-wrong-btn"
            onClick={() => setFilter('wrong')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1 transition ${
              filter === 'wrong'
                ? 'bg-rose-500 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>错词本 ({words.filter(w => w.wrongCount > 0).length})</span>
          </button>
          <button
            id="filter-active-btn"
            onClick={() => setFilter('not_mastered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1 transition ${
              filter === 'not_mastered'
                ? 'bg-yellow-500 text-white'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-105'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>学习中 ({words.filter(w => !w.mastered).length})</span>
          </button>
          <button
            id="filter-mastered-btn"
            onClick={() => setFilter('mastered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1 transition ${
              filter === 'mastered'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>已掌握 ({words.filter(w => w.mastered).length})</span>
          </button>

          {/* New word quickly */}
          <button
            id="add-single-word-btn"
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer ml-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>录入单个</span>
          </button>
        </div>
      </div>

      {/* Manual Word Add Drawer Form */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-50/50 rounded-2xl border border-indigo-100 overflow-hidden"
          >
            <form onSubmit={handleManualAddSubmit} className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>快捷录入单词卡</span>
                </span>
                <button 
                  type="button" 
                  onClick={() => setIsAddingNew(false)}
                  className="p-0.5 bg-white/70 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 block">单词 Spelling (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. delicious"
                    value={newForm.word}
                    onChange={e => setNewForm({ ...newForm, word: e.target.value })}
                    className="w-full bg-white px-3 py-1.5 text-xs font-semibold border border-indigo-150 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 block">发音音标 Phonetic</label>
                  <input
                    type="text"
                    placeholder="e.g. /dɪˈlɪʃəs/"
                    value={newForm.phonetic}
                    onChange={e => setNewForm({ ...newForm, phonetic: e.target.value })}
                    className="w-full bg-white px-3 py-1.5 text-xs border border-indigo-150 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 block">中文翻译 Translation (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 美味的，芬芳的"
                    value={newForm.translation}
                    onChange={e => setNewForm({ ...newForm, translation: e.target.value })}
                    className="w-full bg-white px-3 py-1.5 text-xs text-slate-600 font-semibold border border-indigo-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 block">情境英文例句 Example Sentence</label>
                  <input
                    type="text"
                    placeholder="e.g. This apple pie is extremely delicious."
                    value={newForm.sentence}
                    onChange={e => setNewForm({ ...newForm, sentence: e.target.value })}
                    className="w-full bg-white px-3 py-1.5 text-xs border border-indigo-150 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 block">例句中文翻译 Sentence Translation</label>
                  <input
                    type="text"
                    placeholder="e.g. 这块苹果派极为美味。"
                    value={newForm.sentenceTranslation}
                    onChange={e => setNewForm({ ...newForm, sentenceTranslation: e.target.value })}
                    className="w-full bg-white px-3 py-1.5 text-xs border border-indigo-150 rounded-lg text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition"
                >
                  确认保存单词
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid of Word Cards */}
      {sortedWords.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-3">
          <AlertCircle className="w-9 h-9 text-slate-350" />
          <div>
            <p className="text-sm font-semibold text-slate-600">当前没有找到满足筛选条件的单词</p>
            <p className="text-xs text-slate-400 mt-1">您可以尝试重新搜索或通过上方 “单个录入” 或 “导入新单词” 新建卡片</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {sortedWords.map((item) => (
              <motion.div
                key={item.id}
                layoutId={`card-${item.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`p-5 rounded-2xl border transition-all ${
                  item.mastered 
                    ? 'bg-emerald-50/20 border-emerald-100' 
                    : item.wrongCount > 0 
                      ? 'bg-rose-50/10 border-rose-150/70' 
                      : 'bg-white border-slate-150'
                } relative shadow-sm hover:shadow-md`}
              >
                {/* Mastered Star Trigger & Stats Badges */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  {item.wrongCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold font-mono text-[10px] rounded-full flex items-center space-x-0.5">
                      <span>错 {item.wrongCount} 次</span>
                    </span>
                  )}
                  {item.mastered && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-full flex items-center space-x-0.5">
                      <span>已掌握</span>
                    </span>
                  )}
                  <button
                    id={`toggle-mastered-${item.id}`}
                    onClick={() => onToggleMastered(item.id)}
                    className={`p-1 rounded-lg transition ${
                      item.mastered ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:text-emerald-500 hover:bg-slate-50'
                    }`}
                    title={item.mastered ? '标记为学习中' : '标记为已掌握'}
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                </div>

                {editingId === item.id ? (
                  /* Inline Editing Form */
                  <div className="space-y-3.5 pr-8">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editForm.word}
                        onChange={e => setEditForm({ ...editForm, word: e.target.value })}
                        className="px-2 py-1 bg-white border border-slate-200 rounded font-bold text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="单词"
                      />
                      <input
                        type="text"
                        value={editForm.phonetic}
                        onChange={e => setEditForm({ ...editForm, phonetic: e.target.value })}
                        className="px-2 py-1 bg-white border border-slate-200 rounded font-mono text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="音标"
                      />
                    </div>
                    <input
                      type="text"
                      value={editForm.translation}
                      onChange={e => setEditForm({ ...editForm, translation: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm text-slate-600 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="中文释义"
                    />
                    <div className="space-y-1.5 bg-slate-50 p-2 rounded">
                      <input
                        type="text"
                        value={editForm.sentence}
                        onChange={e => setEditForm({ ...editForm, sentence: e.target.value })}
                        className="w-full px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="例句"
                      />
                      <input
                        type="text"
                        value={editForm.sentenceTranslation}
                        onChange={e => setEditForm({ ...editForm, sentenceTranslation: e.target.value })}
                        className="w-full px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="例句翻译"
                      />
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        id={`edit-ok-${item.id}`}
                        onClick={() => saveEdit(item.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded border border-slate-200"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Word Card Display */
                  <div className="space-y-3.5 pr-8">
                    {/* Word Spell & Phonetic */}
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-lg md:text-xl font-sans tracking-tight">{item.word}</span>
                        <button
                          onClick={() => playWordTTS(item.word)}
                          className="p-1 hover:bg-indigo-50 text-indigo-500 rounded-full transition"
                          title="播放发音"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs text-slate-400 font-mono tracking-wide">{item.phonetic}</span>
                    </div>

                    {/* Word Definition */}
                    <div className="text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50/55 p-2 rounded-xl border border-slate-100/50">
                      {item.translation}
                    </div>

                    {/* Example Sentence Container with click speaking */}
                    <div 
                      onClick={() => playWordTTS(item.sentence, true)}
                      className="group cursor-pointer p-2.5 rounded-xl border border-slate-50 bg-slate-50/20 hover:bg-indigo-50/10 hover:border-indigo-100 transition"
                      title="点击朗读例句"
                    >
                      <div className="flex items-start space-x-1.5">
                        <Volume2 className="w-3.5 h-3.5 mt-0.5 text-slate-400 group-hover:text-indigo-500 shrink-0 transition" />
                        <div>
                          <p className="text-xs text-slate-600 font-serif italic leading-relaxed font-medium group-hover:text-slate-800 transition">
                            {item.sentence}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed font-serif">
                            {item.sentenceTranslation}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hover Utilities */}
                    <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-100">
                      <span className="text-[10px] text-slate-400">导入时间：{new Date(item.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          id={`edit-word-btn-${item.id}`}
                          onClick={() => startEditing(item)}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition"
                          title="修改属性"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-word-btn-${item.id}`}
                          onClick={() => {
                            if (confirm(`确认要删除 “${item.word}” 吗？删除后不可恢复。`)) {
                              onDeleteWord(item.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                          title="删除单词"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
