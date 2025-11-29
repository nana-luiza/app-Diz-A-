import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppView, GameQuestion, GameLevel } from './types';
import { speak, stopSpeech, configureTTS, getVoices } from './services/tts';
import { analyzeImageText, askAssistant, checkWriting, generateLiteracyGame } from './services/gemini';
import { VoiceButton } from './components/VoiceButton';
import { 
  Camera, 
  Image as ImageIcon, 
  Pencil, 
  Bot, 
  ArrowLeft, 
  RefreshCw, 
  Mic,
  CheckCircle2,
  XCircle,
  Volume2,
  History,
  GraduationCap,
  Settings,
  Type,
  CaseLower,
  Ear,
  Puzzle,
  BookOpen,
  AlignLeft,
  FileText,
  Library,
  Lock,
  Moon,
  Sun,
  Eye,
  PlayCircle,
  Palette,
  MicOff,
  Rabbit,
  Turtle,
  User,
  Trash2,
  Unlock,
  Home,
  Star,
  ScanLine
} from 'lucide-react';

// --- CONSTANTS ---

const QUESTIONS_PER_LEVEL = 5; // Alterado para 5 conforme solicitado

// Definition of prompts adjusted to force the Service to generate the correct JSON
// matching the GameQuestion interface (question, options[], correctAnswer, explanation)
const LEVELS: GameLevel[] = [
  {
    id: 1,
    subtitle: "Nível 1",
    title: "Alfabeto",
    description: "Sequência do Alfabeto (Anterior e Próxima).",
    icon: "Type",
    promptContext: `
    GERE UMA QUESTÃO DE ALFABETO.
    Lógica (siga estritamente):
    1. O sistema enviará "tipo" ("proxima" ou "anterior") e "letra_base" aleatoriamente.
    2. Mas como aqui é um prompt geral, você deve ESCOLHER ALEATORIAMENTE um "tipo" e uma "letra_base" agora.
    3. Se tipo="proxima": Pergunta = "Qual é a próxima letra após [LETRA]?"
    4. Se tipo="anterior": Pergunta = "Qual letra vem antes de [LETRA]?"
    5. Gere 3 alternativas (letras). Apenas 1 correta.

    JSON fields:
       "question": "A pergunta gerada",
       "options": ["Opção1", "Opção2", "Opção3"],
       "correctAnswer": "A Opção Correta",
       "explanation": "A ordem é ... [LETRA ANTERIOR], [LETRA], [LETRA SEGUINTE]."
    `,
    isLocked: false
  },
  {
    id: 2,
    subtitle: "Nível 2",
    title: "Vogais",
    description: "Identificar vogais em palavras.",
    icon: "CaseLower",
    promptContext: `
    GERE UMA QUESTÃO DE VOGAIS.
    Lógica: Escolha uma palavra simples e oculte uma vogal (ex: P _ T O).
    JSON fields:
      "question": "Qual vogal completa a palavra: [PALAVRA_INCOMPLETA]?",
      "options": [Vogal Correta, Vogal Errada, Vogal Errada],
      "correctAnswer": "Vogal Correta",
      "explanation": "A palavra é [PALAVRA]."
    `,
    isLocked: true
  },
  {
    id: 3,
    subtitle: "Nível 3",
    title: "Fonemas",
    description: "Identificar sons iniciais.",
    icon: "Ear",
    promptContext: `
    GERE UMA QUESTÃO DE FONEMAS.
    Lógica: Escolha um fonema/som inicial.
    JSON fields:
      "question": "Qual destas palavras começa com o som da letra [LETRA]?",
      "options": [Palavra Correta, Palavra Errada, Palavra Errada],
      "correctAnswer": "Palavra Correta",
      "explanation": "[PALAVRA] começa com [LETRA]."
    `,
    isLocked: true
  },
  {
    id: 4,
    subtitle: "Nível 4",
    title: "Sílabas",
    description: "Contagem de sílabas.",
    icon: "Puzzle",
    promptContext: `
    GERE UMA QUESTÃO DE SÍLABAS.
    Lógica: Escolha uma palavra. Conte as sílabas.
    JSON fields:
      "question": "Quantas sílabas tem a palavra [PALAVRA]?",
      "options": ["Numero Correto", "Numero Errado", "Numero Errado"],
      "correctAnswer": "Numero Correto",
      "explanation": "A separação é [SE-PA-RA-ÇÃO]."
    `,
    isLocked: true
  },
  {
    id: 5,
    subtitle: "Nível 5",
    title: "Palavras",
    description: "Ortografia correta.",
    icon: "BookOpen",
    promptContext: `
    GERE UMA QUESTÃO DE ORTOGRAFIA.
    Lógica: Escolha uma palavra comum que as pessoas erram.
    JSON fields:
      "question": "Qual é a forma correta de escrever?",
      "options": [Escrita Correta, Escrita Errada, Escrita Errada],
      "correctAnswer": "Escrita Correta",
      "explanation": "Escreve-se [PALAVRA]."
    `,
    isLocked: true
  },
  {
    id: 6,
    subtitle: "Nível 6",
    title: "Frases",
    description: "Organização de frases.",
    icon: "AlignLeft",
    promptContext: `
    GERE UMA QUESTÃO DE ORDENAR FRASES.
    Lógica: Crie uma frase de 3 ou 4 palavras e embaralhe.
    JSON fields:
      "question": "Qual a ordem certa das palavras: [PALAVRAS EMBARALHADAS]?",
      "options": [Frase Correta, Frase Sem Sentido 1, Frase Sem Sentido 2],
      "correctAnswer": "Frase Correta",
      "explanation": "A frase correta é: [FRASE]."
    `,
    isLocked: true
  },
  {
    id: 7,
    subtitle: "Nível 7",
    title: "Textos",
    description: "Interpretação de texto curto.",
    icon: "FileText",
    promptContext: `
    GERE UMA QUESTÃO DE INTERPRETAÇÃO.
    Lógica: Crie um micro-texto (2 frases). Faça uma pergunta simples.
    JSON fields:
      "question": "Texto: '[TEXTO]'. Pergunta: [PERGUNTA SOBRE O TEXTO]",
      "options": [Resposta Certa, Resposta Errada, Resposta Errada],
      "correctAnswer": "Resposta Certa",
      "explanation": "A resposta está no texto."
    `,
    isLocked: true
  },
  {
    id: 8,
    subtitle: "Nível 8",
    title: "Histórias",
    description: "Completar a história.",
    icon: "Library",
    promptContext: `
    GERE UMA QUESTÃO DE NARRATIVA.
    Lógica: Crie o início de uma história.
    JSON fields:
      "question": "Continue a história: '[INICIO]...'",
      "options": [Continuação Lógica, Continuação Sem Sentido, Continuação Nada a Ver],
      "correctAnswer": "Continuação Lógica",
      "explanation": "Isso faz sentido para a história."
    `,
    isLocked: true
  }
];

