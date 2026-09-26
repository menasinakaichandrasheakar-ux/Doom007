import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Download,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Layers,
  MessageSquare,
  FileText,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Zap,
  BrainCircuit,
  CornerDownRight
} from "lucide-react";
import { CampusDataState, VisitorProfile } from "../types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  model?: string;
  roleType?: string;
  isError?: boolean;
}

interface GeminiChatCommunicatorProps {
  campusData: CampusDataState;
  currentProfile: VisitorProfile | null;
  mode?: "embedded" | "floating";
  onClose?: () => void;
}

export type ChatRole = "counselor" | "communicator" | "mentor" | "analyst";
export type ModelOption = "gemini-3.8-flash" | "gemini-3.1-pro-preview" | "gemini-3.1-flash-lite" | "gemini-flash-latest";

const ROLE_INFO: Record<ChatRole, { title: string; subtitle: string; icon: any; color: string; badge: string }> = {
  counselor: {
    title: "Academic Advisor & Counselor",
    subtitle: "Empathetic guidance, risk mitigation, and personalized student action plans",
    icon: GraduationCap,
    color: "bg-emerald-600",
    badge: "Advisor AI",
  },
  communicator: {
    title: "Official Communications Officer",
    subtitle: "Parent attendance deficit letters, official circulars, SMS & administrative memos",
    icon: FileText,
    color: "bg-[#5e17eb]",
    badge: "Official Notices",
  },
  mentor: {
    title: "Peer Mentor & Course Tutor",
    subtitle: "Remedial revision schedules, subject explanations, and engineering study hacks",
    icon: BookOpen,
    color: "bg-blue-600",
    badge: "Course Mentor",
  },
  analyst: {
    title: "Campus Risk & Data Analyst",
    subtitle: "Multi-factor score breakdowns, institutional trends, and intervention prioritizing",
    icon: BrainCircuit,
    color: "bg-amber-600",
    badge: "Data Analyst",
  },
};

const PROMPT_SUGGESTIONS: { label: string; prompt: string; role: ChatRole; model?: ModelOption }[] = [
  {
    label: "Draft Parent Warning Letter (<75% Att.)",
    prompt: "Draft an official parent notification letter for a student with attendance below 75%. Include institutional policy, impact on exam eligibility, and a meeting request with the HOD.",
    role: "communicator",
    model: "gemini-3.8-flash"
  },
  {
    label: "2-Week Remedial Study Schedule",
    prompt: "Generate a structured, day-by-day 2-week remedial study schedule for a BCA-AI&DA student who failed the Internal Assessment in Data Structures (<40 marks).",
    role: "mentor",
    model: "gemini-3.1-pro-preview"
  },
  {
    label: "Counselor Check-in for High Risk Student",
    prompt: "Write a supportive, non-punitive counseling outreach message for a student identified as High Risk due to consecutive absences and negative sentiment feedback.",
    role: "counselor",
    model: "gemini-3.8-flash"
  },
  {
    label: "Explain Multi-Factor Risk Score",
    prompt: "Explain how our campus multi-factor risk index works (Attendance 35%, Marks 35%, Feedback Polarity 20%, Frequency 10%) and provide recommendations for intervention priorities.",
    role: "analyst",
    model: "gemini-3.1-pro-preview"
  },
  {
    label: "Urgent SMS Alert (Attendance Deficit)",
    prompt: "Write a concise 160-character SMS alert for students falling below the 75% attendance threshold with instruction to contact their department mentor immediately.",
    role: "communicator",
    model: "gemini-3.1-flash-lite"
  },
  {
    label: "Department Attendance Circular",
    prompt: "Draft an official campus-wide circular from the Principal/Dean on the strict enforcement of biometric/Present-Sir attendance monitoring for the upcoming semester.",
    role: "communicator",
    model: "gemini-3.8-flash"
  }
];

