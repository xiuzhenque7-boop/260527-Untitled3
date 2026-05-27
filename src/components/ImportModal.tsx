/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Type, Image, Sparkles, Loader2, AlertCircle, Plus, FileText, CheckCircle } from 'lucide-react';
import { Word } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (words: Omit<Word, 'id' | 'createdAt' | 'wrongCount' | 'mastered'>[]) => void;
}

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'photo'>('manual');
  
  // Manual input state
  const [manualText, setManualText] = useState('');
  
  // Photo state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // API and Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedWords, setParsedWords] = useState<any[]>([]);
  const [stage, setStage] = useState<string>(''); // For progress display

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG,/JPEG).');
      return;
    }
    setImageFile(file);
    setError(null);
    setParsedWords([]);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Trigger file browser click
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Reset photo tab state
  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setParsedWords([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Convert image to Base64 (stripping the header metadata)
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64Str = result.split(',')[1];
        resolve(base64Str);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Submit Manual Input
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wordsList = manualText
      .split(/[\n,，、;]/)
      .map(w => w.trim())
      .filter(w => /^[a-zA-Z\s'-]+$/.test(w) && w.length > 0);

    if (wordsList.length === 0) {
      setError('Please enter valid English words (English characters only).');
      return;
    }

    setIsLoading(true);
    setStage('Generating pronunciation and sentences via Gemini...');
    setError(null);

    try {
      const res = await fetch('/api/generate-word-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsList }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to process words.');
      }

      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        setParsedWords(data.results);
      } else {
        throw new Error('Invalid response structure received.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connecting to backend failed. Please check Gemini API key configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Photo Scanning (OCR-AI API)
  const handlePhotoScanSubmit = async () => {
    if (!imageFile) return;

    setIsLoading(true);
    setStage('AI scanning text & creating standard definitions...');
    setError(null);

    try {
      const base64Data = await toBase64(imageFile);
      const res = await fetch('/api/recognize-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Data, 
          mimeType: imageFile.type 
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Decoding photo words failed.');
      }

      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        if (data.results.length === 0) {
          setError('No English words detected in the image. Try another photo or input manually.');
        } else {
          setParsedWords(data.results);
        }
      } else {
        throw new Error('AI parser returned an invalid response schema.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to scan image. Check your internet connection or Gemini API settings.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add words to Library
  const saveImportedWords = () => {
    if (parsedWords.length > 0) {
      onImport(parsedWords);
      // Reset
      setManualText('');
      clearImage();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Main Container */}
      <motion.div 
        id="import-modal-container"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">导入新单词 (Import Words)</h3>
              <p className="text-xs text-slate-500">自动智能补充音标、释义、例句</p>
            </div>
          </div>
          <button 
            id="close-import-modal-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 px-6">
          <button
            id="tab-manual-import"
            onClick={() => { setActiveTab('manual'); setError(null); }}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>手动输入英文</span>
          </button>
          <button
            id="tab-photo-import"
            onClick={() => { setActiveTab('photo'); setError(null); }}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition ${
              activeTab === 'photo'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>拍照/上传照片</span>
          </button>
        </div>

        {/* Scrollable Content Panel */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {parsedWords.length === 0 && !isLoading && (
            <div>
              {/* Tab 1: Manual Input View */}
              {activeTab === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 block">
                      手动输入单词 (English words/phrases)
                    </label>
                    <textarea
                      id="manual-words-textarea"
                      placeholder="e.g.&#10;fantastic&#10;accomplish&#10;break a leg&#10;challenge"
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      className="w-full h-40 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-mono text-sm leading-relaxed"
                    />
                    <p className="text-xs text-slate-400">
                      支持多种分隔方式：每行一个单词、逗号(,) 分隔、逗号逗顿(、) 隔。支持短语。
                    </p>
                  </div>

                  <button
                    id="submit-manual-words-btn"
                    type="submit"
                    disabled={!manualText.trim()}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium rounded-xl shadow-md cursor-pointer shadow-indigo-100 hover:shadow-lg transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>生成单词属性卡</span>
                  </button>
                </form>
              )}

              {/* Tab 2: Photo Import View */}
              {activeTab === 'photo' && (
                <div className="space-y-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {imagePreview ? (
                      <div className="relative w-full max-h-56 flex justify-center overflow-hidden rounded-lg bg-slate-100">
                        <img
                          src={imagePreview}
                          alt="Uploaded Preview"
                          className="max-h-56 object-contain"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearImage();
                          }}
                          className="absolute top-2 right-2 p-1 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3 text-center">
                        <div className="p-3 bg-slate-100 text-slate-500 rounded-full">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">拖拽照片到这里，或 <span className="text-indigo-600">点击上传</span></p>
                          <p className="text-xs text-slate-400 mt-1">支持 JPG, JPEG, PNG 格式图片</p>
                        </div>
                        <div className="px-3 py-1 bg-amber-50 text-amber-700 font-medium text-[11px] rounded-full border border-amber-100 flex items-center space-x-1 mt-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>服务端不存储图片：100% 内存安全传输，适配 Vercel</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {imageFile && (
                    <button
                      id="submit-photo-scan-btn"
                      type="button"
                      onClick={handlePhotoScanSubmit}
                      className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>开启 AI 视觉扫描 (Start Scan)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Loading state / Gemini processing */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <div className="text-center">
                <p className="font-medium text-slate-800 text-sm">正在通过 Gemini 智能构建数据...</p>
                <p className="text-xs text-indigo-600 font-medium mt-1">{stage}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2">
                  我们将自动分析、去重并附加纯正英式/美式音标和生动的例句，确保默写效果。
                </p>
              </div>
            </div>
          )}

          {/* Results Display */}
          {parsedWords.length > 0 && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">AI 提取并解析成功 ({parsedWords.length} 个单词)</h4>
                <button
                  id="reset-import-list-btn"
                  onClick={() => setParsedWords([])}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>重置并重新导入</span>
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {parsedWords.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-slate-800 text-base">{item.word}</span>
                      <span className="text-xs text-slate-400 font-mono font-medium">{item.phonetic}</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-1.5"><span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1 py-0.5 rounded mr-1">释义</span> {item.translation}</p>
                    <div className="text-xs border-l-2 border-indigo-100 pl-2 py-0.5 mt-1 bg-white/50 rounded">
                      <p className="text-slate-500 font-serif italic">{item.sentence}</p>
                      <p className="text-slate-400 font-serif">{item.sentenceTranslation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {parsedWords.length > 0 && !isLoading && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-100 transition"
            >
              取消
            </button>
            <button
              onClick={saveImportedWords}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition"
            >
              确人导入词库
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
