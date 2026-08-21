import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";

export default function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", avatar_url: "" });

  useEffect(() => {
    if (user) setForm({ first_name: user.first_name, last_name: user.last_name, avatar_url: user.avatar_url || "" });
  }, [user]);

  const save = async () => {
    try {
      await api.patch(`/users/${user.id}`, form);
      toast.success("Profil uložen");
      refresh();
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <Layout>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold tracking-tight">Profil</h1>
        <p className="text-sm text-zinc-500 mt-1">Informace o vašem účtu</p>
      </div>
      <Card className="p-6 bg-white border border-zinc-200 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <UserAvatar user={form} size={64} />
          <div>
            <div className="font-display text-xl font-semibold">{user?.first_name} {user?.last_name}</div>
            <div className="text-sm text-zinc-500">{user?.email}</div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1 font-semibold">{user?.role === "admin" ? "Administrátor" : "Uživatel"}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fn">Jméno</Label>
            <Input id="fn" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="mt-1.5" data-testid="profile-firstname" />
          </div>
          <div>
            <Label htmlFor="ln">Příjmení</Label>
            <Input id="ln" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="mt-1.5" data-testid="profile-lastname" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="av">Avatar URL</Label>
            <Input id="av" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="mt-1.5" data-testid="profile-avatar" />
          </div>
        </div>
        <Button onClick={save} className="bg-zinc-900 hover:bg-zinc-800 mt-5" data-testid="profile-save">Uložit</Button>
      </Card>
    </Layout>
  );
}