export default function GeminiChatCommunicator({
  campusData,
  currentProfile,
  mode = "embedded",
  onClose
}: GeminiChatCommunicatorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "msg-init",
        role: "assistant",
        text: `**Welcome to the Campus Communicator & AI Advisor.**\n\nI am connected to your live **Present Sir** database containing **${campusData.students.length} enrolled students**, attendance records, and risk assessments.\n\nHow can I assist you with student communications, official parent notices, counseling outreach, or remedial guidance today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: "gemini-3.8-flash",
        roleType: "counselor"
      }
    ];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [roleType, setRoleType] = useState<ChatRole>("counselor");
  const [selectedModel, setSelectedModel] = useState<ModelOption>("gemini-3.8-flash");
  const [includeCampusContext, setIncludeCampusContext] = useState(true);
  const [customInstruction, setCustomInstruction] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedStudentForPrompt, setSelectedStudentForPrompt] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || loading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Build messages payload for API (history)
      const payloadMessages = newMessages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          roleType,
          model: selectedModel,
          customInstruction,
          includeCampusContext,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to receive AI response.");
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        text: data.reply || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: data.model || selectedModel,
        roleType: data.roleType || roleType,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        text: `⚠️ **Communication Notice**: ${err.message || "The AI model is experiencing a temporary spike in demand. Please tap 'Retry' below to re-submit."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: selectedModel,
        roleType,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleRetryLastUserMessage = () => {
    // Find the last user message in the history
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && lastUserMsg.text) {
      // Remove any trailing error assistant message
      setMessages((prev) => prev.filter((m) => !m.isError));
      handleSendMessage(lastUserMsg.text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear this conversation history?")) {
      setMessages([
        {
          id: `msg-init-${Date.now()}`,
          role: "assistant",
          text: `**Conversation reset.**\n\nI am ready as the **${ROLE_INFO[roleType].title}**. How can I assist you with campus communications or student advisory?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          model: selectedModel,
          roleType,
        }
      ]);
    }
  };

  const handleExportTranscript = () => {
    const transcript = messages
      .map((m) => `[${m.timestamp}] ${m.role === "user" ? "YOU" : `AI (${m.roleType || roleType} - ${m.model || selectedModel})`}:\n${m.text}\n`)
      .join("\n---\n\n");
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PresentSir-Chat-Transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const insertStudentPrompt = (studentId: string) => {
    const st = campusData.students.find((s) => s.StudentID === studentId);
    if (!st) return;
    const att = campusData.attendance.find((a) => a.StudentID === studentId);
    const rsk = campusData.riskAnalysis.find((r) => r.StudentID === studentId);
    const mrk = campusData.marks.filter((m) => m.StudentID === studentId);

    const generatedPrompt = `Please draft a customized communication regarding student ${st.Name} (${st.StudentID}, ${st.Department}, Semester ${st.Semester}).
Current Metrics:
- Attendance: ${att?.AttendancePercentage || "N/A"}% (${att?.ClassesAttended || 0}/${att?.TotalClasses || 100} classes)
- Risk Level: ${rsk?.RiskLevel || "N/A"} (Score: ${rsk?.CalculatedScore || "N/A"})
- Course Marks: ${mrk.map((m) => `${m.Subject}: ${m.TotalMarks}/100`).join(", ") || "No records"}

Please formulate a specific intervention action plan and parent notification letter.`;

    setInput(generatedPrompt);
    setSelectedStudentForPrompt("");
  };

  const currentRoleConfig = ROLE_INFO[roleType];
  const RoleIcon = currentRoleConfig.icon;

  return (
    <div className={`flex flex-col bg-white border-[1.5px] border-[#1a1a1a] shadow-[4px_4px_0px_rgba(26,26,26,0.08)] ${mode === "floating" ? "h-[620px] max-h-[85vh] w-[95vw] sm:w-[480px] rounded-none fixed bottom-4 right-4 sm:right-6 z-50 flex flex-col" : "w-full min-h-[750px] flex-1"}`}>
      {/* Top Header */}
      <div className="bg-[#f8f7f4] border-b-[1.5px] border-[#1a1a1a] p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 ${currentRoleConfig.color} text-white flex items-center justify-center border border-[#1a1a1a] shrink-0 font-bold`}>
            <RoleIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-display headline-texture text-base sm:text-lg font-bold text-[#1a1a1a] truncate leading-tight">
                {currentRoleConfig.title}
              </h3>
            </div>
            <p className="font-mono text-[10px] text-[#1a1a1a]/60 truncate">
              {currentRoleConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 border border-[#1a1a1a] transition text-xs flex items-center gap-1 font-mono font-bold cursor-pointer ${showConfig ? "bg-[#1a1a1a] text-white" : "bg-white text-[#1a1a1a] hover:bg-[#1a1a1a]/10"}`}
            title="Configure Chatbot Roles, AI Models & Instructions"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Settings</span>
          </button>
          <button
            onClick={handleExportTranscript}
            className="p-1.5 border border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#1a1a1a]/10 transition text-xs font-mono font-bold cursor-pointer"
            title="Export conversation transcript"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClearHistory}
            className="p-1.5 border border-[#1a1a1a] bg-white text-rose-700 hover:bg-rose-50 transition text-xs font-mono font-bold cursor-pointer"
            title="Reset / Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {mode === "floating" && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 border border-[#1a1a1a] bg-[#1a1a1a] text-white hover:bg-rose-600 transition text-xs font-mono font-bold cursor-pointer"
              title="Close chat window"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Configuration Drawer */}
      {showConfig && (
        <div className="bg-[#f3f2ee] border-b-[1.5px] border-[#1a1a1a] p-3 sm:p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {/* Role Preset */}
            <div>
              <label className="font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 block mb-1">
                Assistant Role Persona
              </label>
              <select
                value={roleType}
                onChange={(e) => setRoleType(e.target.value as ChatRole)}
                className="w-full text-xs font-mono bg-white border border-[#1a1a1a] p-1.5 focus:outline-none focus:ring-1 focus:ring-[#5e17eb]"
              >
                <option value="counselor">🎓 Academic Advisor & Counselor</option>
                <option value="communicator">📢 Official Communications Officer</option>
                <option value="mentor">💡 Peer Mentor & Course Tutor</option>
                <option value="analyst">📊 Campus Risk & Data Analyst</option>
              </select>
            </div>

            {/* Live Campus Data Grounding */}
            <div>
              <label className="font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 block mb-1">
                Live Campus Grounding
              </label>
              <button
                type="button"
                onClick={() => setIncludeCampusContext(!includeCampusContext)}
                className={`w-full text-xs font-mono border border-[#1a1a1a] p-1.5 flex items-center justify-center gap-1.5 font-bold transition cursor-pointer ${includeCampusContext ? "bg-emerald-600 text-white" : "bg-white text-[#1a1a1a]"}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{includeCampusContext ? "Live DB Grounding Active" : "DB Grounding Off"}</span>
              </button>
            </div>
          </div>

          {/* Custom Instruction Box */}
          <div>
            <label className="font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/70 block mb-1">
              Custom Prompt Directive / Campus Policy Guideline (Optional)
            </label>
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g. Always reference University Circular 2024/75A and maintain parent contact protocol..."
              className="w-full text-xs font-mono bg-white border border-[#1a1a1a] p-1.5 focus:outline-none focus:ring-1 focus:ring-[#5e17eb]"
            />
          </div>
        </div>
      )}

      {/* Quick Student Selector Bar */}
      <div className="bg-[#f8f7f4] border-b border-[#1a1a1a]/15 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#1a1a1a]/70">
          <Zap className="w-3 h-3 text-[#5e17eb]" />
          <span>Quick Inject Student:</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedStudentForPrompt}
            onChange={(e) => {
              if (e.target.value) {
                insertStudentPrompt(e.target.value);
              }
            }}
            className="text-[11px] font-mono bg-white border border-[#1a1a1a]/30 px-2 py-0.5 rounded-none cursor-pointer"
          >
            <option value="">Select Enrolled Student...</option>
            {campusData.students.map((s) => (
              <option key={s.StudentID} value={s.StudentID}>
                {s.StudentID} — {s.Name} ({s.Department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Thread (Scrollable) */}
      <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-4 bg-[#ffffff]">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              {/* Speaker Metadata */}
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#1a1a1a]/60 mb-1 px-1">
                {isUser ? (
                  <>
                    <div className="flex items-center gap-1 font-bold">
                      <User className="w-3 h-3 text-[#1a1a1a]" />
                      <span>{currentProfile?.name || "You"}</span>
                    </div>
                    <span>&bull;</span>
                  </>
                ) : null}
                <span>{m.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[92%] sm:max-w-[85%] p-3.5 text-xs sm:text-sm leading-relaxed border-[1.5px] ${
                  isUser
                    ? "bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-[2px_2px_0px_rgba(94,23,235,0.3)]"
                    : "bg-[#f8f7f4] text-[#1a1a1a] border-[#1a1a1a] shadow-[2px_2px_0px_rgba(26,26,26,0.1)]"
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap font-sans">{m.text}</div>
                ) : (
                  <div className="markdown-content font-sans prose prose-sm max-w-none text-[#1a1a1a] space-y-2">
                    <Markdown>{m.text}</Markdown>
                  </div>
                )}

                {/* Assistant Message Actions */}
                {!isUser && (
                  <div className="mt-2.5 pt-2 border-t border-[#1a1a1a]/15 flex items-center justify-between gap-2 font-mono text-[10px]">
                    <span className="text-[#1a1a1a]/50">
                      {m.isError ? "Request Encountered Issue" : "Present Sir Intelligence"}
                    </span>
                    <div className="flex items-center gap-2">
                      {m.isError && (
                        <button
                          onClick={handleRetryLastUserMessage}
                          disabled={loading}
                          className="inline-flex items-center gap-1 bg-[#5e17eb] hover:bg-[#4d10c7] text-white px-2 py-0.5 border border-[#1a1a1a] shadow-[1px_1px_0px_rgba(26,26,26,1)] font-bold cursor-pointer disabled:opacity-50"
                          title="Retry last query"
                        >
                          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                          <span>Retry Query</span>
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(m.text, m.id)}
                        className="inline-flex items-center gap-1 text-[#5e17eb] hover:underline font-bold cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#5e17eb] mb-1 px-1">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>AI is generating response...</span>
            </div>
            <div className="p-3.5 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] shadow-sm flex items-center gap-2 text-xs font-mono text-[#1a1a1a]/70">
              <span className="w-2 h-2 rounded-full bg-[#5e17eb] animate-ping" />
              <span>Formulating campus intelligence and communication draft...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="bg-[#f8f7f4] border-t border-[#1a1a1a]/15 p-2 overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase font-bold text-[#1a1a1a]/50 shrink-0">
            Quick Prompts:
          </span>
          {PROMPT_SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setRoleType(s.role);
                if (s.model) setSelectedModel(s.model);
                handleSendMessage(s.prompt);
              }}
              className="px-2.5 py-1 bg-white border border-[#1a1a1a]/20 hover:border-[#1a1a1a] hover:bg-[#5e17eb] hover:text-white text-[#1a1a1a] text-[10px] font-mono transition shrink-0 cursor-pointer shadow-2xs"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box Footer */}
      <div className="p-3 bg-white border-t-[1.5px] border-[#1a1a1a]">
        <div className="relative flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${ROLE_INFO[roleType].title} or draft parent notices, warning letters, remedial plans... (Press Enter to send, Shift+Enter for newline)`}
            className="flex-1 resize-none text-xs sm:text-sm font-sans p-2.5 bg-[#f8f7f4] border-[1.5px] border-[#1a1a1a] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#5e17eb] placeholder:text-[#1a1a1a]/40"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || loading}
            className="h-[52px] px-4 sm:px-5 bg-[#5e17eb] hover:bg-[#4d10c7] disabled:bg-[#1a1a1a]/30 text-white font-mono text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0 border border-[#1a1a1a]"
            title="Send prompt to AI Advisor"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        <div className="flex items-center justify-between font-mono text-[9px] text-[#1a1a1a]/50 mt-1.5 px-0.5">
          <span>Active Role: <strong className="text-[#1a1a1a]">{ROLE_INFO[roleType].title}</strong></span>
        </div>
      </div>
    </div>
  );
}
