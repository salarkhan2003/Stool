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
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, generateId } from './lib/utils';
import { useLocalStorage } from './hooks/useLocalStorage';
import { AppData, OutreachList, Thought, OutreachItem, OutreachStatus, SubTask } from './types';

// --- Components ---

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full bg-slate-700 rounded-full h-2 mt-2 inner-shadow overflow-hidden">
    <div 
      className="bg-primary h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
      style={{ width: `${progress}%` }}
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
        "p-3 rounded-full transition-all clay-btn",
        isListening ? "bg-red-900/30 text-red-400 animate-pulse" : "bg-slate-800 text-primary hover:text-primary-dark"
      )}
    >
      <Mic size={20} />
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl space-y-6 border border-slate-800"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-slate-50">{config.title}</h3>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {config.message && (
          <p className="text-sm text-slate-400 font-medium leading-relaxed">{config.message}</p>
        )}

        {config.type === 'input' && (
          <input 
            autoFocus
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && config.onConfirm(inputValue)}
            placeholder={config.placeholder}
            className="w-full bg-slate-800 border-2 border-transparent rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/30 transition-all inner-shadow text-slate-100 placeholder-slate-600"
          />
        )}

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-800 rounded-2xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => config.onConfirm(config.type === 'input' ? inputValue : '')}
            className="flex-1 py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 clay-btn uppercase tracking-widest text-xs"
          >
            {config.type === 'input' ? 'Confirm' : 'Yes, Proceed'}
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

  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [thoughtInput, setThoughtInput] = useState('');
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [feedbackPrompt, setFeedbackPrompt] = useState<{ listId: string, itemId: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showAbout, setShowAbout] = useState(false);

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

  const addThought = () => {
    if (!thoughtInput.trim()) return;
    
    if (editingThoughtId) {
      setData(prev => ({
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
      setData(prev => ({ ...prev, thoughts: [newThought, ...prev.thoughts] }));
    }
    setThoughtInput('');
  };

  const deleteThought = (id: string) => {
    setModalConfig({
      type: 'confirm',
      title: 'Delete Thought',
      message: 'Are you sure you want to delete this ephemeral thought?',
      onConfirm: () => {
        setData(prev => ({ ...prev, thoughts: prev.thoughts.filter(t => t.id !== id) }));
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
      onConfirm: (name) => {
        if (!name.trim()) return;
        const newList: OutreachList = {
          id: generateId(),
          name,
          createdAt: new Date().toISOString(),
          items: []
        };
        setData(prev => ({ ...prev, lists: [...prev.lists, newList] }));
        setModalConfig(null);
      }
    });
  };

  const deleteList = (id: string) => {
    setModalConfig({
      type: 'confirm',
      title: 'Delete List',
      message: 'This will permanently remove the list and all its items.',
      onConfirm: () => {
        setData(prev => ({ ...prev, lists: prev.lists.filter(l => l.id !== id) }));
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
      onConfirm: (title) => {
        if (!title.trim()) return;
        const newItem: OutreachItem = {
          id: generateId(),
          title,
          phone_number: '',
          email: '',
          current_status: 'To Research',
          priority: 'Medium',
          category: 'General',
          notes: '',
          feedback_log: [],
          sub_tasks: []
        };

        setData(prev => ({
          ...prev,
          lists: prev.lists.map(l => l.id === listId ? { ...l, items: [...l.items, newItem] } : l)
        }));
        setModalConfig(null);
      }
    });
  };

  const updateItem = (listId: string, itemId: string, updates: Partial<OutreachItem>) => {
    setData(prev => ({
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

  const addFeedback = () => {
    if (!feedbackPrompt || !feedbackText.trim()) return;
    const { listId, itemId } = feedbackPrompt;
    
    setData(prev => ({
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

  const toggleSubTask = (listId: string, itemId: string, taskId: string) => {
    setData(prev => ({
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
      onConfirm: (text) => {
        if (!text.trim()) return;
        const newTask: SubTask = { id: generateId(), text, completed: false };
        setData(prev => ({
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
      onConfirm: () => {
        setData({ thoughts: [], lists: [] });
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
      onConfirm: () => {
        setData(prev => ({
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
    <div className="min-h-screen bg-[#0f172a] font-sans text-slate-100 pb-10">
      <AnimatePresence mode="wait">
        {!activeListId ? (
          <motion.div 
            key="home"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md mx-auto p-6 space-y-10"
          >
            <header className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                  <Target className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-50">Stool</h1>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-primary">Command Center</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAbout(true)}
                className="p-3 rounded-2xl clay-btn bg-slate-800 text-slate-400 hover:text-primary transition-all"
              >
                <Info size={20} />
              </button>
            </header>

            {/* Immediate Capture */}
            <section className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Immediate Capture</h2>
                {editingThoughtId && (
                  <button 
                    onClick={() => { setEditingThoughtId(null); setThoughtInput(''); }}
                    className="text-[10px] font-bold text-red-400 uppercase"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="What's on your mind?"
                  value={thoughtInput}
                  onChange={(e) => setThoughtInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addThought()}
                  className="w-full bg-slate-800/80 backdrop-blur-sm border-2 border-transparent rounded-3xl px-6 py-5 pr-16 focus:outline-none focus:border-primary/30 transition-all shadow-2xl inner-shadow text-lg font-medium text-slate-100 placeholder-slate-500"
                />
                <button 
                  onClick={addThought}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white p-3 rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-emerald-900/20 clay-btn"
                >
                  {editingThoughtId ? <Check size={20} /> : <Plus size={20} />}
                </button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {data.thoughts.map(thought => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={thought.id} 
                    className="glass p-4 rounded-2xl flex justify-between items-center group"
                  >
                    <div className="flex-1">
                      <p className="text-slate-200 font-medium">{thought.content}</p>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                        {format(new Date(thought.timestamp), 'MMM d • HH:mm')}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEditThought(thought)}
                        className="p-2 text-slate-500 hover:text-primary transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteThought(thought.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Top 10 Engine */}
            <section className="space-y-6">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Top 10 Engine</h2>
                <button 
                  onClick={createList}
                  className="bg-primary-soft text-primary text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider hover:bg-primary-light transition-colors"
                >
                  + New List
                </button>
              </div>

              <div className="grid gap-6">
                {data.lists.map(list => {
                  const progress = list.items.length > 0 
                    ? (list.items.filter(i => i.current_status === 'Finished').length / list.items.length) * 100 
                    : 0;
                  
                  return (
                    <motion.div 
                      whileHover={{ y: -5 }}
                      key={list.id}
                      onClick={() => setActiveListId(list.id)}
                      className="clay-card p-6 cursor-pointer relative group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-slate-50 text-xl">{list.name}</h3>
                        <span className="text-xs font-black text-primary bg-slate-900/50 px-3 py-1 rounded-full shadow-sm">
                          {list.items.length}/10
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                        Created {format(new Date(list.createdAt), 'MMM d, yyyy')}
                      </p>
                      <ProgressBar progress={progress} />
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
                        className="absolute top-6 right-16 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </motion.div>
                  );
                })}
                
                {data.lists.length === 0 && (
                  <div className="text-center py-16 border-4 border-dashed border-slate-800 rounded-[3rem] bg-slate-800/20">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No lists yet. Start your first Top 10!</p>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-md mx-auto min-h-screen flex flex-col"
          >
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-6 sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setActiveListId(null)}
                  className="p-3 rounded-2xl clay-btn bg-slate-800 text-slate-400 hover:text-primary transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-black text-slate-50 truncate">{activeList?.name}</h1>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Outreach Pipeline</p>
                </div>
                <div className="text-xs font-black text-primary bg-primary-soft px-3 py-1.5 rounded-xl">
                  {activeList?.items.length}/10
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
                  className="w-full py-6 border-4 border-dashed border-slate-800 rounded-[2.5rem] text-primary font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-slate-800/40 transition-all bg-slate-800/20"
                >
                  <Plus size={24} /> Add Item
                </button>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-slate-900 w-full max-w-md rounded-[3rem] p-8 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-800"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                    <BookOpen className="text-white" size={20} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-50">About Stool</h3>
                </div>
                <button 
                  onClick={() => setShowAbout(false)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <section className="space-y-3">
                  <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">What is it?</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Stool is your <span className="font-bold text-slate-200">Personal Life Command Center</span>. It's designed to bridge the gap between fleeting thoughts and structured action.
                  </p>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">How to use</h4>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-900 text-primary flex items-center justify-center font-black">1</div>
                    <div>
                      <h5 className="font-bold text-slate-200">Immediate Capture</h5>
                      <p className="text-sm text-slate-500">Dump thoughts, ideas, or guesses as they happen. Don't let them escape. Edit or delete them later as you process them.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-900 text-primary flex items-center justify-center font-black">2</div>
                    <div>
                      <h5 className="font-bold text-slate-200">The Top 10 Engine</h5>
                      <p className="text-sm text-slate-500">Focus is key. Create lists for your most important goals. Each list is capped at 10 items to prevent overwhelm.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-900 text-primary flex items-center justify-center font-black">3</div>
                    <div>
                      <h5 className="font-bold text-slate-200">Outreach Pipeline</h5>
                      <p className="text-sm text-slate-500">Track progress for each item. Use the status cycle to move from research to finished. Log feedback via voice or text after every contact.</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Why it helps</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
                      <Zap size={20} className="text-amber-500 mb-2" />
                      <h6 className="font-bold text-xs text-slate-200">Speed</h6>
                      <p className="text-[10px] text-slate-500">Zero friction entry for thoughts.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
                      <Target size={20} className="text-primary mb-2" />
                      <h6 className="font-bold text-xs text-slate-200">Focus</h6>
                      <p className="text-[10px] text-slate-500">Forced prioritization (Top 10).</p>
                    </div>
                  </div>
                </section>

                <section className="pt-4 border-t border-slate-800">
                  <button 
                    onClick={clearAllData}
                    className="w-full py-3 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-900/10 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> Clear All Application Data
                  </button>
                </section>
              </div>

              <button 
                onClick={() => setShowAbout(false)}
                className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 clay-btn uppercase tracking-widest text-sm"
              >
                Got it!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Prompt Modal */}
      <AnimatePresence>
        {feedbackPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl space-y-6 border border-slate-800"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-50">Log Feedback</h3>
                <VoiceToText onTranscript={(text) => setFeedbackText(prev => prev + ' ' + text)} />
              </div>
              <p className="text-sm text-slate-500 font-medium">You just contacted this item. What happened?</p>
              <textarea 
                autoFocus
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Enter notes or use voice..."
                className="w-full h-32 bg-slate-800 border-2 border-transparent rounded-3xl p-5 focus:outline-none focus:border-primary/30 transition-all resize-none inner-shadow font-medium text-slate-100 placeholder-slate-600"
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setFeedbackPrompt(null)}
                  className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  Skip
                </button>
                <button 
                  onClick={addFeedback}
                  className="flex-1 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-emerald-900/20 clay-btn uppercase tracking-widest text-xs"
                >
                  Save Note
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
    'To Research': 'bg-slate-800 text-slate-500',
    'Contacted': 'bg-blue-900/40 text-blue-400',
    'Feedback Given': 'bg-amber-900/40 text-amber-400',
    'Finished': 'bg-emerald-900/40 text-primary'
  };

  const priorityColors: Record<string, string> = {
    'High': 'text-red-400 bg-red-900/20',
    'Medium': 'text-amber-400 bg-amber-900/20',
    'Low': 'text-slate-400 bg-slate-900/20'
  };

  const nextStatus = (current: OutreachStatus): OutreachStatus => {
    const flow: OutreachStatus[] = ['To Research', 'Contacted', 'Feedback Given', 'Finished'];
    const idx = flow.indexOf(current);
    return flow[(idx + 1) % flow.length];
  };

  const handleCall = () => {
    if (!item.phone_number) {
      setModalConfig({
        type: 'input',
        title: 'Enter Phone',
        placeholder: '+1 234 567 890',
        onConfirm: (num) => {
          onUpdate({ phone_number: num });
          setModalConfig(null);
        }
      });
      return;
    }
    window.location.href = `tel:${item.phone_number}`;
    onUpdate({ lastCallTimestamp: new Date().toISOString() });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="bg-slate-800/50 rounded-[2rem] border border-white/5 shadow-sm overflow-hidden"
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-800/80 transition-colors"
      >
        <div className="w-10 h-10 bg-primary-soft text-primary rounded-2xl flex items-center justify-center font-black text-sm shadow-sm">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-black text-slate-50 truncate">{item.title}</h4>
            <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter", priorityColors[item.priority])}>
              {item.priority}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={cn("text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-[0.1em]", statusColors[item.current_status])}>
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
            className="p-2.5 rounded-xl bg-slate-900/50 text-slate-600 hover:text-primary transition-all clay-btn"
          >
            {item.current_status === 'Finished' ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} />}
          </button>
          {isOpen ? <ChevronUp size={20} className="text-slate-600" /> : <ChevronDown size={20} className="text-slate-600" />}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800 bg-slate-900/30 p-6 space-y-8"
          >
            {/* Quick Actions & Meta */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleCall}
                className="bg-slate-800 border border-slate-700 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs text-slate-200 hover:bg-slate-700 transition-all shadow-sm clay-btn uppercase tracking-widest"
              >
                <Phone size={18} className="text-primary" /> {item.phone_number || 'Add Phone'}
              </button>
              <button 
                onClick={() => {
                  setModalConfig({
                    type: 'input',
                    title: 'Update Email',
                    defaultValue: item.email,
                    placeholder: 'email@example.com',
                    onConfirm: (email) => {
                      onUpdate({ email });
                      setModalConfig(null);
                    }
                  });
                }}
                className="bg-slate-800 border border-slate-700 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs text-slate-200 hover:bg-slate-700 transition-all shadow-sm clay-btn uppercase tracking-widest"
              >
                <MessageSquare size={18} className="text-blue-400" /> {item.email ? 'Email' : 'Add Email'}
              </button>
            </div>

            {/* Priority & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Priority</label>
                <div className="flex gap-1">
                  {(['Low', 'Medium', 'High'] as const).map(p => (
                    <button 
                      key={p}
                      onClick={() => onUpdate({ priority: p })}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                        item.priority === p ? priorityColors[p] : "bg-slate-800 text-slate-600"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Category</label>
                <button 
                  onClick={() => {
                    setModalConfig({
                      type: 'input',
                      title: 'Set Category',
                      defaultValue: item.category,
                      placeholder: 'e.g. Work, Personal, Urgent',
                      onConfirm: (cat) => {
                        onUpdate({ category: cat });
                        setModalConfig(null);
                      }
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 py-2 rounded-xl text-[10px] font-black text-slate-300 uppercase"
                >
                  {item.category}
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">General Notes</label>
                <button 
                  onClick={() => {
                    setModalConfig({
                      type: 'input',
                      title: 'Edit Notes',
                      defaultValue: item.notes,
                      placeholder: 'Add more context here...',
                      onConfirm: (notes) => {
                        onUpdate({ notes });
                        setModalConfig(null);
                      }
                    });
                  }}
                  className="text-primary text-[10px] font-black uppercase"
                >
                  Edit
                </button>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 text-sm text-slate-400 min-h-[60px]">
                {item.notes || <span className="italic text-slate-600">No notes added yet...</span>}
              </div>
            </div>

            {/* Sub-tasks */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Checklist</h5>
                <button onClick={onAddTask} className="text-primary text-[10px] font-black uppercase tracking-wider">+ Add Task</button>
              </div>
              <div className="space-y-2">
                {item.sub_tasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => onToggleTask(task.id)}
                    className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-sm cursor-pointer hover:border-primary/20 transition-all"
                  >
                    {task.completed ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-slate-700" />}
                    <span className={cn("text-sm font-medium flex-1", task.completed ? "line-through text-slate-600" : "text-slate-200")}>
                      {task.text}
                    </span>
                  </div>
                ))}
                {item.sub_tasks.length === 0 && (
                  <p className="text-center text-[10px] font-bold text-slate-600 py-4 uppercase tracking-widest">No tasks yet</p>
                )}
              </div>
            </div>

            {/* Feedback Log */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Feedback Log</h5>
              <div className="space-y-3">
                {item.feedback_log.map((log, i) => (
                  <div key={i} className="glass p-4 rounded-2xl text-sm text-slate-300 font-medium border-emerald-900/20">
                    {log}
                  </div>
                ))}
                {item.feedback_log.length === 0 && (
                  <p className="text-center text-[10px] font-bold text-slate-600 py-4 uppercase tracking-widest">No feedback logged</p>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-slate-800">
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="w-full py-3 text-red-900/60 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Delete Item
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
