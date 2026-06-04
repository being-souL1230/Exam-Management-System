import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "@/components/ui/status-dot";
import { useGetExam, useGetExamSessionQuestions, useGetExamSessionStatus, useStartExam, useSubmitExam } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Clock, ChevronLeft, ChevronRight, Save,
  AlertTriangle, Sparkles, Loader2, XCircle, BookOpen,
  ShieldAlert, Maximize, ShieldCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type AIFeedback = {
  feedback: string;
  wrongAnswers: { question: string; yourAnswer: string; correctAnswer: string; topic: string }[];
  wrongCount: number;
  totalAnswered: number;
};

type ExamSessionPageProps = { examId: string };
type SaveStatus = "idle" | "saving" | "saved" | "error";

const MAX_WARNINGS = 3;

export default function ExamSessionPage({ examId }: ExamSessionPageProps) {
  const parsedExamId = Number(examId);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [sessionReady, setSessionReady] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ marksObtained: number; totalMarks: number; percentage: number; grade: string } | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  const [showWrongAnswers, setShowWrongAnswers] = useState(false);

  // ── Anti-cheat state ─────────────────────────────────────────────────────
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const submittingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const antiCheatActive = useRef(false);
  const warningCountRef = useRef(0);
  const answersRef = useRef<Record<number, string>>({});

  // Keep answersRef in sync so closures always have the latest answers
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const { data: exam } = useGetExam(parsedExamId, {
    query: { queryKey: ["/api/exams", parsedExamId], enabled: parsedExamId > 0 },
  });
  const { data: sessionStatus } = useGetExamSessionStatus(parsedExamId, {
    query: { queryKey: ["/api/exam-sessions", parsedExamId, "status"], enabled: parsedExamId > 0 && sessionReady, retry: false },
  });
  const startExam = useStartExam();
  const submitExam = useSubmitExam();
  const { data: questions, isLoading } = useGetExamSessionQuestions(parsedExamId, {
    query: { queryKey: ["/api/exam-sessions", parsedExamId, "questions"], enabled: parsedExamId > 0 && sessionReady },
  });

  useEffect(() => {
    if (questions && questions.length > 0) {
      const mapped: Record<number, string> = {};
      for (const q of questions) mapped[q.id] = q.savedAnswer ?? "";
      setAnswers(mapped);
    }
  }, [questions]);

  useEffect(() => {
    if (!exam || !sessionStatus?.startTime) return;
    const startTime = new Date(sessionStatus.startTime).getTime();
    const durationMs = exam.duration * 60 * 1000;
    const update = () => {
      const left = Math.max(0, Math.floor((startTime + durationMs - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left === 0 && !submittingRef.current && !submitted) {
        submittingRef.current = true;
        void handleAutoSubmit();
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [exam, sessionStatus, submitted]);

  useEffect(() => {
    if (parsedExamId <= 0) return;
    startExam.mutate({ examId: parsedExamId }, {
      onSuccess: (data: any) => {
        if (data?.alreadySubmitted) {
          toast({ title: "Exam already submitted", description: "You have already submitted this exam." });
          setLocation("/dashboard");
          return;
        }
        setSessionReady(true);
      },
      onError: (err: any) => {
        const message =
          err?.data?.error ??
          err?.message ??
          "Unable to start exam.";
        toast({ title: "Cannot start exam", description: message, variant: "destructive" });
        setLocation("/dashboard");
      },
    });
  }, [parsedExamId]);

  const token = () => localStorage.getItem("exam_auth_token") ?? "";

  const batchSave = useCallback(async (currentAnswers: Record<number, string>) => {
    const payload = Object.entries(currentAnswers)
      .filter(([, v]) => v.trim().length > 0)
      .map(([k, v]) => ({ questionId: Number(k), answerText: v }));
    if (payload.length === 0) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/exam-sessions/${parsedExamId}/save-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ answers: payload }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  }, [parsedExamId]);

  useEffect(() => {
    if (!questions?.length || submitted) return;
    const id = setInterval(() => void batchSave(answers), 15_000);
    return () => clearInterval(id);
  }, [answers, questions, batchSave, submitted]);

  const selectAnswer = (questionId: number, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleAutoSubmit = async () => {
    antiCheatActive.current = false;
    await batchSave(answersRef.current);
    submitExam.mutate({ examId: parsedExamId }, {
      onSettled: () => {
        setSubmitted(true);
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        toast({ title: "Time up! Exam auto-submitted." });
        setLocation("/dashboard", { replace: true });
      },
    });
  };

  const fetchAIFeedback = async (examId: number) => {
    setAiFeedbackLoading(true);
    try {
      const tkn = localStorage.getItem("exam_auth_token") ?? "";
      const res = await fetch("/api/ai/exam-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkn}` },
        body: JSON.stringify({ examId }),
      });
      const data = await res.json() as AIFeedback;
      setAiFeedback(data);
    } catch {
      // feedback is optional
    } finally {
      setAiFeedbackLoading(false);
    }
  };

  const handleSubmitNow = async () => {
    setShowConfirm(false);
    antiCheatActive.current = false;
    await batchSave(answers);
    submitExam.mutate({ examId: parsedExamId }, {
      onSuccess: (data: any) => {
        setSubmitted(true);
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        if (data?.result) {
          setResult(data.result);
          void fetchAIFeedback(parsedExamId);
        }
      },
      onError: () => toast({ title: "Submit failed", variant: "destructive" }),
    });
  };

  // ── Anti-cheat: core incident handler ────────────────────────────────────
  const handleIncident = useCallback(async (type: string, description: string) => {
    if (!antiCheatActive.current || submittingRef.current) return;

    // Report to backend (non-blocking)
    fetch(`/api/exam-sessions/${parsedExamId}/log-incident`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ type, description }),
    }).catch(() => {});

    warningCountRef.current += 1;
    const newCount = warningCountRef.current;
    setWarningCount(newCount);
    setWarningMessage(description);

    if (newCount >= MAX_WARNINGS) {
      submittingRef.current = true;
      antiCheatActive.current = false;
      setShowWarningDialog(false);
      toast({
        title: "Exam auto-submitted",
        description: "Maximum integrity violations reached.",
        variant: "destructive",
      });
      await batchSave(answersRef.current);
      submitExam.mutate({ examId: parsedExamId }, {
        onSettled: () => {
          setSubmitted(true);
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
          setLocation("/dashboard");
        },
      });
    } else {
      setShowWarningDialog(true);
    }
  }, [parsedExamId, batchSave]);

  // ── Block browser back button during exam ────────────────────────────────
  useEffect(() => {
    if (!sessionReady || submitted) return;
    window.history.pushState(null, "", window.location.href);
    const handler = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [sessionReady, submitted]);

  // ── Anti-cheat: sync active flag ─────────────────────────────────────────
  useEffect(() => {
    antiCheatActive.current = sessionReady && !submitted;
  }, [sessionReady, submitted]);

  // ── Anti-cheat: request fullscreen on session start ───────────────────────
  useEffect(() => {
    if (!sessionReady || submitted) return;
    void document.documentElement.requestFullscreen()
      .then(() => setIsFullscreen(true))
      .catch(() => {});
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [sessionReady]);

  // ── Anti-cheat: detect fullscreen exit ────────────────────────────────────
  useEffect(() => {
    if (!sessionReady || submitted) return;
    const handler = () => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs && antiCheatActive.current && !submittingRef.current) {
        void handleIncident("fullscreen_exit", "Exited fullscreen during exam");
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [sessionReady, submitted, handleIncident]);

  // ── Anti-cheat: tab/window switch detection ───────────────────────────────
  useEffect(() => {
    if (!sessionReady || submitted) return;
    const handler = () => {
      if (document.hidden && antiCheatActive.current && !submittingRef.current) {
        void handleIncident("tab_switch", "Switched away from exam tab or minimized window");
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [sessionReady, submitted, handleIncident]);

  // ── Anti-cheat: keyboard shortcut blocking ────────────────────────────────
  useEffect(() => {
    if (!sessionReady || submitted) return;
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const blocked =
        (ctrl && ["c", "v", "a", "x", "u", "s", "p"].includes(e.key.toLowerCase())) ||
        (ctrl && e.shiftKey && ["i", "j", "c", "k"].includes(e.key.toLowerCase())) ||
        (e.altKey && e.key === "Tab") ||
        (ctrl && e.key === "Tab") ||
        (ctrl && e.key === "w") ||
        e.key === "F12";
      if (blocked) e.preventDefault();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sessionReady, submitted]);

  // ── Anti-cheat: copy / paste / right-click blocking ──────────────────────
  useEffect(() => {
    if (!sessionReady || submitted) return;
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("cut", prevent);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("cut", prevent);
    };
  }, [sessionReady, submitted]);

  // ── Derived values ────────────────────────────────────────────────────────
  const activeQuestion = useMemo(() => questions?.[activeIndex], [questions, activeIndex]);
  const answeredCount = useMemo(() => Object.values(answers).filter(v => v.trim().length > 0).length, [answers]);
  const totalQ = questions?.length ?? 0;
  const timerColor = remainingSeconds < 300 ? "text-destructive" : remainingSeconds < 600 ? "text-amber-500" : "text-foreground";

  // ── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    const pct = result.percentage;
    const gradeColor = pct >= 75 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-sky-600 dark:text-sky-400" : pct >= 33 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
    return (
      <div className="page-shell flex flex-col items-center gap-4 py-6">
        <Card className="border-border/70 w-full max-w-lg text-center">
          <CardHeader className="pb-2">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <CardTitle className="text-xl">Exam Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Score</p>
                <p className="text-xl font-bold">{result.marksObtained}/{result.totalMarks}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Grade</p>
                <p className={`text-xl font-bold ${gradeColor}`}>{result.grade}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Percentage</p>
                <p className={`text-xl font-bold ${gradeColor}`}>{result.percentage.toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Results saved. Official results will be published by your teacher.</p>
            <Button className="w-full" onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>

        <Card className="w-full max-w-lg border-primary/20 bg-gradient-to-br from-primary/5 via-background to-sky-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/12 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              AI Performance Feedback
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Powered by Groq</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiFeedbackLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                AI is analyzing your answers…
              </div>
            ) : aiFeedback ? (
              <>
                <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground">
                  {aiFeedback.feedback}
                </div>
                {aiFeedback.totalAnswered > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-300/40 bg-emerald-50/60 px-3 py-2 dark:border-emerald-800/30 dark:bg-emerald-950/20">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Correct</p>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          {aiFeedback.totalAnswered - aiFeedback.wrongCount}/{aiFeedback.totalAnswered}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-red-300/40 bg-red-50/60 px-3 py-2 dark:border-red-800/30 dark:bg-red-950/20">
                      <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Wrong</p>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">
                          {aiFeedback.wrongCount}/{aiFeedback.totalAnswered}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {aiFeedback.wrongAnswers.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowWrongAnswers(p => !p)}
                      className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {showWrongAnswers ? "Hide" : "Review"} wrong answers ({aiFeedback.wrongCount})
                    </button>
                    {showWrongAnswers && (
                      <div className="mt-2 space-y-2">
                        {aiFeedback.wrongAnswers.map((w, i) => (
                          <div key={i} className="rounded-lg border border-red-200/50 bg-red-50/40 p-3 text-xs dark:border-red-900/30 dark:bg-red-950/15">
                            <p className="font-semibold text-foreground leading-snug mb-1.5">{w.question}</p>
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                <XCircle className="h-3 w-3 shrink-0" />
                                Your answer: <span className="font-medium">{w.yourAnswer || "Not answered"}</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                Correct: <span className="font-medium">{w.correctAnswer}</span>
                              </span>
                              {w.topic && (
                                <span className="mt-0.5 text-[10px] text-muted-foreground">Topic: {w.topic}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-1">AI feedback could not be loaded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isLoading || !questions) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading exam session...</p>
        </div>
      </div>
    );
  }

  // ── Active exam UI ────────────────────────────────────────────────────────
  return (
    <div className="page-shell space-y-3">

      {/* Anti-cheat notice bar */}
      {sessionReady && !submitted && (
        <div className="space-y-1.5">
          <div className={cn(
            "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs",
            warningCount === 0
              ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400"
              : warningCount < MAX_WARNINGS - 1
              ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}>
            <span className="flex items-center gap-1.5 font-medium">
              {warningCount === 0
                ? <ShieldCheck className="h-3.5 w-3.5" />
                : <ShieldAlert className="h-3.5 w-3.5" />}
              {warningCount === 0
                ? "Anti-cheat active — stay in fullscreen and do not switch tabs"
                : `Warning ${warningCount}/${MAX_WARNINGS} — ${MAX_WARNINGS - warningCount} violation(s) remaining before auto-submit`}
            </span>
            {!isFullscreen && (
              <button
                className="underline underline-offset-2 opacity-80 hover:opacity-100"
                onClick={() => void document.documentElement.requestFullscreen().catch(() => {})}
              >
                Re-enter fullscreen
              </button>
            )}
          </div>
          {/* Security feature indicators */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground px-0.5">
            <span className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 font-medium">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Copy-paste disabled
            </span>
            <span className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 font-medium">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Questions randomized per student
            </span>
            <span className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 font-medium">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Right-click disabled
            </span>
          </div>
        </div>
      )}

      {/* Exam header */}
      <div className="page-header">
        <div className="min-w-0">
          <h2 className="page-title truncate">{exam?.examName ?? "Exam Session"}</h2>
          <p className="text-xs text-muted-foreground">{answeredCount}/{totalQ} answered</p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
          {saveStatus === "saved" && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Saved</span>}
          {saveStatus === "error" && <span className="text-xs text-destructive">Save failed</span>}
          <div className={cn("flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-sm font-semibold tabular-nums", timerColor)}>
            <Clock className="h-3.5 w-3.5" />
            {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Question grid + answer card */}
      <div className="grid gap-3 lg:grid-cols-4">
        <Card className="border-border/70 lg:col-span-1">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-5 gap-1 lg:grid-cols-4">
              {questions.map((q, idx) => {
                const answered = (answers[q.id] ?? "").trim().length > 0;
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveIndex(idx)}
                    className={cn(
                      "h-8 w-full rounded-md text-xs font-semibold transition-all",
                      idx === activeIndex
                        ? "bg-primary text-primary-foreground"
                        : answered
                        ? "bg-green-500/20 text-green-600 border border-green-500/40 dark:text-green-400"
                        : "border border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><StatusDot variant="green" size="sm" />Answered</span>
              <span className="flex items-center gap-1"><StatusDot variant="gray"  size="sm" />Skipped</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Q{activeIndex + 1} of {totalQ} · {activeQuestion?.marks ?? 1} mark</p>
                <CardTitle className="text-base font-semibold leading-snug">{activeQuestion?.questionText}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeQuestion?.options?.length ? (
              <div className="space-y-2">
                {activeQuestion.options.map((option: string, idx: number) => {
                  const selected = (answers[activeQuestion.id] ?? "") === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => selectAnswer(activeQuestion.id, option)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-sm text-left transition-all",
                        selected
                          ? "border-primary/60 bg-primary/10 text-foreground font-medium"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                      )}
                    >
                      <span className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border/60"
                      )}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                This question is missing MCQ options. Contact the exam administrator.
              </div>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={activeIndex === 0} onClick={() => setActiveIndex(i => i - 1)} className="h-8">
                  <ChevronLeft className="h-4 w-4" />Prev
                </Button>
                <Button size="sm" variant="outline" disabled={activeIndex === totalQ - 1} onClick={() => setActiveIndex(i => i + 1)} className="h-8">
                  Next<ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8" onClick={() => void batchSave(answers)}>
                  <Save className="h-3.5 w-3.5 mr-1" />Save
                </Button>
                <Button size="sm" variant="destructive" className="h-8" onClick={() => setShowConfirm(true)} disabled={submitExam.isPending}>
                  Submit Exam
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>You have answered <span className="font-semibold text-foreground">{answeredCount}</span> out of <span className="font-semibold text-foreground">{totalQ}</span> questions.</p>
            {answeredCount < totalQ && (
              <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {totalQ - answeredCount} question(s) unanswered. You cannot undo this.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={() => void handleSubmitNow()} disabled={submitExam.isPending}>
              {submitExam.isPending ? "Submitting…" : "Yes, Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anti-cheat warning dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={cn(
              "flex items-center gap-2",
              warningCount >= MAX_WARNINGS - 1 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
            )}>
              <ShieldAlert className="h-5 w-5" />
              Integrity Warning {warningCount} of {MAX_WARNINGS}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{warningMessage}</p>
            {warningCount >= MAX_WARNINGS - 1 ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive font-medium">
                This is your final warning. The next violation will automatically submit your exam.
              </p>
            ) : (
              <p className="text-muted-foreground">
                You have <span className="font-semibold text-foreground">{MAX_WARNINGS - warningCount}</span> warning(s) remaining before your exam is auto-submitted.
              </p>
            )}
            <p className="text-xs text-muted-foreground">All violations are logged and visible to your teacher.</p>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                setShowWarningDialog(false);
                void document.documentElement.requestFullscreen().catch(() => {});
              }}
            >
              <Maximize className="h-3.5 w-3.5 mr-1.5" />
              Return to Fullscreen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
