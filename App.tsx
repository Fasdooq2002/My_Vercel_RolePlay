import React, { useState, useEffect, useRef } from 'react';
import { Settings, Upload, Menu, X, Trash2, Edit2, MessageSquare, Loader2, Check, AlertCircle, Sparkles, RefreshCw, Download, Plus, Search, Filter, User, Heart, Clock, TrendingUp } from 'lucide-react';
import { INITIAL_SETTINGS, MOCK_CHARACTERS } from './constants';
import { Character, AppSettings, ChatSession, Message } from './types';
import { generateResponse, summarizeChat } from './services/apiService';
import { SettingsModal } from './components/SettingsModal';
import { CharacterModal } from './components/CharacterModal';
import { Button } from './components/Button';
import { FloatingImageViewer } from './components/FloatingImageViewer';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer = ({ toasts }: { toasts: Toast[] }) => {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="animate-slide-up-fade bg-[#0a0a0a] border border-zinc-800 text-zinc-200 px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-2 text-xs"
        >
          {toast.type === 'success' && <Check size={14} className="text-emerald-500" />}
          {toast.type === 'error' && <AlertCircle size={14} className="text-red-500" />}
          {toast.type === 'info' && <Sparkles size={14} className="text-orange-500" />}
          {toast.message}
        </div>
      ))}
    </div>
  );
};

const renderFormattedContent = (content: string, settings: AppSettings) => {
    const parts = content.split(/(\*[^*]+\*|"[^"]+"|"[^"]+"|«[^»]+»)/g);
    return parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*')) {
            return (
                <span key={index} style={{ color: settings.thoughtColor }} className="italic">
                    {part}
                </span>
            );
        } else if (part.startsWith('"') || part.startsWith('"') || part.startsWith('«')) {
            return (
                <span key={index} style={{ color: settings.dialogueColor }}>
                    {part}
                </span>
            );
        }
        return <span key={index}>{part}</span>;
    });
};

