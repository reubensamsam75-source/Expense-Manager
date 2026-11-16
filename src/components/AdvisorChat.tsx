/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Transaction, Budget, Goal } from '../types';
import { LucideIcon } from './LucideIcon';
import { motion, AnimatePresence } from 'motion/react';

interface AdvisorChatProps {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  chatHistory: ChatMessage[];
  onAddChatMessage: (message: ChatMessage) => void;
  onCloseChat?: () => void;
}

export const AdvisorChat: React.FC<AdvisorChatProps> = ({
  transactions,
  budgets,
  goals,
  chatHistory,
  onAddChatMessage,
  onCloseChat,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    "Am I overspending this month?",
    "How can I save $500 faster?",
    "Suggest budget optimizations",
    "Analyze my food spend trends"
  ];

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}-u`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    onAddChatMessage(userMsg);
    setInputText('');
    setIsTyping(true);

    try {
      // 2. Fetch AI reply
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatHistory,
          transactions,
          budgets,
          goals
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reach Decuples advisor');
      }

      const data = await response.json();
      
      const assistantMsg: ChatMessage = {
        id: `chat-${Date.now()}-a`,
        role: 'assistant',
        content: data.reply || "I encountered an issue analyzing that. Could you ask me in another way?",
        timestamp: new Date().toISOString()
      };
      onAddChatMessage(assistantMsg);
    } catch (err: any) {
      console.error(err);
      const assistantMsg: ChatMessage = {
        id: `chat-${Date.now()}-a`,
        role: 'assistant',
        content: "Decuples Wealth Advisor is currently taking a coffee break (no API connection). Make sure your GEMINI_API_KEY is active in your secrets tab to start conversing! You can still manage transactions locally.",
        timestamp: new Date().toISOString()
      };
      onAddChatMessage(assistantMsg);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputText);
  };

  // Simple formatter to parse basic markdown rules (bold, list bullets, paragraphs)
  const formatMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      
      // Check for bullet lists
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const content = trimmed.substring(2);
        return (
          <li key={idx} className="list-disc ml-4 my-1 text-slate-700 dark:text-slate-300">
            {renderInlineStyles(content)}
          </li>
        );
      }

      // Check for numbered lists
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="list-decimal ml-4 my-1 text-slate-700 dark:text-slate-300">
            {renderInlineStyles(numMatch[2])}
          </li>
        );
      }

      // Standard paragraph line
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="my-1.5 leading-relaxed text-slate-700 dark:text-slate-300">
          {renderInlineStyles(line)}
        </p>
      );
    });
  };

  // Parses **bold** elements
  const renderInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-white">
            {part.substring(2, part.length - 2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div id="advisor-chat-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 px-5 py-4 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-100 rounded-xl border border-indigo-500/30">
            <LucideIcon name="Brain" size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide flex items-center gap-1.5">
              <span>Decuples AI Coach</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-[10px] text-indigo-200">Certified Wealth Advisor Bot</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono bg-indigo-500/30 px-2 py-0.5 rounded-md text-indigo-100">
            In-Context AI
          </div>
          {onCloseChat && (
            <button
              type="button"
              onClick={onCloseChat}
              className="p-1 hover:bg-indigo-500 rounded-lg text-white/80 hover:text-white transition"
              title="Minimize chat"
            >
              <LucideIcon name="X" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full animate-bounce">
              <LucideIcon name="MessageSquare" size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Chat with Decuples Coach</p>
              <p className="text-xs text-slate-400 max-w-xs leading-normal">
                Ask Decuples questions about budgets, compound yields, asset allocation, and how to improve passive income.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {chatHistory.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-100 dark:border-slate-800 shadow-3xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        <LucideIcon name="Brain" size={10} />
                        <span>Decuples</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      {isUser ? <p className="leading-relaxed">{msg.content}</p> : formatMessageContent(msg.content)}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none p-3 border border-slate-100 dark:border-slate-800 flex items-center gap-1.5 shrink-0">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      {chatHistory.length === 0 && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1.5 shrink-0">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 text-[10px] rounded-full text-slate-600 dark:text-slate-300 transition-all font-medium"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
        <input
          id="chat-input-text"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask Decuples Coach a financial question..."
          className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
        />
        <button
          id="btn-send-chat"
          type="submit"
          disabled={!inputText.trim() || isTyping}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:cursor-not-allowed text-white rounded-xl transition shadow-3xs flex items-center justify-center shrink-0"
        >
          <LucideIcon name="Send" size={14} />
        </button>
      </form>
    </div>
  );
};
