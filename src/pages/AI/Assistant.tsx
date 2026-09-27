import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUp, Bot, Sparkles, UserRound } from "lucide-react";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { performanceRequest } from "../../lib/performanceApi";
import "../Employees/performance.css";

interface ChatMessage { role: "assistant" | "user"; text: string; source?: string; }
const suggestedQuestions = [
  "What can you do?",
  "Give me a summary of employee performance.",
  "Who are the top performing employees?",
  "Which department has the highest average performance?",
  "Which employees have declining performance?",
  "What is the average attendance?",
];

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || sending) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setInput(""); setSending(true); setError("");
    try {
      const answer = await performanceRequest<{ reply: string; source: string }>("/ai/chat", { method: "POST", body: JSON.stringify({ message: text }) });
      setMessages((current) => [...current, { role: "assistant", text: answer.reply, source: answer.source }]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "The assistant could not answer right now.";
      setError(message);
      setMessages((current) => [...current, { role: "assistant", text: `I couldn’t access the performance data. ${message}`, source: "error" }]);
    } finally { setSending(false); }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void ask(input); };

  return <PerformanceLayout>
    <div className="performance-page-header"><div><span className="performance-eyebrow">WORKSPHERE AI</span><h1>AI Assistant</h1><p>Ask questions about employee performance, trends, and team metrics.</p></div></div>
    <section className="performance-panel assistant-shell">
      <div className="assistant-heading"><span className="assistant-brand-icon"><Sparkles size={19} /></span><div><strong>WorkSphere AI Assistant</strong><small>Grounded in your current employee performance data</small></div><span className="assistant-online"><i /> Ready</span></div>
      <div className="assistant-history" ref={historyRef}>
        {!messages.length && <div className="assistant-welcome"><span className="assistant-welcome-icon"><Bot size={27} /></span><h2>What would you like to understand?</h2><p>Ask a question about performance, attendance, productivity or department trends.</p><div className="assistant-suggestions">{suggestedQuestions.map((question) => <button type="button" key={question} onClick={() => void ask(question)}>{question}</button>)}</div></div>}
        {messages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><span className="assistant-message-avatar">{message.role === "user" ? <UserRound size={16} /> : <Bot size={17} />}</span><div className="assistant-message-content"><div className="assistant-message-label">{message.role === "user" ? "You" : "WorkSphere AI"}{message.source && message.role === "assistant" && <span>{message.source === "openai" ? "AI response" : message.source === "local" ? "Data-based response" : ""}</span>}</div><p>{message.text}</p></div></div>)}
        {sending && <div className="assistant-message assistant"><span className="assistant-message-avatar"><Bot size={17} /></span><div className="assistant-message-content"><div className="assistant-message-label">WorkSphere AI</div><p className="assistant-typing">Reviewing the performance data…</p></div></div>}
      </div>
      {error && <div className="performance-alert error assistant-error">{error}</div>}
      <form className="assistant-composer" onSubmit={submit}><textarea aria-label="Ask WorkSphere AI" rows={2} maxLength={1500} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question about your employee data…" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(input); } }} /><button type="submit" disabled={!input.trim() || sending} aria-label="Send question"><ArrowUp size={19} /></button></form>
      <p className="assistant-disclaimer">AI summaries are decision-support only. Verify context with employees before acting on a performance signal.</p>
    </section>
  </PerformanceLayout>;
}
