import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Unauthorized from "@/pages/Unauthorized";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import Exams from "@/pages/Exams";
import Questions from "@/pages/Questions";
import Results from "@/pages/Results";
import Notifications from "@/pages/Notifications";
import ExamSession from "@/pages/ExamSession";
import AdminControl from "@/pages/AdminControl"
import ExamMonitor from "@/pages/ExamMonitor";
import GradeBook from "@/pages/GradeBook";
import AcademicCalendar from "@/pages/AcademicCalendar";
import Fees from "@/pages/Fees";
import Timeout from "@/pages/Timeout";
import ServerError from "@/pages/ServerError";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ component: Component, roles }: { component: any, roles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Redirect to="/401" />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/" component={Landing} />
      <Route path="/401" component={Unauthorized} />
      <Route path="/408" component={Timeout} />
      <Route path="/500" component={ServerError} />

      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>

      <Route path="/students">
        {() => <ProtectedRoute component={Students} roles={["admin", "teacher"]} />}
      </Route>

      <Route path="/exams">
        {() => <ProtectedRoute component={Exams} />}
      </Route>

      <Route path="/questions">
        {() => <ProtectedRoute component={Questions} roles={["admin", "teacher"]} />}
      </Route>

      <Route path="/results">
        {() => <ProtectedRoute component={Results} />}
      </Route>

      <Route path="/notifications">
        {() => <ProtectedRoute component={Notifications} />}
      </Route>

      <Route path="/admin-control">
        {() => <ProtectedRoute component={AdminControl} roles={["admin"]} />}
      </Route>

      <Route path="/exam-session/:examId">
        {(params) => <ProtectedRoute component={() => <ExamSession examId={params.examId} />} roles={["student"]} />}
      </Route>

      <Route path="/exam-monitor/:examId">
        {(params) => <ProtectedRoute component={() => <ExamMonitor examId={params.examId} />} roles={["admin", "teacher"]} />}
      </Route>

      <Route path="/gradebook">
        {() => <ProtectedRoute component={GradeBook} roles={["admin", "teacher"]} />}
      </Route>

      <Route path="/calendar">
        {() => <ProtectedRoute component={AcademicCalendar} />}
      </Route>

      <Route path="/fees">
        {() => <ProtectedRoute component={Fees} roles={["admin", "teacher"]} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
