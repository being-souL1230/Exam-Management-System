import { useState } from "react";
import { Link } from "wouter";
import { useCreateStudent, useListStudents } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUp, Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function StudentsList() {
  const [search, setSearch] = useState("");
  const [importCsv, setImportCsv] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    rollNo: "",
    name: "",
    email: "",
    phone: "",
    course: "",
    year: "",
    photoUrl: "",
  });
  const { data, isLoading, refetch } = useListStudents({ search });
  const createStudent = useCreateStudent();
  const { toast } = useToast();

  const handleImport = async () => {
    if (!importCsv.trim()) {
      toast({ title: "CSV data required", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    try {
      const token = localStorage.getItem("exam_auth_token");
      const response = await fetch("/api/students/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ data: importCsv }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Import failed");
      }
      const payload = await response.json();
      toast({
        title: "Students imported",
        description: `Inserted ${payload.inserted}, skipped ${payload.skipped}`,
      });
      setImportCsv("");
      setImportDialogOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddStudent = () => {
    if (
      !newStudent.rollNo.trim() ||
      !newStudent.name.trim() ||
      !newStudent.email.trim() ||
      !newStudent.phone.trim() ||
      !newStudent.course.trim() ||
      !newStudent.year.trim()
    ) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    createStudent.mutate(
      {
        data: {
          rollNo: newStudent.rollNo.trim(),
          name: newStudent.name.trim(),
          email: newStudent.email.trim(),
          phone: newStudent.phone.trim(),
          course: newStudent.course.trim(),
          year: Number(newStudent.year),
          photoUrl: newStudent.photoUrl.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Student added successfully" });
          setNewStudent({
            rollNo: "",
            name: "",
            email: "",
            phone: "",
            course: "",
            year: "",
            photoUrl: "",
          });
          setShowAddForm(false);
          refetch();
        },
        onError: (error) =>
          toast({
            title: "Add student failed",
            description: error.message,
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Students</h2>
          <p className="page-subtitle">Manage student profiles and run bulk onboarding</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <FileUp className="mr-2 h-4 w-4" />
                Import Students
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Students (CSV)</DialogTitle>
                <DialogDescription>Upload a CSV file or paste CSV data directly.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                  Required headers: <code>rollNo,name,email,phone,course,year</code> &nbsp;|&nbsp; Optional: <code>photoUrl,userId</code>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground transition hover:bg-muted/40">
                  <FileUp className="h-4 w-4 shrink-0" />
                  <span>Click to upload a .csv file</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => setImportCsv(ev.target?.result as string ?? "");
                      reader.readAsText(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <Textarea
                  rows={8}
                  value={importCsv}
                  onChange={(e) => setImportCsv(e.target.value)}
                  placeholder="rollNo,name,email,phone,course,year,photoUrl,userId
CS2024003,Alice,alice@example.com,9876543200,Computer Science,2,,"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? "Importing..." : "Import CSV"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Student</DialogTitle>
                <DialogDescription>Fill student details and save to add in directory.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Roll No (e.g. CS2024123)"
                  value={newStudent.rollNo}
                  onChange={(e) => setNewStudent((p) => ({ ...p, rollNo: e.target.value }))}
                />
                <Input
                  placeholder="Full name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent((p) => ({ ...p, email: e.target.value }))}
                />
                <Input
                  placeholder="Phone"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent((p) => ({ ...p, phone: e.target.value }))}
                />
                <Input
                  placeholder="Course (e.g. Computer Science)"
                  value={newStudent.course}
                  onChange={(e) => setNewStudent((p) => ({ ...p, course: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Year (e.g. 2)"
                  value={newStudent.year}
                  onChange={(e) => setNewStudent((p) => ({ ...p, year: e.target.value }))}
                />
                <Input
                  className="md:col-span-2"
                  placeholder="Photo URL (optional)"
                  value={newStudent.photoUrl}
                  onChange={(e) => setNewStudent((p) => ({ ...p, photoUrl: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddStudent} disabled={createStudent.isPending}>
                  {createStudent.isPending ? "Adding..." : "Save Student"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle>Directory</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.photoUrl || undefined} />
                          <AvatarFallback>{student.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{student.name}</span>
                          <span className="text-xs text-muted-foreground">{student.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{student.rollNo}</TableCell>
                    <TableCell>{student.course}</TableCell>
                    <TableCell>{student.year}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/students/${student.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
