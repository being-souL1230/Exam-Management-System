import { useMemo, useState } from "react";
import { useCreateQuestion, useDeleteQuestion, useListQuestions, useUpdateQuestion } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, FileUp, Pencil, Sparkles, Trash2, X, Plus, CheckCheck, Loader2 } from "lucide-react";

type EditableQuestion = {
  id: number;
  questionText: string;
  questionType: "mcq";
  subject: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  options: string[] | null;
  correctAnswer: string | null;
  marks: number;
};

type AIQuestion = {
  questionText: string;
  questionType: "mcq";
  subject: string;
  topic: string;
  difficulty: string;
  options: string[];
  correctAnswer: string;
  marks: number;
  added?: boolean;
};

export default function QuestionsPage() {
  const { toast } = useToast();
  const [subjectFilter, setSubjectFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [importCsv, setImportCsv] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [createStep, setCreateStep] = useState<"basic" | "details" | "finalize">("basic");

  // AI Generator state
  const [aiForm, setAiForm] = useState({
    subject: "",
    topic: "",
    difficulty: "medium",
    count: "5",
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  const params = useMemo(
    () => ({
      subject: subjectFilter || undefined,
      difficulty: difficultyFilter === "all" ? undefined : (difficultyFilter as "easy" | "medium" | "hard"),
      page: 1,
      limit: 100,
    }),
    [subjectFilter, difficultyFilter],
  );

  const { data, refetch, isLoading } = useListQuestions(params);
  const createQuestion = useCreateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const updateQuestion = useUpdateQuestion();
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    questionText: "",
    subject: "",
    topic: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
    options: "",
    correctAnswer: "",
    marks: "1",
  });

  const [form, setForm] = useState({
    questionText: "",
    subject: "",
    topic: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
    options: "",
    correctAnswer: "",
    marks: "",
  });

  const canGoDetails = form.questionText.trim().length > 0;
  const canGoFinalize =
    form.subject.trim().length > 0 &&
    form.topic.trim().length > 0 &&
    form.options.trim().length > 0 &&
    form.correctAnswer.trim().length > 0;
  const canSubmit = canGoDetails && canGoFinalize && form.marks.trim().length > 0;

  const canGenerate = aiForm.subject.trim().length > 0 && aiForm.topic.trim().length > 0 && !aiLoading;

  const generateAIQuestions = async () => {
    if (!canGenerate) return;
    setAiLoading(true);
    setAiQuestions([]);
    try {
      const token = localStorage.getItem("exam_auth_token");
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: aiForm.subject,
          topic: aiForm.topic,
          difficulty: aiForm.difficulty,
          count: Number(aiForm.count),
        }),
      });
      const payload = await response.json() as { questions?: AIQuestion[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Generation failed");
      setAiQuestions((payload.questions || []).map(q => ({ ...q, added: false })));
      toast({ title: `${payload.questions?.length ?? 0} questions generated!`, description: "Review and add them to the question bank." });
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const addSingleQuestion = (idx: number) => {
    const q = aiQuestions[idx];
    if (!q || q.added) return;
    setAddingIdx(idx);
    createQuestion.mutate(
      { data: { questionText: q.questionText, questionType: "mcq", subject: q.subject, topic: q.topic, difficulty: q.difficulty as "easy"|"medium"|"hard", options: q.options, correctAnswer: q.correctAnswer, marks: q.marks } },
      {
        onSuccess: () => {
          setAiQuestions(prev => prev.map((item, i) => i === idx ? { ...item, added: true } : item));
          setAddingIdx(null);
          refetch();
          toast({ title: "Question added to bank!" });
        },
        onError: (e) => {
          setAddingIdx(null);
          toast({ title: "Failed to add", description: e.message, variant: "destructive" });
        },
      }
    );
  };

  const addAllQuestions = async () => {
    const pending = aiQuestions.filter(q => !q.added);
    if (!pending.length) return;
    setAddingAll(true);
    let added = 0;
    for (let i = 0; i < aiQuestions.length; i++) {
      if (aiQuestions[i].added) continue;
      const q = aiQuestions[i];
      await new Promise<void>((resolve) => {
        createQuestion.mutate(
          { data: { questionText: q.questionText, questionType: "mcq", subject: q.subject, topic: q.topic, difficulty: q.difficulty as "easy"|"medium"|"hard", options: q.options, correctAnswer: q.correctAnswer, marks: q.marks } },
          {
            onSuccess: () => { added++; setAiQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, added: true } : item)); resolve(); },
            onError: () => resolve(),
          }
        );
      });
    }
    setAddingAll(false);
    refetch();
    toast({ title: `${added} questions added to bank!` });
  };

  const importQuestions = async () => {
    try {
      const token = localStorage.getItem("exam_auth_token");
      const response = await fetch("/api/questions/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ data: importCsv }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "Import failed");
      }
      const payload = await response.json() as { inserted: number };
      toast({ title: "Questions imported", description: `Inserted ${payload.inserted}` });
      setImportCsv("");
      setImportDialogOpen(false);
      refetch();
    } catch (error) {
      toast({ title: "Import failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  const startEditing = (question: EditableQuestion) => {
    setEditingQuestionId(question.id);
    setEditForm({
      questionText: question.questionText,
      subject: question.subject,
      topic: question.topic,
      difficulty: question.difficulty,
      options: question.options?.join(" | ") ?? "",
      correctAnswer: question.correctAnswer ?? "",
      marks: String(question.marks),
    });
  };

  const cancelEditing = () => setEditingQuestionId(null);

  const saveEditing = () => {
    if (!editingQuestionId) return;
    updateQuestion.mutate(
      {
        id: editingQuestionId,
        data: {
          questionText: editForm.questionText,
          questionType: "mcq",
          subject: editForm.subject,
          topic: editForm.topic,
          difficulty: editForm.difficulty,
          options: editForm.options.split("|").map((x) => x.trim()).filter(Boolean),
          correctAnswer: editForm.correctAnswer,
          marks: Number(editForm.marks || 1),
        },
      },
      {
        onSuccess: () => { toast({ title: "Question updated" }); setEditingQuestionId(null); refetch(); },
        onError: (error) => toast({ title: "Update failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const submitCreateQuestion = () => {
    createQuestion.mutate(
      {
        data: {
          questionText: form.questionText,
          questionType: "mcq",
          subject: form.subject,
          topic: form.topic,
          difficulty: form.difficulty,
          options: form.options.split("|").map((x) => x.trim()).filter(Boolean),
          correctAnswer: form.correctAnswer,
          marks: Number(form.marks || 1),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Question created" });
          setForm({ questionText: "", subject: "", topic: "", difficulty: "medium", options: "", correctAnswer: "", marks: "" });
          setCreateStep("basic");
          refetch();
        },
        onError: (error) => toast({ title: "Create failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const difficultyColor = (d: string) =>
    d === "easy" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : d === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Question Bank</h2>
          <p className="page-subtitle">Maintain reusable MCQ question inventory</p>
        </div>
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <FileUp className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Questions (CSV)</DialogTitle>
              <DialogDescription>Paste CSV rows using this header format.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                Headers: <code>questionText,subject,topic,difficulty,options,correctAnswer,marks</code>
              </div>
              <Textarea
                value={importCsv}
                onChange={(e) => setImportCsv(e.target.value)}
                rows={9}
                placeholder={`questionText,subject,topic,difficulty,options,correctAnswer,marks\nWhat is 2+2?,Mathematics,Arithmetic,easy,1|2|3|4,4,1`}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
              <Button onClick={importQuestions}>Import</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── AI Question Generator ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-sky-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/12 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            AI Question Generator
            <Badge variant="secondary" className="ml-1 text-[10px] font-bold uppercase tracking-wider">Powered by Groq</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Input
                placeholder="e.g. Mathematics"
                value={aiForm.subject}
                onChange={(e) => setAiForm(p => ({ ...p, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Topic</label>
              <Input
                placeholder="e.g. Quadratic Equations"
                value={aiForm.topic}
                onChange={(e) => setAiForm(p => ({ ...p, topic: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
              <Select value={aiForm.difficulty} onValueChange={(v) => setAiForm(p => ({ ...p, difficulty: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">No. of Questions</label>
              <Select value={aiForm.count} onValueChange={(v) => setAiForm(p => ({ ...p, count: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3,5,8,10,15].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={generateAIQuestions} disabled={!canGenerate} className="gap-2">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiLoading ? "Generating..." : "Generate Questions"}
            </Button>
            {aiQuestions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={addAllQuestions}
                disabled={addingAll || aiQuestions.every(q => q.added)}
                className="gap-2"
              >
                {addingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Add All to Bank
              </Button>
            )}
            {aiQuestions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {aiQuestions.filter(q => q.added).length}/{aiQuestions.length} added
              </span>
            )}
          </div>

          {/* Generated Questions Preview */}
          {aiQuestions.length > 0 && (
            <div className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-3">
              {aiQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 transition-all ${q.added ? "border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/20" : "border-border/50 bg-card"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-medium leading-snug">{q.questionText}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map((opt, oi) => (
                          <span
                            key={oi}
                            className={`rounded-md px-2 py-0.5 text-xs font-medium border ${opt === q.correctAnswer ? "border-emerald-400/60 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "border-border/50 bg-muted/50 text-muted-foreground"}`}
                          >
                            {opt === q.correctAnswer && <Check className="mr-1 inline h-3 w-3" />}
                            {opt}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${difficultyColor(q.difficulty)}`}>
                          {q.difficulty}
                        </span>
                        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {q.marks} {q.marks === 1 ? "mark" : "marks"}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {q.added ? (
                        <div className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <Check className="h-3.5 w-3.5" /> Added
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => addSingleQuestion(idx)}
                          disabled={addingIdx === idx || addingAll}
                        >
                          {addingIdx === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Manual Create ── */}
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle>Create Question Manually</CardTitle>
          <p className="text-sm text-muted-foreground">Fill in 3 quick steps to add a new MCQ question to the bank.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={createStep} onValueChange={(value) => setCreateStep(value as "basic" | "details" | "finalize")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">① Question</TabsTrigger>
              <TabsTrigger value="details" disabled={!canGoDetails}>② Options</TabsTrigger>
              <TabsTrigger value="finalize" disabled={!canGoFinalize}>③ Finalize</TabsTrigger>
            </TabsList>

            {/* ── Step 1: Question Text + Difficulty ── */}
            <TabsContent value="basic" className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Question Text <span className="text-destructive">*</span></label>
                <Textarea
                  className="min-h-[90px] resize-none"
                  placeholder={`e.g. Which planet is known as the Red Planet?\n\nTip: Write the full, clear question as students will see it.`}
                  value={form.questionText}
                  onChange={(e) => setForm((p) => ({ ...p, questionText: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Write the complete question. Avoid abbreviations — students should understand it without extra context.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Question Format</label>
                  <div className="flex h-9 items-center rounded-md border border-border/70 bg-muted/40 px-3 text-sm text-muted-foreground">
                    MCQ — Multiple Choice (4 options)
                  </div>
                  <p className="text-xs text-muted-foreground">Only MCQ format is supported in this system.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Difficulty Level <span className="text-destructive">*</span></label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm((p) => ({ ...p, difficulty: v as "easy" | "medium" | "hard" }))}>
                    <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy — Basic recall / definition</SelectItem>
                      <SelectItem value="medium">Medium — Application / reasoning</SelectItem>
                      <SelectItem value="hard">Hard — Analysis / complex logic</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Used for filtering and auto-assign by difficulty.</p>
                </div>
              </div>

              <div className="flex justify-end border-t border-border/40 pt-3">
                <Button size="sm" onClick={() => setCreateStep("details")} disabled={!canGoDetails}>
                  Next: Add Options →
                </Button>
              </div>
            </TabsContent>

            {/* ── Step 2: Subject, Topic, Options, Correct Answer ── */}
            <TabsContent value="details" className="space-y-4 pt-1">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Subject <span className="text-destructive">*</span></label>
                  <Input
                    placeholder="e.g. Mathematics, Physics, History"
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Must match the exam's subject exactly for auto-assign to work.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Topic <span className="text-destructive">*</span></label>
                  <Input
                    placeholder="e.g. Solar System, Algebra, World War II"
                    value={form.topic}
                    onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">The specific chapter or topic this question belongs to.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Answer Options <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g. Mars|Venus|Jupiter|Saturn"
                  value={form.options}
                  onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))}
                />
                <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold">Format:</span> Separate each option with a pipe <code className="rounded bg-muted px-1">|</code> character. Recommended: 4 options.<br />
                  <span className="font-semibold">Example:</span> <code className="rounded bg-muted px-1">Mars|Venus|Jupiter|Saturn</code>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Correct Answer <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g. Mars  (must match one option exactly)"
                  value={form.correctAnswer}
                  onChange={(e) => setForm((p) => ({ ...p, correctAnswer: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Type the correct option <span className="font-semibold">exactly</span> as it appears above — spelling and case must match.
                  {form.options && (
                    <span className="ml-1 text-primary">
                      Available: {form.options.split("|").map(o => o.trim()).filter(Boolean).join(", ")}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex justify-between border-t border-border/40 pt-3">
                <Button size="sm" variant="outline" onClick={() => setCreateStep("basic")}>← Back</Button>
                <Button size="sm" onClick={() => setCreateStep("finalize")} disabled={!canGoFinalize}>
                  Next: Review & Save →
                </Button>
              </div>
            </TabsContent>

            {/* ── Step 3: Marks + Preview + Submit ── */}
            <TabsContent value="finalize" className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Marks for this Question <span className="text-destructive">*</span></label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="e.g. 1 for standard, 2 for harder questions"
                  value={form.marks}
                  onChange={(e) => setForm((p) => ({ ...p, marks: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Points awarded for a correct answer. Most MCQ questions carry 1 mark.</p>
              </div>

              {/* Preview card */}
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question Preview</p>
                <p className="text-sm font-medium leading-snug">{form.questionText || "—"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {form.options.split("|").map(o => o.trim()).filter(Boolean).map((opt, i) => (
                    <span
                      key={i}
                      className={`rounded-md border px-2 py-0.5 text-xs font-medium ${opt === form.correctAnswer.trim() ? "border-emerald-400/60 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "border-border/50 bg-background text-muted-foreground"}`}
                    >
                      {opt === form.correctAnswer.trim() && <Check className="mr-1 inline h-3 w-3" />}
                      {opt}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>📚 {form.subject || "—"}</span>
                  <span>·</span>
                  <span>📖 {form.topic || "—"}</span>
                  <span>·</span>
                  <span className={`font-semibold ${form.difficulty === "easy" ? "text-emerald-600" : form.difficulty === "hard" ? "text-red-500" : "text-amber-600"}`}>
                    {form.difficulty}
                  </span>
                  <span>·</span>
                  <span>{form.marks || "?"} mark(s)</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-border/40 pt-3">
                <Button size="sm" variant="outline" onClick={() => setCreateStep("details")}>← Back</Button>
                <Button size="sm" disabled={createQuestion.isPending || !canSubmit} onClick={submitCreateQuestion}>
                  {createQuestion.isPending ? "Saving..." : "Add to Question Bank"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Question List ── */}
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Question List</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowQuestionList((prev) => !prev)}>
            {showQuestionList ? "Hide Questions" : "Show Questions"}
          </Button>
        </CardHeader>
        {showQuestionList ? (
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <Input
                type="search"
                placeholder="Filter by subject (e.g. Mathematics)"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              />
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading questions...</p>
            ) : (
              <div className="max-h-[62vh] overflow-y-auto rounded-lg border border-border/70 bg-background/60">
                {data?.questions.map((question, index) => {
                  const isEditing = editingQuestionId === question.id;
                  return (
                    <div key={question.id}>
                      <div className="p-3">
                        {!isEditing ? (
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{question.questionText}</p>
                              <p className="text-xs text-muted-foreground">
                                {question.subject} | {question.topic} | {question.difficulty} | MCQ
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditing(question as EditableQuestion)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                                onClick={() => deleteQuestion.mutate({ id: question.id }, { onSuccess: () => refetch(), onError: (e) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }) })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Textarea className="min-h-16" value={editForm.questionText} onChange={(e) => setEditForm((p) => ({ ...p, questionText: e.target.value }))} />
                            <div className="grid gap-2 md:grid-cols-3">
                              <Input value={editForm.subject} onChange={(e) => setEditForm((p) => ({ ...p, subject: e.target.value }))} />
                              <Input value={editForm.topic} onChange={(e) => setEditForm((p) => ({ ...p, topic: e.target.value }))} />
                              <Input value={editForm.marks} onChange={(e) => setEditForm((p) => ({ ...p, marks: e.target.value }))} />
                              <div className="flex items-center rounded-md border border-border/70 bg-muted/30 px-3 text-sm font-medium text-muted-foreground">MCQ</div>
                              <Select value={editForm.difficulty} onValueChange={(v) => setEditForm((p) => ({ ...p, difficulty: v as "easy" | "medium" | "hard" }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input placeholder="Options (pipe-separated)" value={editForm.options} onChange={(e) => setEditForm((p) => ({ ...p, options: e.target.value }))} />
                            </div>
                            <Input placeholder="Correct answer" value={editForm.correctAnswer} onChange={(e) => setEditForm((p) => ({ ...p, correctAnswer: e.target.value }))} />
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEditing} disabled={updateQuestion.isPending}><Check className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        )}
                      </div>
                      {index < (data?.questions.length ?? 0) - 1 && <Separator />}
                    </div>
                  );
                })}
                {data?.questions.length === 0 && <p className="p-3 text-sm text-muted-foreground">No questions found.</p>}
              </div>
            )}
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">Question list is hidden.</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
