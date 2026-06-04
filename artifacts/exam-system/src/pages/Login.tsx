import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { AuthResponse } from "@workspace/api-client-react";
import "@/components/ui/space-button.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, setToken } = useAuth();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: (data: AuthResponse) => {
          toast({ title: "Logged in successfully" });
          setToken(data.token, "/dashboard");
        },
        onError: (error: unknown) => {
          toast({ 
            title: "Login failed", 
            description: error instanceof Error ? error.message : "Invalid credentials",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/70">
        <CardHeader className="space-y-1 pb-4 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">ExamSys</p>
          <CardTitle className="text-2xl font-semibold">Sign in</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="Enter your password"
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <button
              type="submit"
              className="space-btn w-full"
              disabled={login.isPending}
            >
              <div className="space-btn-stars-container">
                <div className="space-btn-stars" />
              </div>
              <div className="space-btn-glow">
                <div className="space-btn-circle" />
                <div className="space-btn-circle" />
              </div>
              <strong>
                {login.isPending
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</span>
                  : "SIGN IN"
                }
              </strong>
            </button>
            <div className="text-center text-sm text-muted-foreground">
              Contact your administrator to get access.
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
