import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function Register() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/70">
        <CardHeader className="space-y-1 pb-4 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">ExamSys</p>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-semibold">Registration Disabled</CardTitle>
          <CardDescription>
            Account creation is managed by administrators only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-muted-foreground pb-6">
          <p>
            To get access, please contact your institution administrator. They will create your account and provide you with login credentials.
          </p>
          <Link href="/login" className="inline-block font-medium text-primary hover:underline">
            ← Back to Sign In
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
