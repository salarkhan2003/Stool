import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  ChevronLeft, 
  Search, 
  Mic, 
  Phone, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  Check,
  Circle,
  MoreHorizontal,
  Edit2,
  Info,
  X,
  BookOpen,
  Zap,
  Target,
  Users,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, generateId } from './lib/utils';
import { useLocalStorage } from './hooks/useLocalStorage';
import { AppData, OutreachList, Thought, OutreachItem, OutreachStatus, SubTask } from './types';

// --- Components ---

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full bg-slate-900/50 rounded-full h-1.5 mt-2 inner-shadow overflow-hidden border border-white/5">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      className="bg-primary h-full rounded-full transition-all duration-700" 
    />
  </div>
);

const VoiceToText = ({ onTranscript }: { onTranscript: (text: string) => void }) => {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };

    recognition.start();
  };

  return (
    <button 
      onClick={startListening}
      className={cn(
        "p-3 rounded-xl transition-all clay-btn relative overflow-hidden group",
        isListening ? "bg-red-900/20 text-red-400" : "bg-slate-900/50 text-primary hover:text-primary-light border border-white/5"
      )}
    >
      <Mic size={18} className="relative z-10" />
    </button>
  );
};

const GenericModal = ({ 
  config, 
  onClose 
}: { 
  config: {
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
    type: 'input' | 'confirm';
  };
  onClose: () => void;
}) => {
  const [inputValue, setInputValue] = useState(config.defaultValue || '');

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-slate-900 w-full max-w-sm rounded-2xl p-8 shadow-2xl space-y-6 border border-white/10"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-50">{config.title}</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {config.message && (
          <p className="text-sm text-slate-400 leading-relaxed">{config.message}</p>
        )}

        {config.type === 'input' && (
          <input 
            autoFocus
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && config.onConfirm(inputValue)}
            placeholder={config.placeholder}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/40 transition-all text-slate-100 placeholder-slate-600 text-sm"
          />
        )}

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-slate-400 font-bold uppercase tracking-wider text-[10px] hover:bg-slate-800 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => config.onConfirm(config.type === 'input' ? inputValue : '')}
            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 clay-btn uppercase tracking-wider text-[10px]"
          >
            {config.type === 'input' ? 'Confirm' : 'Proceed'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [data, setData] = useLocalStorage<AppData>('stool_data', {
    thoughts: [],
    lists: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [thoughtInput, setThoughtInput] = useState('');
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [feedbackPrompt, setFeedbackPrompt] = useState<{ listId: string, itemId: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  // Simulated Async Save
  const saveData = async (newData: AppData | ((prev: AppData) => AppData)) => {
    setIsSaving(true);
    // Artificial delay to feel "techy" and async
    await new Promise(resolve => setTimeout(resolve, 400));
    setData(newData);
    setIsSaving(false);
  };

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
    type: 'input' | 'confirm';
  } | null>(null);

  const activeList = useMemo(() => data.lists.find(l => l.id === activeListId), [data.lists, activeListId]);

  // Ensure we don't get stuck in a broken detail view
  useEffect(() => {
    if (activeListId && !activeList) {
      setActiveListId(null);
    }
  }, [activeListId, activeList]);

  // --- Handlers ---

  const addThought = async () => {
    if (!thoughtInput.trim()) return;
    
    if (editingThoughtId) {
      await saveData(prev => ({
        ...prev,
        thoughts: prev.thoughts.map(t => t.id === editingThoughtId ? { ...t, content: thoughtInput } : t)
      }));
      setEditingThoughtId(null);
    } else {
      const newThought: Thought = {
        id: generateId(),
        content: thoughtInput,
        timestamp: new Date().toISOString(),
        was_i_right: null
      };
      await saveData(prev => ({ ...prev, thoughts: [newThought, ...prev.thoughts] }));
    }
    setThoughtInput('');
  };

  const deleteThought = (id: string) => {
    setModalConfig({
      type: 'confirm',
      title: 'Delete Thought',
      message: 'Are you sure you want to delete this ephemeral thought?',
      onConfirm: async () => {
        await saveData(prev => ({ ...prev, thoughts: prev.thoughts.filter(t => t.id !== id) }));
        setModalConfig(null);
      }
    });
  };

  const startEditThought = (thought: Thought) => {
    setThoughtInput(thought.content);
    setEditingThoughtId(thought.id);
  };

  const createList = () => {
    setModalConfig({
      type: 'input',
      title: 'New List',
      placeholder: 'e.g. Top 10 Colleges, Travel Bucket List',
      onConfirm: async (name) => {
        if (!name.trim()) return;
        const newList: OutreachList = {
          id: generateId(),
          name,
          createdAt: new Date().toISOString(),
          items: []
        };
        await saveData(prev => ({ ...prev, lists: [...prev.lists, newList] }));
        setModalConfig(null);
      }
    });
  };

  const deleteList = (id: string) => {
    setModalConfig({
      type: 'confirm',
      title: 'Delete List',
      message: 'This will permanently remove the list and all its items.',
      onConfirm: async () => {
        await saveData(prev => ({ ...prev, lists: prev.lists.filter(l => l.id !== id) }));
        setModalConfig(null);
      }
    });
  };

  const addItemToList = (listId: string) => {
    const list = data.lists.find(l => l.id === listId);
    if (list && list.items.length >= 10) {
      setModalConfig({
        type: 'confirm',
        title: 'Limit Reached',
        message: 'The Top 10 Engine is capped at 10 items to maintain focus.',
        onConfirm: () => setModalConfig(null)
      });
      return;
    }

    setModalConfig({
      type: 'input',
      title: 'Add Item',
      placeholder: 'Name of person or entity',
      onConfirm: async (title) => {
        if (!title.trim()) return;
        const newItem: OutreachItem = {
          id: generateId(),
          title,
          phone_numbers: [],
          emails: [],
          current_status: 'To Research',
          priority: 'Medium',
          category: 'General',
          notes: '',
          feedback_log: [],
          sub_tasks: []
        };

        await saveData(prev => ({
          ...prev,
          lists: prev.lists.map(l => l.id === listId ? { ...l, items: [...l.items, newItem] } : l)
        }));
        setModalConfig(null);
      }
    });
  };

  const updateItem = async (listId: string, itemId: string, updates: Partial<OutreachItem>) => {
    await saveData(prev => ({
      ...prev,
      lists: prev.lists.map(l => l.id === listId ? {
        ...l,
        items: l.items.map(i => {
          if (i.id === itemId) {
            if (updates.current_status === 'Contacted' && i.current_status !== 'Contacted') {
              setTimeout(() => setFeedbackPrompt({ listId, itemId }), 100);
            }
            return { ...i, ...updates };
          }
          return i;
        })
      } : l)
    }));
  };

  const addFeedback = async () => {
    if (!feedbackPrompt || !feedbackText.trim()) return;
    const { listId, itemId } = feedbackPrompt;
    
    await saveData(prev => ({
      ...prev,
      lists: prev.lists.map(l => l.id === listId ? {
        ...l,
        items: l.items.map(i => i.id === itemId ? {
          ...i,
          feedback_log: [feedbackText, ...i.feedback_log],
          current_status: 'Feedback Given' as OutreachStatus
        } : i)
      } : l)
    }));

    setFeedbackPrompt(null);
    setFeedbackText('');
  };

  const toggleSubTask = async (listId: string, itemId: string, taskId: string) => {
    await saveData(prev => ({
      ...prev,
      lists: prev.lists.map(l => l.id === listId ? {
        ...l,
        items: l.items.map(i => i.id === itemId ? {
          ...i,
          sub_tasks: i.sub_tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        } : i)
      } : l)
    }));
  };

  const addSubTask = (listId: string, itemId: string) => {
    setModalConfig({
      type: 'input',
      title: 'New Task',
      placeholder: 'e.g. Research website, Send intro email',
      onConfirm: async (text) => {
        if (!text.trim()) return;
        const newTask: SubTask = { id: generateId(), text, completed: false };
        await saveData(prev => ({
          ...prev,
          lists: prev.lists.map(l => l.id === listId ? {
            ...l,
            items: l.items.map(i => i.id === itemId ? { ...i, sub_tasks: [...i.sub_tasks, newTask] } : i)
          } : l)
        }));
        setModalConfig(null);
      }
    });
  };

  const clearAllData = () => {
    setModalConfig({
      type: 'confirm',
      title: 'Reset All Data',
      message: 'This will permanently delete all thoughts and lists. This action cannot be undone.',
      onConfirm: async () => {
        await saveData({ thoughts: [], lists: [] });
        setModalConfig(null);
        setShowAbout(false);
      }
    });
  };

  const deleteItem = (listId: string, itemId: string) => {
    setModalConfig({
      type: 'confirm',
      title: 'Delete Item',
      message: 'Remove this item from your Top 10 list?',
      onConfirm: async () => {
        await saveData(prev => ({
          ...prev,
          lists: prev.lists.map(l => l.id === listId ? {
            ...l,
            items: l.items.filter(i => i.id !== itemId)
          } : l)
        }));
        setModalConfig(null);
      }
    });
  };

  // --- Views ---

  return (
    <div className="min-h-screen bg-[#0b0f1a] font-sans text-slate-200 pb-10 selection:bg-primary/20 selection:text-primary-light">
      {/* Saving Indicator */}
      <AnimatePresence>
        {isSaving && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 right-6 z-[110] flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-lg"
          >
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Saving</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!activeListId ? (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-md mx-auto p-6 space-y-10"
          >
            <header className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                  <Target className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-50">Stool</h1>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Command Center</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAbout(true)}
                className="p-2.5 rounded-xl clay-btn bg-slate-900/50 text-slate-500 hover:text-primary transition-all border border-white/5"
              >
                <Info size={18} />
              </button>
            </header>

            {/* Immediate Capture */}
            <section className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Immediate Capture</h2>
                {editingThoughtId && (
                  <button 
                    onClick={() => { setEditingThoughtId(null); setThoughtInput(''); }}
                    className="text-[9px] font-bold text-red-400 uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Capture a thought..."
                  value={thoughtInput}
                  onChange={(e) => setThoughtInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addThought()}
                  className="w-full bg-slate-900/40 border border-white/5 rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:border-primary/40 transition-all shadow-sm text-base font-medium text-slate-100 placeholder-slate-600"
                />
                <button 
                  onClick={addThought}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2.5 rounded-xl hover:bg-primary-dark transition-all shadow-md clay-btn"
                >
                  {editingThoughtId ? <Check size={18} /> : <Plus size={18} />}
                </button>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {data.thoughts.map(thought => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={thought.id} 
                    className="glass p-4 rounded-2xl flex justify-between items-center group border border-white/5"
                  >
                    <div className="flex-1">
                      <p className="text-slate-300 font-medium text-sm leading-snug">{thought.content}</p>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">
                        {format(new Date(thought.timestamp), 'MMM d • HH:mm')}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEditThought(thought)}
                        className="p-2 text-slate-500 hover:text-primary transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteThought(thought.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Top 10 Engine */}
            <section className="space-y-6">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Top 10 Engine</h2>
                <button 
                  onClick={createList}
                  className="text-primary text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider hover:bg-primary/10 transition-all border border-primary/20"
                >
                  + New List
                </button>
              </div>

              <div className="grid gap-4">
                {data.lists.map(list => {
                  const progress = list.items.length > 0 
                    ? (list.items.filter(i => i.current_status === 'Finished').length / list.items.length) * 100 
                    : 0;
                  
                  return (
                    <motion.div 
                      whileHover={{ x: 4 }}
                      key={list.id}
                      onClick={() => setActiveListId(list.id)}
                      className="clay-card p-5 cursor-pointer group border border-white/5"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-slate-100 text-lg">{list.name}</h3>
                        <div className="text-[10px] font-bold text-slate-500 bg-slate-950/40 px-2.5 py-1 rounded-lg border border-white/5">
                          {list.items.length} / 10
                        </div>
                      </div>
                      <ProgressBar progress={progress} />
                      
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                          {format(new Date(list.createdAt), 'MMM d, yyyy')}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
                          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
                
                {data.lists.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                    <p className="text-slate-600 font-bold uppercase tracking-widest text-[9px]">No lists initialized.</p>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto min-h-screen flex flex-col"
          >
            <header className="bg-slate-950/40 backdrop-blur-md border-b border-white/5 p-6 sticky top-0 z-50">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setActiveListId(null)}
                  className="p-2 rounded-xl clay-btn bg-slate-900/50 text-slate-500 hover:text-primary transition-all border border-white/5"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-slate-50 truncate">{activeList?.name}</h1>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Pipeline Protocol</p>
                </div>
                <div className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                  {activeList?.items.length} / 10
                </div>
              </div>
              <ProgressBar progress={activeList ? (activeList.items.filter(i => i.current_status === 'Finished').length / activeList.items.length) * 100 : 0} />
            </header>

            <main className="flex-1 p-6 space-y-6 pb-32">
              <AnimatePresence>
                {activeList?.items.map((item, index) => (
                  <ItemAccordion 
                    key={item.id} 
                    item={item} 
                    index={index}
                    listId={activeList.id}
                    onUpdate={(updates) => updateItem(activeList.id, item.id, updates)}
                    onToggleTask={(taskId) => toggleSubTask(activeList.id, item.id, taskId)}
                    onAddTask={() => addSubTask(activeList.id, item.id)}
                    setModalConfig={setModalConfig}
                    onDelete={() => deleteItem(activeList.id, item.id)}
                  />
                ))}
              </AnimatePresence>

              {(activeList?.items.length || 0) < 10 && (
                <button 
                  onClick={() => addItemToList(activeList!.id)}
                  className="w-full py-6 border border-dashed border-slate-800 rounded-2xl text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-slate-900/20 hover:border-primary/20 hover:text-primary transition-all bg-slate-900/10"
                >
                  <Plus size={18} /> Add Item
                </button>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-slate-900 w-full max-w-md rounded-2xl p-10 shadow-2xl space-y-10 max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                    <BookOpen className="text-primary" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-50 tracking-tight">System Info</h3>
                </div>
                <button 
                  onClick={() => setShowAbout(false)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-10">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest">System Core</h4>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Stool is your <span className="text-slate-100 font-bold">Personal Life Command Center</span>. A professional interface designed to bridge the gap between intuition and structured execution.
                  </p>
                </section>

                <section className="space-y-6">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest">Operational Flow</h4>
                  
                  <div className="flex gap-5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-950/50 border border-white/5 text-primary flex items-center justify-center font-bold text-xs">01</div>
                    <div>
                      <h5 className="font-bold text-slate-100 text-sm mb-1">Immediate Capture</h5>
                      <p className="text-xs text-slate-500 leading-relaxed">Dump raw data, ideas, or hypotheses instantly. Zero-friction processing.</p>
                    </div>
                  </div>

                  <div className="flex gap-5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-950/50 border border-white/5 text-primary flex items-center justify-center font-bold text-xs">02</div>
                    <div>
                      <h5 className="font-bold text-slate-100 text-sm mb-1">Top 10 Engine</h5>
                      <p className="text-xs text-slate-500 leading-relaxed">Forced prioritization. Capped at 10 items to maintain cognitive focus.</p>
                    </div>
                  </div>

                  <div className="flex gap-5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-950/50 border border-white/5 text-primary flex items-center justify-center font-bold text-xs">03</div>
                    <div>
                      <h5 className="font-bold text-slate-100 text-sm mb-1">Pipeline Protocol</h5>
                      <p className="text-xs text-slate-500 leading-relaxed">Multi-state tracking. Move from research to finality with integrated feedback streams.</p>
                    </div>
                  </div>
                </section>

                <section className="pt-6 border-t border-white/5">
                  <button 
                    onClick={clearAllData}
                    className="w-full py-4 text-red-900/60 hover:text-red-400 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 hover:bg-red-900/5 rounded-xl border border-transparent hover:border-red-900/20"
                  >
                    <Trash2 size={16} /> Purge System Data
                  </button>
                </section>
              </div>

              <button 
                onClick={() => setShowAbout(false)}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-xl shadow-emerald-900/40 clay-btn uppercase tracking-widest text-[11px]"
              >
                Acknowledge
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Prompt Modal */}
      <AnimatePresence>
        {feedbackPrompt && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-slate-900 w-full max-w-sm rounded-2xl p-8 shadow-2xl space-y-6 border border-white/10"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-50">Stream Log</h3>
                <VoiceToText onTranscript={(text) => setFeedbackText(prev => prev + ' ' + text)} />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">Protocol updated to 'Contacted'. Initialize feedback stream entry?</p>
              <textarea 
                autoFocus
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Initialize log entry..."
                className="w-full h-32 bg-slate-950 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-primary/40 transition-all resize-none text-slate-100 placeholder-slate-700 text-sm font-medium"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setFeedbackPrompt(null)}
                  className="flex-1 py-3 text-slate-400 font-bold uppercase tracking-wider text-[10px] hover:bg-slate-800 rounded-xl transition-all"
                >
                  Bypass
                </button>
                <button 
                  onClick={addFeedback}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 clay-btn uppercase tracking-wider text-[10px]"
                >
                  Commit Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generic Input/Confirm Modal */}
      <AnimatePresence>
        {modalConfig && (
          <GenericModal 
            config={modalConfig} 
            onClose={() => setModalConfig(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Components ---

function ItemAccordion({ 
  item, 
  index, 
  listId,
  onUpdate, 
  onToggleTask,
  onAddTask,
  setModalConfig,
  onDelete
}: { 
  item: OutreachItem; 
  index: number;
  listId: string;
  onUpdate: (updates: Partial<OutreachItem>) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: () => void;
  setModalConfig: (config: any) => void;
  onDelete: () => void;
  key?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const statusColors: Record<OutreachStatus, string> = {
    'To Research': 'bg-slate-900/60 text-slate-500 border-slate-800',
    'Contacted': 'bg-blue-900/20 text-blue-400 border-blue-900/30',
    'Feedback Given': 'bg-amber-900/20 text-amber-400 border-amber-900/30',
    'Finished': 'bg-emerald-900/20 text-primary border-emerald-900/30'
  };

  const priorityColors: Record<string, string> = {
    'High': 'text-red-400',
    'Medium': 'text-amber-400',
    'Low': 'text-slate-500'
  };

  const nextStatus = (current: OutreachStatus): OutreachStatus => {
    const flow: OutreachStatus[] = ['To Research', 'Contacted', 'Feedback Given', 'Finished'];
    const idx = flow.indexOf(current);
    return flow[(idx + 1) % flow.length];
  };

  const handleCall = (num: string) => {
    window.location.href = `tel:${num}`;
    onUpdate({ lastCallTimestamp: new Date().toISOString() });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card border border-white/5"
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-900/20 transition-all"
      >
        <div className="w-8 h-8 bg-slate-950/40 text-slate-500 rounded-lg flex items-center justify-center font-bold text-xs border border-white/5 shadow-inner">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-bold text-slate-100 text-base truncate">{item.title}</h4>
            <span className={cn("text-[8px] font-bold uppercase tracking-widest", priorityColors[item.priority])}>
              {item.priority}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border", statusColors[item.current_status])}>
              {item.current_status}
            </span>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              {item.category}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onUpdate({ current_status: nextStatus(item.current_status) }); }}
            className="p-2 rounded-lg bg-slate-950/40 text-slate-600 hover:text-primary transition-all border border-white/5"
          >
            {item.current_status === 'Finished' ? <CheckCircle2 size={18} className="text-primary" /> : <Circle size={18} />}
          </button>
          <ChevronDown size={18} className={cn("text-slate-600 transition-transform duration-300", isOpen && "rotate-180")} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-slate-950/20"
          >
            <div className="p-6 space-y-8">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={() => setModalConfig({
                    title: 'Edit Title',
                    type: 'input',
                    defaultValue: item.title,
                    onConfirm: (val: string) => { onUpdate({ title: val }); setModalConfig(null); }
                  })}
                  className="flex-1 py-2.5 bg-slate-900/40 hover:bg-slate-900 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-all border border-white/5"
                >
                  Edit Title
                </button>
                <button 
                  onClick={onDelete}
                  className="px-4 py-2.5 bg-slate-900/40 hover:bg-red-900/20 rounded-xl text-slate-500 hover:text-red-400 transition-all border border-white/5"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact Information</h5>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setModalConfig({
                        type: 'input',
                        title: 'Add Phone',
                        placeholder: '+1 234 567 890',
                        onConfirm: (num) => {
                          if (num.trim()) onUpdate({ phone_numbers: [...(item.phone_numbers || []), num.trim()] });
                          setModalConfig(null);
                        }
                      })}
                      className="text-primary text-[9px] font-bold uppercase tracking-wider"
                    >
                      + Phone
                    </button>
                    <button 
                      onClick={() => setModalConfig({
                        type: 'input',
                        title: 'Add Email',
                        placeholder: 'email@example.com',
                        onConfirm: (email) => {
                          if (email.trim()) onUpdate({ emails: [...(item.emails || []), email.trim()] });
                          setModalConfig(null);
                        }
                      })}
                      className="text-primary text-[9px] font-bold uppercase tracking-wider"
                    >
                      + Email
                    </button>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  {item.phone_numbers?.map((num, i) => (
                    <div key={i} className="flex items-center gap-2 group/contact">
                      <button 
                        onClick={() => handleCall(num)}
                        className="flex-1 bg-slate-950/40 border border-white/5 py-3 px-4 rounded-xl flex items-center gap-3 text-sm text-slate-300 hover:bg-slate-900 transition-all"
                      >
                        <Phone size={14} className="text-primary/60" /> {num}
                      </button>
                      <button 
                        onClick={() => onUpdate({ phone_numbers: item.phone_numbers.filter((_, idx) => idx !== i) })}
                        className="p-3 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover/contact:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {item.emails?.map((email, i) => (
                    <div key={i} className="flex items-center gap-2 group/contact">
                      <a 
                        href={`mailto:${email}`}
                        className="flex-1 bg-slate-950/40 border border-white/5 py-3 px-4 rounded-xl flex items-center gap-3 text-sm text-slate-300 hover:bg-slate-900 transition-all"
                      >
                        <Mail size={14} className="text-blue-400/60" /> {email}
                      </a>
                      <button 
                        onClick={() => onUpdate({ emails: item.emails.filter((_, idx) => idx !== i) })}
                        className="p-3 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover/contact:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-1">Priority</label>
                  <div className="flex p-1 bg-slate-950/40 rounded-xl border border-white/5">
                    {(['Low', 'Medium', 'High'] as const).map(p => (
                      <button 
                        key={p}
                        onClick={() => onUpdate({ priority: p })}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all",
                          item.priority === p ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-600 hover:text-slate-400"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-1">Category</label>
                  <button 
                    onClick={() => setModalConfig({
                      type: 'input',
                      title: 'Set Category',
                      defaultValue: item.category,
                      onConfirm: (cat) => { onUpdate({ category: cat }); setModalConfig(null); }
                    })}
                    className="w-full bg-slate-950/40 border border-white/5 py-2.5 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-900 transition-all"
                  >
                    {item.category}
                  </button>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Checklist</h5>
                  <button onClick={onAddTask} className="text-primary text-[9px] font-bold uppercase tracking-wider">+ Task</button>
                </div>
                <div className="space-y-2">
                  {item.sub_tasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => onToggleTask(task.id)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/20 border border-white/5 cursor-pointer hover:bg-slate-950/40 transition-all group"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        task.completed ? "bg-primary border-primary text-white" : "border-slate-700 group-hover:border-primary/40"
                      )}>
                        {task.completed && <Check size={10} />}
                      </div>
                      <span className={cn("text-xs font-medium transition-all", task.completed ? "text-slate-600 line-through" : "text-slate-300")}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Feedback Stream</h5>
                <div className="space-y-2">
                  {item.feedback_log.map((f, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-950/40 border-l-2 border-primary/30 text-xs text-slate-400 leading-relaxed italic">
                      "{f}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
