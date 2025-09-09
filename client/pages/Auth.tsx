import { useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase"; const supabase = getSupabase();
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ProfileRole } from "@shared/api";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<ProfileRole>("player");
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/";

  const disabled = !isSupabaseConfigured();

  const onSignIn = async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) setError(error.message);
    else navigate(from);
  };

  const onSignUp = async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Try to obtain an authenticated session immediately (may fail if email confirmation is required)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData?.user) {
        // If immediate sign-in is not possible (e.g. confirmation required), inform the user
        setError(
          "Registrazione completata. Controlla la tua email per confermare l'account. Il profilo sarà creato al primo login."
        );
        setLoading(false);
        // Do not navigate away — keep user on signup so they can confirm email or retry login
        return;
      }

      const user = signInData.user;

      // Upsert profile while authenticated so RLS rules based on auth.uid() pass
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .upsert({ id: user.id, email, role });

      if (profileError) {
        setError(profileError.message);
      }

      setLoading(false);
      navigate(from);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-primary/10 via-background to-accent/10 py-10 px-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-yellow-300/50">
        <CardHeader className="text-center">
          <img src="https://cdn.builder.io/api/v1/image/assets%2F6b619505ba96465eb1afa787c4410188%2F6d46fcaf17b8448f90542ca5bb718e0f?format=webp&width=120" alt="logo" className="mx-auto w-20 h-20 object-contain mb-2" />
          <CardTitle className="font-display text-3xl text-primary drop-shadow">
            Log Pose
          </CardTitle>
          {!isSupabaseConfigured() && (
            <p className="text-sm text-destructive mt-2">
              Configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY per abilitare
              l'autenticazione.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Registrati</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                className="w-full font-heading"
                onClick={onSignIn}
                disabled={loading || disabled}
              >
                {loading ? "..." : "Entra"}
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="mt-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ruolo</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as ProfileRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full font-heading"
                onClick={onSignUp}
                disabled={loading || disabled}
              >
                {loading ? "..." : "Crea account"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center flex-col">
          <p className="text-xs text-muted-foreground">
            Avventura inizia qui. Protezione con Supabase Auth.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
