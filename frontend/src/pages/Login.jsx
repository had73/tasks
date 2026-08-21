import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiError } from "@/lib/api";
import { CheckSquare } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Vítejte zpět");
      navigate("/");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const googleLogin = () => {
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold font-display">TF</div>
            <span className="font-display font-bold text-2xl tracking-tight">TaskFlow</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">Vítejte zpět</h1>
          <p className="text-zinc-500 text-sm mb-8">Přihlaste se ke svému účtu</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5" data-testid="login-email" />
            </div>
            <div>
              <Label htmlFor="password">Heslo</Label>
              <Input id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5" data-testid="login-password" />
            </div>
            <Button type="submit" disabled={loading}
              className="w-full bg-zinc-900 hover:bg-zinc-800 h-10" data-testid="login-submit">
              {loading ? "Přihlašuji…" : "Přihlásit se"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400 uppercase tracking-wider">nebo</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <Button variant="outline" onClick={googleLogin} className="w-full h-10" data-testid="google-login">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Pokračovat s Google
          </Button>

          <p className="text-sm text-zinc-500 mt-6 text-center">
            Nemáte účet?{" "}
            <Link to="/register" className="text-zinc-900 font-medium hover:underline" data-testid="link-register">
              Registrujte se
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden md:block relative overflow-hidden bg-zinc-900">
        <img src="https://images.pexels.com/photos/7827838/pexels-photo-7827838.jpeg?auto=compress&cs=tinysrgb&h=900"
          alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/40 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <h2 className="font-display text-4xl font-bold tracking-tight mb-2">Řízení úkolů,<br/>přesně jak má být.</h2>
          <p className="text-zinc-200 text-sm max-w-md">Vytvářejte, přiřazujte a sledujte úkoly týmu na moderní timeline s plnou historií změn.</p>
        </div>
      </div>
    </div>
  );
}