interface CharacterCardProps {
  character: Character;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onSelect, onEdit, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="group relative bg-zinc-900/60 rounded-xl overflow-hidden border border-zinc-800/50 hover:border-orange-500/30 transition-all duration-300 hover:shadow-glow cursor-pointer">
      <div onClick={onSelect} className="relative">
        <div className="aspect-[3/4] overflow-hidden bg-zinc-950">
          <img
            src={character.avatarUrl || 'https://via.placeholder.com/300x400/1a1a1a/666'}
            alt={character.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-serif font-bold text-lg text-white mb-1 line-clamp-1">
            {character.name}
          </h3>
          <p className="text-xs text-orange-400/90 mb-2 line-clamp-1 font-medium">
            {character.tagline}
          </p>
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {character.description}
          </p>
        </div>
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
            className="p-1.5 bg-black/70 hover:bg-black/90 rounded-lg backdrop-blur-sm border border-zinc-700/50"
          >
            <Menu size={14} className="text-zinc-400" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[120px] z-50">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-zinc-800 flex items-center gap-2"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('erebos_settings');
    return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
  });

  const [characters, setCharacters] = useState<Character[]>(() => {
    const saved = localStorage.getItem('erebos_characters');
    return saved ? JSON.parse(saved) : MOCK_CHARACTERS;
  });

  const [sessions, setSessions] = useState<Record<string, ChatSession>>(() => {
    const saved = localStorage.getItem('erebos_sessions');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem('erebos_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('erebos_characters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('erebos_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (view === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessions, activeSessionId, view]);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleSelectCharacter = (charId: string) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;

    setActiveCharId(charId);

    const existingSessionId = Object.keys(sessions).find(
      sid => sessions[sid].characterId === charId
    );

    if (existingSessionId) {
      setActiveSessionId(existingSessionId);
    } else {
      const newSession: ChatSession = {
        id: generateId(),
        characterId: charId,
        name: `Chat with ${char.name}`,
        messages: [{
          id: generateId(),
          role: 'model',
          content: char.firstMessage,
          timestamp: Date.now()
        }],
        summary: '',
        lastUpdated: Date.now()
      };
      setSessions(prev => ({ ...prev, [newSession.id]: newSession }));
      setActiveSessionId(newSession.id);
    }

    setView('chat');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeSessionId || !activeCharId) return;
    if (isGenerating) return;

    const session = sessions[activeSessionId];
    const character = characters.find(c => c.id === activeCharId);
    if (!session || !character) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now()
    };

    setSessions(prev => ({
      ...prev,
      [activeSessionId]: {
        ...session,
        messages: [...session.messages, userMsg],
        lastUpdated: Date.now()
      }
    }));

    setInputMessage('');
    setIsGenerating(true);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const history = [...session.messages, userMsg];
      const stream = generateResponse(history, character, settings, session.summary || '', controller.signal);

      let fullResponse = '';
      const aiMsgId = generateId();

      for await (const chunk of stream) {
        fullResponse += chunk;
        setSessions(prev => {
          const currentSession = prev[activeSessionId];
          const lastMsg = currentSession.messages[currentSession.messages.length - 1];

          if (lastMsg && lastMsg.id === aiMsgId) {
            return {
              ...prev,
              [activeSessionId]: {
                ...currentSession,
                messages: currentSession.messages.map(m =>
                  m.id === aiMsgId ? { ...m, content: fullResponse } : m
                )
              }
            };
          } else {
            return {
              ...prev,
              [activeSessionId]: {
                ...currentSession,
                messages: [
                  ...currentSession.messages,
                  {
                    id: aiMsgId,
                    role: 'model',
                    content: fullResponse,
                    timestamp: Date.now()
                  }
                ]
              }
            };
          }
        });
      }

      const updatedHistory = [...history, { id: aiMsgId, role: 'model' as const, content: fullResponse, timestamp: Date.now() }];

      if (updatedHistory.length > 20) {
        try {
          const summary = await summarizeChat(updatedHistory.slice(0, -10), settings, session.summary);
          if (summary) {
            setSessions(prev => ({
              ...prev,
              [activeSessionId]: {
                ...prev[activeSessionId],
                summary: summary
              }
            }));
          }
        } catch (err) {
          console.error('Summarization failed:', err);
        }
      }

      showToast('Response generated', 'success');
    } catch (error: any) {
      if (error.message !== 'Aborted') {
        console.error('Generation error:', error);
        showToast('Generation failed: ' + error.message, 'error');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleDeleteCharacter = (charId: string) => {
    if (confirm('Delete this character and all associated chats?')) {
      setCharacters(prev => prev.filter(c => c.id !== charId));

      const relatedSessions = Object.keys(sessions).filter(
        sid => sessions[sid].characterId === charId
      );

      setSessions(prev => {
        const newSessions = { ...prev };
        relatedSessions.forEach(sid => delete newSessions[sid]);
        return newSessions;
      });

      if (activeCharId === charId) {
        setActiveCharId(null);
        setActiveSessionId(null);
        setView('home');
      }

      showToast('Character deleted', 'success');
    }
  };

  const filteredCharacters = characters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         char.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         char.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const currentCharacter = activeCharId ? characters.find(c => c.id === activeCharId) : null;
  const currentSession = activeSessionId ? sessions[activeSessionId] : null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#030303]">
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
      `}</style>

      {view === 'home' ? (
        <>
          <div className="relative z-10 border-b border-zinc-800/50 bg-zinc-950/40 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">E</span>
                  </div>
                  <h1 className="font-serif text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
                    EREBOS
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCharModalOpen(true)}
                    className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-orange-500 hover:border-orange-500/50 transition-all"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-orange-500 hover:border-orange-500/50 transition-all"
                  >
                    <Settings size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="mb-8 text-center">
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">
                  Be anyone. Build anything.
                </h2>
                <p className="text-zinc-400 text-sm">
                  Join {characters.length}+ characters crafting living stories
                </p>
              </div>

              <div className="mb-6">
                <div className="relative max-w-2xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/60 border border-zinc-800/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
                <TrendingUp size={14} />
                <span>Trending shows popular characters with the most chats</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredCharacters.map(char => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    onSelect={() => handleSelectCharacter(char.id)}
                    onEdit={() => { setEditingChar(char); setIsCharModalOpen(true); }}
                    onDelete={() => handleDeleteCharacter(char.id)}
                  />
                ))}
              </div>

              {filteredCharacters.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-zinc-500 mb-4">No characters found</p>
                  <Button onClick={() => setIsCharModalOpen(true)}>
                    Create New Character
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : view === 'chat' && currentCharacter && currentSession ? (
        <>
          <div className="relative z-10 border-b border-zinc-800/50 bg-zinc-950/40 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setView('home')}
                className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-orange-500 transition-all"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                <img
                  src={currentCharacter.avatarUrl || 'https://via.placeholder.com/40'}
                  alt={currentCharacter.name}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                />
                <div>
                  <h3 className="font-serif font-bold text-sm text-white">
                    {currentCharacter.name}
                  </h3>
                  <p className="text-xs text-zinc-500">{currentCharacter.tagline}</p>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-orange-500 transition-all"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {currentSession.messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <img
                      src={currentCharacter.avatarUrl || 'https://via.placeholder.com/40'}
                      alt={currentCharacter.name}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                    />
                  )}

                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-orange-600/20 border border-orange-500/30 text-zinc-200'
                        : 'bg-zinc-900/60 border border-zinc-800/50 text-zinc-300'
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {renderFormattedContent(msg.content, settings)}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <img
                      src={settings.userAvatarUrl || 'https://via.placeholder.com/40/333/fff?text=U'}
                      alt={settings.userName}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                    />
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-zinc-800/50 bg-zinc-950/40 backdrop-blur-md p-4">
            <div className="max-w-4xl mx-auto flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                disabled={isGenerating}
                className="flex-1 px-4 py-3 bg-zinc-900/60 border border-zinc-800/50 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 resize-none transition-all disabled:opacity-50"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={isGenerating || !inputMessage.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-medium hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <MessageSquare size={18} />
                )}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => {
            setSettings(newSettings);
            showToast('Settings saved', 'success');
          }}
        />
      )}

      {isCharModalOpen && (
        <CharacterModal
          isOpen={isCharModalOpen}
          character={editingChar}
          settings={settings}
          onClose={() => {
            setIsCharModalOpen(false);
            setEditingChar(null);
          }}
          onSave={(char) => {
            if (editingChar) {
              setCharacters(prev => prev.map(c => c.id === char.id ? char : c));
              showToast('Character updated', 'success');
            } else {
              setCharacters(prev => [...prev, char]);
              showToast('Character created', 'success');
            }
            setIsCharModalOpen(false);
            setEditingChar(null);
          }}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
};

export default App;
