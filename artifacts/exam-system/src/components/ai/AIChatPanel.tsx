import { useState, useRef, useEffect } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import "./ai-chat-panel.css";
import { MarkdownMessage } from "./MarkdownMessage";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHIPS_ADMIN_TEACHER = [
  "List all students",
  "Who switched tabs?",
  "Show student results",
  "Student emails & roll numbers",
  "Tab switch report",
  "How many exams are scheduled?",
];

const CHIPS_STUDENT = [
  "My upcoming exams",
  "How many exams are there?",
  "Show subject summary",
  "What subjects are tested?",
];

function GenerateButton({
  loading,
  disabled,
  onClick,
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="aip-gen-wrapper">
      <button
        className={`aip-gen-btn${loading ? " is-loading" : ""}`}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <svg
          className="aip-gen-btn-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>

        <div className="aip-gen-txt-wrapper">
          <div className="aip-gen-txt-1">
            {"Generate".split("").map((ch, i) => (
              <span key={i} className="aip-gen-letter">{ch}</span>
            ))}
          </div>
          <div className="aip-gen-txt-2">
            {"Generating".split("").map((ch, i) => (
              <span key={i} className="aip-gen-letter">{ch}</span>
            ))}
          </div>
        </div>
      </button>
    </div>
  );
}

export function AIChatPanel() {
  const { user } = useAuth();
  const role = user?.role ?? "student";
  const chips = role === "admin" || role === "teacher" ? CHIPS_ADMIN_TEACHER : CHIPS_STUDENT;

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ask me academic questions about exams, schedules, subjects, question banks, attendance, course summaries, or published result trends.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  async function sendMessage(text?: string) {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: question }]);

    try {
      const token = localStorage.getItem("exam_auth_token");
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: question }),
      });
      const data = (await response.json()) as { reply?: string };
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply || "I could not prepare an answer right now.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "AI chat is unavailable right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="aip-shell">
      {/* Header */}
      <div className="aip-header">
        <div className="aip-orb">
          <Sparkles />
        </div>
        <div>
          <h3 className="aip-title">Academic AI Assistant</h3>
          <p className="aip-subtitle">Powered by Groq</p>
        </div>
        <div className="aip-badge">
          <ShieldCheck />
          Private data blocked
        </div>
      </div>

      {/* Messages */}
      <div className="aip-messages">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`aip-msg-row aip-msg-row--${message.role}`}
          >
            <div className={`aip-bubble aip-bubble--${message.role}`}>
              {message.role === "assistant" ? (
                <MarkdownMessage content={message.content} />
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="aip-msg-row aip-msg-row--ai">
            <div className="aip-bubble aip-bubble--ai aip-bubble--typing">
              <span className="aip-dot" />
              <span className="aip-dot" />
              <span className="aip-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      <div className="aip-chips">
        {chips.map((chip) => (
          <button
            key={chip}
            className="aip-chip"
            disabled={loading}
            onClick={() => sendMessage(chip)}
            type="button"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="aip-input-bar">
        <textarea
          ref={textareaRef}
          className="aip-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Ask about exams, results, attendance, subjects..."
          rows={1}
        />
        <GenerateButton
          loading={loading}
          disabled={loading || !input.trim()}
          onClick={() => void sendMessage()}
        />
      </div>
    </section>
  );
}
