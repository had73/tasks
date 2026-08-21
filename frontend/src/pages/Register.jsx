import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiError } from "@/lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Účet vytvořen");
      navigate("/");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg border border-zinc-200">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold font-display">TF</div>
          <span className="font-display font-bold text-xl tracking-tight">TaskFlow</span>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Vytvořte účet</h1>
        <p className="text-sm text-zinc-500 mb-6">Zaregistrujte se zdarma</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fn">Jméno</Label>
              <Input id="fn" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="mt-1.5" data-testid="reg-firstname" />
            </div>
            <div>
              <Label htmlFor="ln">Příjmení</Label>
              <Input id="ln" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="mt-1.5" data-testid="reg-lastname" />
            </div>
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" data-testid="reg-email" />
          </div>
          <div>
            <Label htmlFor="pw">Heslo</Label>
            <Input id="pw" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" data-testid="reg-password" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-zinc-900 hover:bg-zinc-800 h-10 mt-2" data-testid="reg-submit">
            {loading ? "Vytvářím účet…" : "Vytvořit účet"}
          </Button>
        </form>
        <p className="text-sm text-zinc-500 mt-5 text-center">
          Již máte účet?{" "}
          <Link to="/login" className="text-zinc-900 font-medium hover:underline" data-testid="link-login">Přihlaste se</Link>
        </p>
      </div>
    </div>
  );
}