const ICON_MAP: Record<string, React.FC<any>> = {
  Type, CaseLower, Ear, Puzzle, BookOpen, AlignLeft, FileText, Library
};

// --- SETTINGS TYPES ---
interface AppSettings {
  // Audio
  volume: number; // 0 to 1
  speechRate: number; // 0.5 to 1.5
  voiceURI: string;
  autoRepeat: boolean;
  // Visual
  fontSize: 'small' | 'medium' | 'large';
  fontType: 'lexend' | 'sans' | 'serif' | 'dyslexic';
  theme: 'light' | 'dark' | 'contrast';
  highlightColor: string;
  showCaptions: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  volume: 1.0,
  speechRate: 1.0,
  voiceURI: '',
  autoRepeat: false,
  fontSize: 'medium',
  fontType: 'lexend',
  theme: 'light',
  highlightColor: 'bg-yellow-200',
  showCaptions: true
};

// --- HELPER COMPONENTS ---

const Header = ({ title, onBack, subtitle }: { title: string, onBack?: () => void, subtitle?: string }) => (
  <div className="sticky top-0 z-10 bg-opacity-95 backdrop-blur-sm p-4 flex items-center gap-4 border-b border-inherit shadow-sm transition-colors duration-300">
    {onBack ? (
      <VoiceButton 
        voiceLabel="Voltar" 
        variant="icon" 
        onClick={onBack}
      >
        <ArrowLeft size={32} strokeWidth={3} />
      </VoiceButton>
    ) : (
       <div className="w-12"></div> 
    )}
    <div className="flex-1 text-center">
      <h1 className={`text-2xl md:text-3xl font-black text-inherit tracking-tight ${subtitle ? 'leading-none' : ''}`}>{title}</h1>
      {subtitle && <p className="text-sm opacity-70 mt-1 font-bold tracking-wide uppercase">{subtitle}</p>}
    </div>
    <div className="w-12">
       {!onBack && <Bot className="opacity-20 mx-auto" size={32}/>}
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [loading, setLoading] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Progress State
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);

  // Game Session State
  const [activeLevel, setActiveLevel] = useState<GameLevel | null>(null);
  const [gameQuestion, setGameQuestion] = useState<GameQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1); // 1 to 5
  const [gameStatus, setGameStatus] = useState<'loading' | 'waiting' | 'success' | 'error'>('loading');
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [score, setScore] = useState(0); // Internal silent scoring

  // Assistant Chat State
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);

  // Camera/Writing State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [writingText, setWritingText] = useState("");
  const [writingResult, setWritingResult] = useState<{corrected: string, changes: string[], feedback: string} | null>(null);

  // Load settings and progress on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('dizai_settings');
    if (savedSettings) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) }); } catch(e) {}
    }

    const savedProgress = localStorage.getItem('dizai_level_progress');
    if (savedProgress) {
        try { setMaxUnlockedLevel(parseInt(savedProgress, 10)); } catch(e) {}
    }

    const loadVoices = () => {
        const voices = getVoices();
        setAvailableVoices(voices);
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    configureTTS({
        volume: settings.volume,
        rate: settings.speechRate,
        voiceURI: settings.voiceURI
    });
    localStorage.setItem('dizai_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
     localStorage.setItem('dizai_level_progress', maxUnlockedLevel.toString());
  }, [maxUnlockedLevel]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const navigateTo = (view: AppView, message: string) => {
    stopSpeech();
    setCurrentView(view);
    speak(message);
    
    // Reset states when leaving views
    if (view !== AppView.GAMES) {
        setActiveLevel(null);
        setGameQuestion(null);
    }
    if (view !== AppView.ASSISTANT) {
        setChatHistory([]); // Optional: keep history or clear
    }
    if (view !== AppView.WRITING) {
        setWritingResult(null);
        setWritingText("");
    }
  };

  const handleMicInput = () => {
    if (isListening) return; // Already listening

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Navegador sem suporte a voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setChatInput(text);
    };

    recognition.start();
  };

  // Theme & Style Classes
  const getThemeClasses = () => {
    if (settings.theme === 'contrast') return 'bg-black text-yellow-300 border-yellow-300';
    if (settings.theme === 'dark') return 'bg-slate-900 text-white border-slate-700';
    return 'bg-slate-50 text-slate-900 border-slate-200';
  };

  const getFontClass = () => {
      if (settings.fontType === 'serif') return 'font-serif';
      if (settings.fontType === 'sans') return 'font-sans';
      if (settings.fontType === 'dyslexic') return 'font-mono tracking-widest';
      return 'font-[Lexend]';
  };

  const getFontSizeClass = () => {
      if (settings.fontSize === 'small') return 'text-base';
      if (settings.fontSize === 'large') return 'text-2xl';
      return 'text-lg';
  };

  const themeClass = getThemeClasses();
  const fontClass = getFontClass();
  const sizeClass = getFontSizeClass();

  // --- LOGIC: GAMES ---

  const startGameSession = async (level: GameLevel, isNextQuestion: boolean = false) => {
      if (!isNextQuestion) {
        setActiveLevel(level);
        setCurrentQuestionIndex(1);
        setScore(0); // Reset silent score on new session
        speak(`Iniciando ${level.title}.`);
      } else {
        // Just a short beep or word for next question
        // speak(`Próxima.`); 
      }

      setGameStatus('loading');
      setGameQuestion(null);
      setFeedbackMessage("");
      
      const question = await generateLiteracyGame(level.promptContext);
      setGameQuestion(question);
      setGameStatus('waiting');
      speak(question.question);
  };

  const handleGameAnswer = (selectedOption: string) => {
      if (!gameQuestion || !activeLevel) return;

      if (selectedOption === gameQuestion.correctAnswer) {
          // Correct
          setGameStatus('success');
          setScore(s => s + 1); // Increment silent score
          
          if (currentQuestionIndex < QUESTIONS_PER_LEVEL) {
            const successMsg = "Muito bem!";
            setFeedbackMessage(successMsg);
            speak(successMsg);
          } else {
             // Will be handled in render
             speak("Atividade concluída.");
          }
      } else {
          // Incorrect (Tutor Mode: Don't ask to retry, correct gently and move on)
          setGameStatus('error');
          const errorMsg = `Não foi dessa vez. A resposta certa era ${gameQuestion.correctAnswer}.`;
          setFeedbackMessage(errorMsg);
          speak(errorMsg);
      }
  };

  const nextQuestion = () => {
      if (activeLevel) {
          const nextIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIndex);
          startGameSession(activeLevel, true);
      }
  };

  // --- LOGIC: CAMERA ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setLoading(true);
          speak("Analisando imagem.");
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = reader.result as string;
              const base64Data = base64.split(',')[1];
              const text = await analyzeImageText(base64Data);
              setOcrResult(text);
              setLoading(false);
              speak("Li o seguinte. Você pode editar o texto se quiser.");
          };
          reader.readAsDataURL(file);
      }
  };

  // --- VIEW: HOME ---
  const renderHome = () => (
    <div className={`p-6 flex flex-col min-h-screen max-w-md mx-auto transition-colors duration-300 ${themeClass} ${fontClass} ${sizeClass}`}>
      {/* Top Bar */}
      <div className="flex justify-end items-center mb-4">
        <VoiceButton 
            voiceLabel="Configurações" 
            variant="icon" 
            onClick={() => navigateTo(AppView.SETTINGS, "Configurações")}
            className={settings.theme === 'contrast' ? 'text-yellow-300' : 'text-slate-700'}
        >
            <Settings size={32} />
        </VoiceButton>
      </div>

      {/* Logo Area */}
      <div className="flex flex-col items-center mb-8 mt-4">
        <div className="flex items-center gap-3 mb-2">
           <div className={`p-4 rounded-2xl ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-teal-600 text-white shadow-lg shadow-teal-200'}`}>
              <Bot size={48} />
           </div>
           <h1 className="text-5xl font-black tracking-tighter">Diz Aí</h1>
        </div>
        <p className="text-sm font-black tracking-[0.3em] opacity-60 uppercase">Aprenda Lendo</p>
      </div>

      {/* Grid Menu */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <VoiceButton 
          voiceLabel="Fotos. Ler com a câmera."
          onClick={() => navigateTo(AppView.CAMERA, "Abrindo câmera")}
          variant="card"
          customColorClass={settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"}
        >
          <div className={`p-4 rounded-full mb-3 ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-white'}`}>
            <Camera size={32} />
          </div>
          <span className="text-lg font-black tracking-wide">FOTOS</span>
        </VoiceButton>

        <VoiceButton 
          voiceLabel="Assistente. Converse comigo."
          onClick={() => navigateTo(AppView.ASSISTANT, "Assistente.")}
          variant="card"
          customColorClass={settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100"}
        >
          <div className={`p-4 rounded-full mb-3 ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-white'}`}>
            <Bot size={32} />
          </div>
          <span className="text-lg font-black tracking-wide">ASSISTENTE</span>
        </VoiceButton>

        <VoiceButton 
          voiceLabel="Escrita. Praticar palavras."
          onClick={() => navigateTo(AppView.WRITING, "Vamos escrever")}
          variant="card"
          customColorClass={settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : "bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-100"}
        >
          <div className={`p-4 rounded-full mb-3 ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-white'}`}>
            <Pencil size={32} />
          </div>
          <span className="text-lg font-black tracking-wide">ESCRITA</span>
        </VoiceButton>

        <VoiceButton 
          voiceLabel="Atividades. Jogos de leitura."
          onClick={() => navigateTo(AppView.GAMES, "Atividades e Jogos")}
          variant="card"
          customColorClass={settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : "bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100"}
        >
          <div className={`p-4 rounded-full mb-3 ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-white'}`}>
            <GraduationCap size={32} />
          </div>
          <span className="text-lg font-black tracking-wide">ATIVIDADE</span>
        </VoiceButton>
      </div>
    </div>
  );

  // --- VIEW: GAMES (LEVEL SELECTOR) ---
  const renderGames = () => (
      <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
        <Header title="Atividades" onBack={() => navigateTo(AppView.HOME, "Menu inicial")} subtitle={`${maxUnlockedLevel} de ${LEVELS.length} Desbloqueados`} />
        
        <div className="p-6 grid gap-4 overflow-y-auto pb-20">
            {LEVELS.map((level) => {
                const isLocked = level.id > maxUnlockedLevel;
                const Icon = ICON_MAP[level.icon] || GraduationCap;
                
                return (
                    <button
                        key={level.id}
                        onClick={() => {
                            if (!isLocked) {
                                startGameSession(level);
                            } else {
                                speak("Bloqueado. Termine o nível anterior.");
                            }
                        }}
                        className={`
                            relative w-full text-left p-5 rounded-3xl border-b-4 transition-all flex items-center gap-5
                            ${isLocked 
                                ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed grayscale' 
                                : settings.theme === 'contrast'
                                    ? 'bg-black border-yellow-400 text-yellow-400 hover:bg-slate-900'
                                    : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:shadow-md active:translate-y-1 active:border-b-0'
                            }
                        `}
                    >
                        <div className={`
                            w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm
                            ${isLocked 
                                ? 'bg-slate-300 text-white' 
                                : settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-blue-100 text-blue-600'
                            }
                        `}>
                            {isLocked ? <Lock size={28} /> : <Icon size={32} />}
                        </div>
                        
                        <div className="flex-1">
                            <div className="flex justify-end items-center mb-1">
                                {level.id < maxUnlockedLevel && <CheckCircle2 size={20} className="text-green-500" />}
                                {level.id === maxUnlockedLevel && !isLocked && <div className="text-xs font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-md">ATUAL</div>}
                            </div>
                            <h3 className="text-xl font-black leading-tight">{level.title}</h3>
                            <p className="text-sm opacity-70 font-medium leading-snug mt-1 line-clamp-2">{level.description}</p>
                        </div>
                    </button>
                );
            })}
        </div>
      </div>
  );

  // --- VIEW: ACTIVE GAME SESSION ---
  const renderGameSession = () => {
      if (!activeLevel) return null;

      const nextLevel = LEVELS.find(l => l.id === activeLevel.id + 1);
      const isLevelFinished = (gameStatus === 'success' || gameStatus === 'error') && currentQuestionIndex >= QUESTIONS_PER_LEVEL;

      // Report Logic
      const renderReport = () => {
          const wrong = QUESTIONS_PER_LEVEL - score;
          const isFinalLevel = activeLevel.id === LEVELS.length;
          
          // Determine logic for next level unlocking
          const handleFinish = () => {
             if (activeLevel.id === maxUnlockedLevel && !isFinalLevel) {
                 setMaxUnlockedLevel(maxUnlockedLevel + 1);
                 speak("Nível desbloqueado!");
             }
             setActiveLevel(null);
             navigateTo(AppView.GAMES, "Voltando para atividades.");
          };

          return (
              <div className={`p-6 rounded-3xl mb-8 border-2 text-center ${settings.theme === 'contrast' ? 'bg-slate-900 border-yellow-400 text-yellow-400' : 'bg-white border-blue-200 text-slate-800'}`}>
                  <h2 className="text-3xl font-black mb-6">🏁 Fim da atividade!</h2>
                  <p className="text-xl font-bold mb-4">Parabéns pelo esforço.</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 text-2xl font-black">
                      <div className="p-4 bg-green-100 text-green-700 rounded-2xl flex flex-col items-center">
                          <span>✅</span>
                          <span>{score}</span>
                          <span className="text-sm font-normal opacity-70">Acertos</span>
                      </div>
                      <div className="p-4 bg-yellow-100 text-yellow-700 rounded-2xl flex flex-col items-center">
                          <span>⚠️</span>
                          <span>{wrong}</span>
                          <span className="text-sm font-normal opacity-70">Praticar</span>
                      </div>
                  </div>

                  <p className="text-lg italic opacity-80 mb-8">
                      "A persistência é o caminho do êxito. Continue assim!"
                  </p>

                  <VoiceButton 
                      voiceLabel="Concluir atividade"
                      variant="action"
                      fullWidth
                      onClick={handleFinish}
                  >
                      Concluir
                  </VoiceButton>
              </div>
          );
      };

      return (
        <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
            <Header title={activeLevel.title} onBack={() => {
                setActiveLevel(null);
                navigateTo(AppView.GAMES, "Voltando para lista");
            }} subtitle={activeLevel.subtitle} />

            <div className="flex-1 p-6 flex flex-col items-center max-w-2xl mx-auto w-full">
                
                {gameStatus === 'loading' && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50 animate-pulse">
                        <RefreshCw size={64} className="animate-spin" />
                        <p className="text-xl font-bold">Criando atividade...</p>
                    </div>
                )}

                {/* SHOW REPORT ONLY IF FINISHED AND NOT LOADING */}
                {isLevelFinished && gameStatus !== 'loading' ? (
                    renderReport()
                ) : (
                    gameQuestion && (
                        <>
                            <div className={`w-full p-6 rounded-3xl mb-8 text-center shadow-sm border-2 ${settings.theme === 'contrast' ? 'bg-black border-yellow-400' : 'bg-white border-blue-100'}`}>
                                <button onClick={() => speak(gameQuestion.question)} className="mx-auto p-3 rounded-full bg-slate-100 hover:bg-slate-200 mb-4 text-slate-700">
                                    <Volume2 size={32} />
                                </button>
                                <h2 className="text-2xl font-black leading-snug">{gameQuestion.question}</h2>
                            </div>

                            <div className="w-full grid gap-4 mb-6">
                                {gameQuestion.options.map((option, idx) => {
                                    const isCorrect = option === gameQuestion.correctAnswer;
                                    const showResult = gameStatus !== 'waiting';
                                    let btnClass = settings.theme === 'contrast' ? 'bg-slate-900 border-yellow-900 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-blue-300';
                                    
                                    if (showResult) {
                                        if (isCorrect) btnClass = 'bg-green-100 border-green-500 text-green-800';
                                        else if (gameStatus === 'error') btnClass = 'bg-red-50 border-red-200 text-red-300 opacity-50';
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={gameStatus !== 'waiting'}
                                            onClick={() => handleGameAnswer(option)}
                                            className={`
                                                w-full p-6 rounded-2xl border-b-4 text-left font-bold text-xl transition-all active:scale-95
                                                ${btnClass}
                                            `}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>

                            {gameStatus !== 'waiting' && (
                                <div className={`w-full p-6 rounded-2xl mb-20 animate-in slide-in-from-bottom-10 fade-in
                                    ${gameStatus === 'success' ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}
                                `}>
                                    <div className="flex items-start gap-4">
                                        {gameStatus === 'success' ? <CheckCircle2 size={40} className="shrink-0" /> : <XCircle size={40} className="shrink-0" />}
                                        <div>
                                            <p className="text-lg font-black mb-1">{gameStatus === 'success' ? "Acertou!" : "Atenção!"}</p>
                                            <p className="text-lg leading-snug">{feedbackMessage}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )
                )}
            </div>

            {/* Bottom Action Bar (Only if not finished and not loading) */}
            {gameStatus !== 'loading' && !isLevelFinished && (
                <div className={`fixed bottom-0 left-0 right-0 p-4 ${settings.theme === 'contrast' ? 'bg-black border-t border-yellow-400' : 'bg-white border-t border-slate-200'}`}>
                    <div className="max-w-md mx-auto flex gap-4">
                        <VoiceButton 
                            voiceLabel="Ouvir novamente"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => gameQuestion && speak(gameQuestion.question)}
                        >
                            <Volume2 />
                        </VoiceButton>
                        
                        {gameStatus !== 'waiting' && (
                            <VoiceButton 
                                voiceLabel="Continuar"
                                variant="action"
                                className="flex-[2]"
                                onClick={() => {
                                    if (gameStatus === 'success' || gameStatus === 'error') {
                                        nextQuestion();
                                    }
                                }}
                            >
                                Continuar <ArrowLeft className="rotate-180 ml-2" />
                            </VoiceButton>
                        )}
                    </div>
                </div>
            )}
        </div>
      );
  };

  // --- VIEW: SETTINGS ---
  const renderSettings = () => {
    const sectionTitleClass = `text-lg font-black uppercase tracking-widest mb-4 mt-8 border-b-2 pb-2 ${settings.theme === 'contrast' ? 'text-yellow-400 border-yellow-400' : 'text-slate-400 border-slate-200'}`;
    const cardClass = `p-5 rounded-3xl border-b-4 flex flex-col gap-4 shadow-sm ${settings.theme === 'contrast' ? 'bg-slate-900 border-yellow-900' : 'bg-white border-slate-200'}`;

    return (
        <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
            <Header title="Configurações" onBack={() => navigateTo(AppView.HOME, "Salvando")} />
            
            <div className="flex-1 p-6 overflow-y-auto max-w-lg mx-auto w-full pb-20">
                
                {/* AUDIO SECTION */}
                <h3 className={sectionTitleClass}>Áudio e Voz</h3>
                
                {/* Volume */}
                <div className={cardClass}>
                    <div className="flex items-center justify-between">
                         <label className="font-black flex items-center gap-3 text-xl"><Volume2 size={28}/> Volume</label>
                         <span className="font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg text-slate-900 border">{Math.round(settings.volume * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.1"
                        value={settings.volume}
                        onChange={(e) => setSettings({...settings, volume: parseFloat(e.target.value)})}
                        className="w-full h-6 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 mt-2"
                    />
                </div>

                {/* Speed */}
                <div className={cardClass}>
                    <label className="font-black flex items-center gap-3 text-xl"><Rabbit size={28}/> Velocidade</label>
                    <div className="flex gap-2 mt-2">
                        {[
                            { label: 'Lento', val: 0.5, icon: Turtle }, 
                            { label: 'Normal', val: 1.0, icon: User }, 
                            { label: 'Rápido', val: 1.5, icon: Rabbit }
                        ].map((opt) => (
                            <button 
                                key={opt.label}
                                onClick={() => {
                                    setSettings({...settings, speechRate: opt.val});
                                    speak("Teste de velocidade");
                                }}
                                className={`flex-1 py-3 rounded-xl font-black text-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center gap-2
                                    ${settings.speechRate === opt.val 
                                        ? (settings.theme === 'contrast' ? 'bg-yellow-400 text-black border-yellow-600' : 'bg-blue-600 text-white border-blue-800')
                                        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                    }`}
                            >
                                <opt.icon size={20} />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Voice */}
                <div className={cardClass}>
                    <label className="font-black flex items-center gap-3 text-xl"><Bot size={28}/> Tipo de Voz</label>
                    <div className="relative">
                        <select 
                            value={settings.voiceURI}
                            onChange={(e) => {
                                setSettings({...settings, voiceURI: e.target.value});
                                setTimeout(() => speak("Minha nova voz é esta."), 200);
                            }}
                            className={`w-full p-4 rounded-xl border-2 font-bold appearance-none ${settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                        >
                            {availableVoices.length === 0 && <option value="">Padrão do Sistema</option>}
                            {availableVoices.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                </div>


                {/* VISUAL SECTION */}
                <h3 className={sectionTitleClass}>Visual</h3>

                {/* Font Size */}
                <div className={cardClass}>
                    <label className="font-black flex items-center gap-3 text-xl"><Type size={28}/> Tamanho</label>
                    <div className="flex gap-2 items-end mt-2">
                         <button onClick={() => setSettings({...settings, fontSize: 'small'})} className={`p-3 border-2 rounded-xl flex-1 font-bold ${settings.fontSize === 'small' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200'}`}>A-</button>
                         <button onClick={() => setSettings({...settings, fontSize: 'medium'})} className={`p-4 border-2 rounded-xl flex-1 font-black text-xl ${settings.fontSize === 'medium' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200'}`}>A</button>
                         <button onClick={() => setSettings({...settings, fontSize: 'large'})} className={`p-5 border-2 rounded-xl flex-1 font-black text-2xl ${settings.fontSize === 'large' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200'}`}>A+</button>
                    </div>
                </div>

                {/* Theme */}
                <div className={cardClass}>
                    <label className="font-black flex items-center gap-3 text-xl"><Palette size={28}/> Cores</label>
                    <div className="flex gap-2 mt-2">
                        <button onClick={() => setSettings({...settings, theme: 'light'})} className={`flex-1 p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>
                            <Sun size={24} /> Claro
                        </button>
                        <button onClick={() => setSettings({...settings, theme: 'contrast'})} className={`flex-1 p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 ${settings.theme === 'contrast' ? 'border-yellow-400 bg-black text-yellow-400' : 'border-slate-200 bg-slate-900 text-slate-400'}`}>
                            <Eye size={24} /> Contraste
                        </button>
                    </div>
                </div>

                {/* PROGRESS */}
                <h3 className={sectionTitleClass}>Progresso</h3>
                <div className={cardClass}>
                     <div className="flex items-center justify-between">
                        <div>
                            <label className="font-black text-xl">Níveis</label>
                            <p className="text-sm opacity-70">Você está no nível {maxUnlockedLevel} de {LEVELS.length}.</p>
                        </div>
                        <button 
                            onClick={() => {
                                if (confirm("Tem certeza que deseja reiniciar todo o progresso dos níveis?")) {
                                    setMaxUnlockedLevel(1);
                                    speak("Progresso reiniciado.");
                                }
                            }}
                            className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-100"
                        >
                            <Trash2 size={24} />
                        </button>
                     </div>
                </div>

            </div>
        </div>
    );
  };

  // --- VIEW: CAMERA ---
  const renderCamera = () => (
      <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
        <Header title="Câmera" onBack={() => navigateTo(AppView.HOME, "Menu inicial")} />
        
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            {!ocrResult ? (
                <>
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 border-4 border-dashed ${settings.theme === 'contrast' ? 'border-yellow-400 bg-slate-900' : 'border-slate-300 bg-slate-100'}`}>
                        {loading ? <RefreshCw size={40} className="animate-spin opacity-50" /> : <ScanLine size={48} className="opacity-30" />}
                    </div>
                    
                    <p className="text-xl font-bold mb-8 max-w-xs mx-auto">
                        Escolha como quer ler o texto.
                    </p>

                    <div className="flex flex-col gap-4 w-full">
                        <label className={`
                            w-full py-5 rounded-2xl shadow-md text-xl font-black cursor-pointer flex items-center justify-center gap-3 transition-transform active:scale-95
                            ${settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white hover:bg-blue-700'}
                        `}>
                            <Camera size={28} />
                            TIRAR FOTO
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*" 
                                capture="environment"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </label>

                        <label className={`
                            w-full py-5 rounded-2xl shadow-sm text-xl font-black cursor-pointer flex items-center justify-center gap-3 transition-transform active:scale-95 border-2
                            ${settings.theme === 'contrast' ? 'border-yellow-400 text-yellow-400' : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50'}
                        `}>
                            <ImageIcon size={28} />
                            GALERIA
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </label>
                    </div>
                </>
            ) : (
                <div className="flex-1 w-full flex flex-col">
                    <p className="text-sm font-black uppercase opacity-60 mb-2 tracking-widest text-left">Texto Encontrado (Você pode editar):</p>
                    <textarea 
                        className={`flex-1 p-6 rounded-2xl text-left mb-6 resize-none text-2xl leading-relaxed font-medium border-2 outline-none focus:ring-4 focus:ring-blue-100 transition-all ${settings.theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-white border-slate-200 text-slate-800'}`}
                        value={ocrResult}
                        onChange={(e) => setOcrResult(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <VoiceButton voiceLabel="Ouvir texto" variant="primary" onClick={() => speak(ocrResult)}>
                            <Volume2 size={24} className="mr-2" /> Ouvir
                        </VoiceButton>
                        <VoiceButton voiceLabel="Tentar outra foto" variant="secondary" onClick={() => { setOcrResult(""); setOcrResult(""); }}>
                            <RefreshCw size={24} className="mr-2" /> Nova Foto
                        </VoiceButton>
                    </div>
                </div>
            )}
        </div>
      </div>
  );

  // --- VIEW: WRITING ---
  const renderWriting = () => (
      <div className={`min-h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
         <Header title="Escrita" onBack={() => navigateTo(AppView.HOME, "Menu inicial")} />
         <div className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full">
            
            <div className={`p-6 rounded-3xl mb-4 border-2 flex-1 flex flex-col relative ${settings.theme === 'contrast' ? 'bg-black border-yellow-400' : 'bg-white border-purple-100'}`}>
                <label className="block text-sm font-black opacity-50 uppercase tracking-wider mb-2">Seu texto:</label>
                <textarea 
                    value={writingText}
                    onChange={(e) => setWritingText(e.target.value)}
                    placeholder="Escreva aqui..."
                    className={`w-full flex-1 bg-transparent text-2xl font-bold outline-none resize-none placeholder:opacity-30 ${settings.theme === 'contrast' ? 'text-yellow-400' : 'text-slate-800'}`}
                />
                <button 
                    onClick={() => speak(writingText || "Escreva algo primeiro")} 
                    className="absolute bottom-4 right-4 p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    aria-label="Ler texto"
                >
                    <Volume2 size={24} />
                </button>
            </div>

            {writingResult && (
                <div className={`p-6 rounded-3xl mb-6 border-2 animate-in fade-in slide-in-from-bottom-4 ${settings.theme === 'contrast' ? 'bg-slate-900 border-green-400 text-white' : 'bg-green-50 border-green-200 text-slate-800'}`}>
                    <div className="flex items-center gap-3 mb-4 text-green-600">
                        <CheckCircle2 size={32} />
                        <h3 className="font-black text-xl">Correção</h3>
                    </div>

                    <div className="mb-4">
                        <p className="opacity-60 text-xs font-black uppercase mb-2 tracking-widest">Texto Corrigido</p>
                        <div className="flex items-start gap-2">
                             <p className="text-2xl font-bold leading-relaxed">{writingResult.corrected}</p>
                             <button onClick={() => speak(writingResult.corrected)} className="p-2 bg-black/5 rounded-full hover:bg-black/10 shrink-0"><Volume2 size={20}/></button>
                        </div>
                    </div>

                    {writingResult.changes.length > 0 && (
                        <div className="mb-4 bg-white/50 p-4 rounded-xl">
                            <p className="opacity-60 text-xs font-black uppercase mb-2 tracking-widest">Melhorias</p>
                            <ul className="space-y-2">
                                {writingResult.changes.map((change, i) => (
                                    <li key={i} className="flex gap-2 items-start text-sm font-medium">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                        {change}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <p className="text-sm font-bold italic opacity-75 border-t pt-3 border-black/10">
                        "{writingResult.feedback}"
                    </p>
                </div>
            )}

            <VoiceButton 
                voiceLabel="Corrigir texto"
                variant="primary"
                disabled={!writingText.trim()}
                onClick={async () => {
                    if (!writingText.trim()) return;
                    speak("Verificando seu texto...");
                    setWritingResult(null); // Clear previous
                    const result = await checkWriting(writingText);
                    setWritingResult(result);
                    speak("Pronto. " + result.feedback);
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 border-purple-800 mb-6"
            >
                <Pencil className="mr-2" /> CORRIGIR
            </VoiceButton>
         </div>
      </div>
  );

  // --- VIEW: ASSISTANT ---
  const renderAssistant = () => {
      const handleSend = async () => {
          if (!chatInput.trim()) return;
          const userMsg = chatInput;
          setChatInput("");
          setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
          
          const loadingMsg = { role: 'model' as const, text: "Pensando..." };
          setChatHistory(prev => [...prev, loadingMsg]);

          const result = await askAssistant(userMsg);
          
          setChatHistory(prev => {
              const newHist = [...prev];
              newHist.pop(); // remove loading
              newHist.push({ role: 'model', text: result.text });
              return newHist;
          });
          speak(result.text);
      };

      return (
        <div className={`h-screen flex flex-col ${themeClass} ${fontClass} ${sizeClass}`}>
            <Header title="Assistente" onBack={() => navigateTo(AppView.HOME, "Menu inicial")} />
            
            <div className="flex-1 overflow-y-auto p-4 gap-4 flex flex-col">
                {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 opacity-50 text-center p-8">
                        <Bot size={64} className="mb-4" />
                        <p className="text-xl font-bold">Olá! Sou seu assistente.</p>
                        <p className="mt-2">Pode me perguntar qualquer coisa.</p>
                    </div>
                )}
                
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[85%] p-5 rounded-3xl text-lg font-medium leading-relaxed shadow-sm
                            ${msg.role === 'user' 
                                ? (settings.theme === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white rounded-tr-sm') 
                                : (settings.theme === 'contrast' ? 'bg-slate-800 text-white border border-yellow-400' : 'bg-white border-2 border-slate-100 rounded-tl-sm')
                            }
                        `}>
                            {msg.text}
                            {msg.role === 'model' && (
                                <button onClick={() => speak(msg.text)} className="ml-2 p-1 bg-black/5 rounded-full align-middle"><Volume2 size={16}/></button>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <div className={`p-4 border-t ${settings.theme === 'contrast' ? 'border-yellow-400 bg-black' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex gap-2 max-w-3xl mx-auto">
                    <VoiceButton 
                        voiceLabel="Microfone. Fale sua pergunta."
                        onClick={handleMicInput}
                        className={`
                            w-16 rounded-2xl transition-all shadow-md
                            ${isListening 
                                ? 'bg-red-500 animate-pulse shadow-red-300' 
                                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                            } 
                            text-white border-b-4 
                            ${isListening ? 'border-red-800' : 'border-rose-800'} 
                            active:border-b-0 active:translate-y-1
                        `}
                    >
                        {isListening ? <MicOff size={28} /> : <Mic size={28} />}
                    </VoiceButton>
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Digite sua pergunta..."
                        className={`flex-1 p-4 rounded-2xl outline-none border-2 font-bold ${settings.theme === 'contrast' ? 'bg-slate-900 border-yellow-400 text-white' : 'bg-white border-slate-200 focus:border-blue-400'}`}
                    />
                    <VoiceButton 
                        voiceLabel="Enviar mensagem" 
                        variant="primary" 
                        onClick={handleSend}
                        className="w-16 rounded-2xl"
                    >
                        <ArrowLeft className="rotate-[135deg]" strokeWidth={3} />
                    </VoiceButton>
                </div>
            </div>
        </div>
      );
  };

  // --- ROUTER ---
  const renderCurrentView = () => {
      switch (currentView) {
          case AppView.CAMERA: return renderCamera();
          case AppView.WRITING: return renderWriting();
          case AppView.ASSISTANT: return renderAssistant();
          case AppView.SETTINGS: return renderSettings();
          case AppView.GAMES: return renderGames();
          // If in game session but view is GAMES, we render session if activeLevel is set
          default: return activeLevel ? renderGameSession() : renderHome();
      }
  };

  // Override main render for games sub-view logic
  if (currentView === AppView.GAMES && activeLevel) {
      return renderGameSession();
  }

  return renderCurrentView();
}