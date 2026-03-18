import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, BookOpen, X, Download, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { generateQuestions } from './gemini';
import { QuizData, FileData, QuizOptions, QuestionType } from './types';

export default function App() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  
  // Quiz Options State
  const [options, setOptions] = useState<QuizOptions>({
    totalCount: 5,
    difficultyDistribution: {
      상: 1,
      중: 3,
      하: 1
    },
    questionConfigs: [
      { difficulty: '상', type: 'multiple_choice' },
      { difficulty: '중', type: 'multiple_choice' },
      { difficulty: '중', type: 'multiple_choice' },
      { difficulty: '중', type: 'short_answer' },
      { difficulty: '하', type: 'short_answer' },
    ]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const questionTypeOptions: { id: QuestionType; label: string }[] = [
    { id: 'multiple_choice', label: '객관식 (4지/5지)' },
    { id: 'short_answer', label: '단답형 (주관식)' },
    { id: 'descriptive', label: '서술형/논술형' },
    { id: 'ox_quiz', label: 'O/X 퀴즈' },
    { id: 'selection', label: '보기 선택형 (ㄱ,ㄴ,ㄷ)' },
    { id: 'content_match', label: '내용 일치/불일치' },
  ];

  // Update question configs when distribution changes
  const updateQuestionConfigs = (dist: { 상: number, 중: number, 하: number }) => {
    const newConfigs: QuizOptions['questionConfigs'] = [];
    
    // Add 'High'
    for (let i = 0; i < dist.상; i++) newConfigs.push({ difficulty: '상', type: 'multiple_choice' });
    // Add 'Medium'
    for (let i = 0; i < dist.중; i++) newConfigs.push({ difficulty: '중', type: 'multiple_choice' });
    // Add 'Low'
    for (let i = 0; i < dist.하; i++) newConfigs.push({ difficulty: '하', type: 'short_answer' });
    
    return newConfigs;
  };

  const handleTotalCountChange = (count: number) => {
    // Simple distribution logic: mostly medium
    const mid = Math.floor(count * 0.6);
    const high = Math.floor((count - mid) / 2);
    const low = count - mid - high;
    
    const newDist = { 상: high, 중: mid, 하: low };
    setOptions({
      ...options,
      totalCount: count,
      difficultyDistribution: newDist,
      questionConfigs: updateQuestionConfigs(newDist)
    });
  };

  const handleDistChange = (diff: '상' | '중' | '하', val: number) => {
    const newDist = { ...options.difficultyDistribution, [diff]: Math.max(0, val) };
    setOptions({
      ...options,
      difficultyDistribution: newDist,
      questionConfigs: updateQuestionConfigs(newDist)
    });
  };

  const updateIndividualType = (index: number, type: QuestionType) => {
    const newConfigs = [...options.questionConfigs];
    newConfigs[index] = { ...newConfigs[index], type };
    setOptions({ ...options, questionConfigs: newConfigs });
  };

  const currentSum = options.difficultyDistribution.상 + options.difficultyDistribution.중 + options.difficultyDistribution.하;
  const isCountValid = currentSum === options.totalCount;

  const processFiles = (newFiles: File[]) => {
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    const validFiles = newFiles.filter(f => 
      (f.type.startsWith('image/') || f.type === 'application/pdf') && f.size <= MAX_SIZE
    );
    
    if (newFiles.some(f => f.size > MAX_SIZE)) {
      setError('일부 파일이 50MB를 초과하여 제외되었습니다.');
    }
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setFiles(prev => [...prev, { file, base64: base64Data, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
      setError('파일을 업로드해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setQuizData(null);

    try {
      const data = await generateQuestions(files, options);
      setQuizData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '문제 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadHWP = () => {
    if (!quizData) return;
    
    const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

    let htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>AI 교과서 문제 출제기</title>
      <style>
        body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; padding: 30px; }
        h1 { font-size: 15pt; font-weight: bold; margin-top: 0; margin-bottom: 5px; }
        h2 { font-size: 12pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; }
        p { font-size: 11pt; line-height: 1.4; margin: 2px 0; }
        .summary { padding: 0; margin-bottom: 15px; }
        .question-container { margin-bottom: 20px; }
        .options { margin-left: 20px; margin-top: 5px; margin-bottom: 8px; }
        .options p { margin: 1px 0; line-height: 1.2; }
        .answer-box { padding: 5px 0; border-top: 1px dashed #ccc; margin-top: 8px; }
        .answer { font-weight: bold; color: #00C896; margin-bottom: 2px; }
        .explanation { color: #555; font-size: 10pt; }
      </style>
    </head>
    <body>
      <h1>[본문 요약]</h1>
      <div class="summary">
        <p>${quizData.document_summary}</p>
      </div>
    `;

    const getTypeName = (type: QuestionType) => {
      switch (type) {
        case 'multiple_choice': return '객관식';
        case 'short_answer': return '단답형';
        case 'descriptive': return '서술형';
        case 'ox_quiz': return 'O/X 퀴즈';
        case 'selection': return '보기 선택형';
        case 'content_match': return '내용 일치';
        default: return type;
      }
    };

    quizData.questions.forEach((q, i) => {
      htmlContent += `
        <div class="question-container">
          <h2>문제 ${i + 1}. [${getTypeName(q.type)}] [난이도: ${q.difficulty}]</h2>
          <p style="margin-bottom: 5px;">${q.question}</p>
      `;
      
      if ((q.type === 'multiple_choice' || q.type === 'selection') && q.options && q.options.length > 0) {
        htmlContent += `<div class="options">`;
        q.options.forEach((opt, j) => {
          const num = j < 10 ? circleNumbers[j] : `${j+1}.`;
          htmlContent += `<p style="margin-top: 1px; margin-bottom: 1px; line-height: 1.2;">${num} ${opt}</p>`;
        });
        htmlContent += `</div>`;
      }
      
      htmlContent += `
          <div class="answer-box">
            <p class="answer">정답: ${q.answer}</p>
            <p class="explanation">해설: ${q.explanation}</p>
          </div>
        </div>
      `;
    });

    htmlContent += `</body></html>`;

    const blob = new Blob([htmlContent], { type: 'application/vnd.hancom.hwp;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '출제문제.hwp';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans selection:bg-[#E6FAF5] selection:text-[#00C896]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#00C896] p-2 rounded-xl text-white shadow-sm">
              <BookOpen size={22} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#00C896]">AI 교과서 문제 출제기</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 mr-6">
              <button className="text-sm font-bold text-[#00C896] border-b-2 border-[#00C896] pb-5 mt-5">문제 출제</button>
            </nav>
            <div className="text-xs font-bold text-[#00C896] bg-[#E6FAF5] px-3 py-1.5 rounded-full border border-[#00C896]/20">
              수석 교사 모드
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-white">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <FileText size={20} className="text-[#00C896]" />
                  학습 자료 업로드
                </h2>
                <p className="text-sm text-slate-500 mt-1">교과서 본문 이미지나 PDF 파일을 업로드하세요.</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Drag and Drop Zone */}
                <div>
                  <div 
                    className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                      isDragging ? 'border-[#00C896] bg-[#E6FAF5]' : 'border-slate-200 hover:bg-slate-50 hover:border-[#00C896]'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-[#00C896] text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Upload size={28} />
                    </div>
                    <p className="text-base text-slate-700 font-bold mb-1">파일을 여기로 드래그하세요</p>
                    <p className="text-xs text-slate-400">PNG, JPG, JPEG, PDF (최대 50MB)</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInput}
                    accept="image/png, image/jpeg, image/jpg, application/pdf"
                    multiple
                    className="hidden"
                  />
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center justify-between">
                      <span>업로드된 파일</span>
                      <span className="text-[#00C896] bg-[#E6FAF5] px-2 py-0.5 rounded-md text-xs">{files.length}개</span>
                    </h3>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {files.map((fileData, index) => (
                        <div key={index} className="group relative rounded-2xl border border-slate-100 bg-white p-3 flex items-center gap-4 hover:border-[#00C896]/30 hover:shadow-md transition-all">
                          <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center border border-slate-100">
                            {fileData.mimeType.startsWith('image/') ? (
                              <img src={URL.createObjectURL(fileData.file)} alt="preview" className="h-full w-full object-cover" />
                            ) : (
                              <FileText className="text-[#00C896]" size={24} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{fileData.file.name}</p>
                            <p className="text-xs text-slate-400">{(fileData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings Panel */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                      <Settings2 size={18} className="text-[#00C896]" />
                      출제 옵션 설정
                    </div>
                    {showSettings ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  
                  {showSettings && (
                    <div className="p-5 space-y-6 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Step 1: Total Count */}
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#00C896] text-white text-[10px] flex items-center justify-center">1</span>
                            총 문항 수 설정
                          </span>
                          <span className="text-[#00C896] font-mono">{options.totalCount}개</span>
                        </label>
                        <input 
                          type="range" 
                          min="1" 
                          max="20" 
                          value={options.totalCount}
                          onChange={(e) => handleTotalCountChange(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#00C896]"
                        />
                      </div>

                      {/* Step 2: Difficulty Distribution */}
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#00C896] text-white text-[10px] flex items-center justify-center">2</span>
                          난이도별 문항 수 배분
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['상', '중', '하'] as const).map((d) => (
                            <div key={d} className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 block text-center">{d}</span>
                              <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                <button 
                                  onClick={() => handleDistChange(d, options.difficultyDistribution[d] - 1)}
                                  className="px-2 py-2 hover:bg-slate-100 text-slate-400"
                                >-</button>
                                <input 
                                  type="number" 
                                  value={options.difficultyDistribution[d]}
                                  onChange={(e) => handleDistChange(d, parseInt(e.target.value) || 0)}
                                  className="w-full bg-transparent text-center text-sm font-bold text-slate-700 focus:outline-none"
                                />
                                <button 
                                  onClick={() => handleDistChange(d, options.difficultyDistribution[d] + 1)}
                                  className="px-2 py-2 hover:bg-slate-100 text-slate-400"
                                >+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {!isCountValid && (
                          <p className="text-[10px] text-red-500 font-bold animate-pulse">
                            * 문항 수 합계({currentSum})가 총 문항 수({options.totalCount})와 일치해야 합니다.
                          </p>
                        )}
                      </div>

                      {/* Step 3: Individual Types */}
                      {isCountValid && options.questionConfigs.length > 0 && (
                        <div className="space-y-3">
                          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#00C896] text-white text-[10px] flex items-center justify-center">3</span>
                            개별 문항 유형 상세 설정
                          </label>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {options.questionConfigs.map((config, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 bg-slate-50/30">
                                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                  config.difficulty === '상' ? 'bg-red-50 text-red-600' :
                                  config.difficulty === '중' ? 'bg-amber-50 text-amber-600' :
                                  'bg-green-50 text-green-600'
                                }`}>
                                  {config.difficulty}
                                </span>
                                <div className="flex-1 relative">
                                  <select 
                                    value={config.type}
                                    onChange={(e) => updateIndividualType(idx, e.target.value as QuestionType)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#00C896]/20"
                                  >
                                    {questionTypeOptions.map(type => (
                                      <option key={type.id} value={type.id}>{type.label}</option>
                                    ))}
                                  </select>
                                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || files.length === 0 || !isCountValid}
                  className="w-full bg-[#00C896] hover:bg-[#00B488] disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-full shadow-lg shadow-[#00C896]/20 transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={22} className="animate-spin" />
                      문제 출제 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={22} />
                      문제 출제하기
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-7">
            {isGenerating ? (
              <div className="h-full min-h-[500px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#E6FAF5] rounded-full animate-ping opacity-75"></div>
                  <div className="relative bg-[#00C896] text-white p-6 rounded-full shadow-xl">
                    <Loader2 size={40} className="animate-spin" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">AI 수석 교사가 문제를 출제하고 있습니다</h3>
                  <p className="text-sm text-slate-500 mt-3 max-w-sm mx-auto leading-relaxed">
                    업로드된 자료를 정밀 분석하여 최적의 문제를 생성 중입니다.<br/>잠시만 기다려주세요.
                  </p>
                </div>
              </div>
            ) : quizData ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Summary Card */}
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-[#00C896] rounded-full"></div>
                      <h3 className="text-lg font-bold text-slate-800">본문 요약</h3>
                    </div>
                    <button
                      onClick={downloadHWP}
                      className="flex items-center gap-2 text-sm font-bold text-[#00C896] bg-white border-2 border-[#00C896] hover:bg-[#E6FAF5] px-5 py-2.5 rounded-full transition-all active:scale-[0.95]"
                    >
                      <Download size={18} />
                      HWP 다운로드
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <p className="text-slate-700 font-medium leading-relaxed text-lg">
                      {quizData.document_summary}
                    </p>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-6">
                  {quizData.questions.map((q, index) => (
                    <div key={q.id} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden group hover:border-[#00C896]/20 transition-all">
                      <div className="p-8">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                              문제 {index + 1}
                            </span>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                              q.type === 'multiple_choice' ? 'bg-[#E6FAF5] text-[#00C896]' : 
                              q.type === 'short_answer' ? 'bg-blue-50 text-blue-600' :
                              q.type === 'descriptive' ? 'bg-purple-50 text-purple-600' :
                              q.type === 'ox_quiz' ? 'bg-orange-50 text-orange-600' :
                              q.type === 'selection' ? 'bg-indigo-50 text-indigo-600' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {questionTypeOptions.find(opt => opt.id === q.type)?.label.split(' ')[0] || q.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">난이도</span>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                              q.difficulty === '상' ? 'bg-red-50 text-red-600' :
                              q.difficulty === '중' ? 'bg-amber-50 text-amber-600' :
                              'bg-green-50 text-green-600'
                            }`}>
                              {q.difficulty}
                            </span>
                          </div>
                        </div>

                        <h4 className="text-xl font-bold text-slate-900 mb-8 leading-snug">
                          {q.question}
                        </h4>

                        {(q.type === 'multiple_choice' || q.type === 'selection') && q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 gap-3 mb-8">
                            {q.options.map((opt, i) => (
                              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 group-hover:bg-white transition-colors">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 shadow-sm">
                                  {i + 1}
                                </span>
                                <span className="text-base text-slate-700 font-medium">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-slate-50">
                          <div className="bg-[#E6FAF5] rounded-2xl p-6 border border-[#00C896]/10">
                            <div className="flex items-start gap-4">
                              <div className="bg-[#00C896] text-white p-2 rounded-xl shadow-sm">
                                <CheckCircle2 size={20} />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#00C896] uppercase tracking-wider">정답</span>
                                  <span className="text-lg font-bold text-slate-800">{q.answer}</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">해설</span>
                                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    {q.explanation}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 border-dashed flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-[#E6FAF5] rounded-full flex items-center justify-center mb-6 text-[#00C896]">
                  <BookOpen size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">출제된 문제가 없습니다</h3>
                <p className="text-sm text-slate-500 mt-3 max-w-sm mx-auto leading-relaxed">
                  좌측에서 교과서 본문 이미지나 PDF를 업로드한 후<br/><strong>'문제 출제하기'</strong> 버튼을 클릭하세요.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
