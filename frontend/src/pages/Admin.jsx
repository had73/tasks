import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api, apiError } from "@/lib/api";
import { useAppData } from "@/hooks/useAppData";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Admin() {
  return (
    <Layout>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold tracking-tight">Administrace</h1>
        <p className="text-sm text-zinc-500 mt-1">Správa uživatelů, štítků a stavů</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList className="bg-white border border-zinc-200 mb-4">
          <TabsTrigger value="users" data-testid="admin-tab-users">Uživatelé</TabsTrigger>
          <TabsTrigger value="labels" data-testid="admin-tab-labels">Štítky</TabsTrigger>
          <TabsTrigger value="statuses" data-testid="admin-tab-statuses">Stavy úkolů</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersAdmin /></TabsContent>
        <TabsContent value="labels"><LabelsAdmin /></TabsContent>
        <TabsContent value="statuses"><StatusesAdmin /></TabsContent>
      </Tabs>
    </Layout>
  );
}

function UsersAdmin() {
  const { users, reload } = useAppData();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(null);
  const { user: me } = useAuth();

  const filtered = users.filter(u =>
    !q || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q.toLowerCase())
  );

  const save = async () => {
    try {
      await api.patch(`/users/${editing.id}`, {
        first_name: editing.first_name, last_name: editing.last_name,
        role: editing.role, active: editing.active, avatar_url: editing.avatar_url,
      });
      toast.success("Uloženo"); setEditing(null); reload();
    } catch (e) { toast.error(apiError(e)); }
  };

  const create = async () => {
    if (!creating.email || !creating.password || !creating.first_name || !creating.last_name) {
      toast.error("Vyplňte všechna povinná pole"); return;
    }
    if (creating.password.length < 6) { toast.error("Heslo musí mít alespoň 6 znaků"); return; }
    try {
      await api.post(`/users`, creating);
      toast.success("Uživatel vytvořen"); setCreating(null); reload();
    } catch (e) { toast.error(apiError(e)); }
  };

  const emptyUser = { email: "", password: "", first_name: "", last_name: "", role: "user", avatar_url: "", active: true };

  return (
    <Card className="bg-white border border-zinc-200 overflow-hidden">
      <div className="p-3 border-b border-zinc-200 flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input placeholder="Hledat uživatele…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-9" data-testid="admin-users-search" />
        </div>
        <Button className="bg-zinc-900 hover:bg-zinc-800 h-9" onClick={() => setCreating(emptyUser)} data-testid="admin-users-new">
          <Plus className="w-4 h-4 mr-1" /> Nový uživatel
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-2.5 text-left font-semibold">Uživatel</th>
            <th className="px-3 py-2.5 text-left font-semibold">E-mail</th>
            <th className="px-3 py-2.5 text-left font-semibold w-32">Role</th>
            <th className="px-3 py-2.5 text-left font-semibold w-24">Stav</th>
            <th className="px-3 py-2.5 w-24"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id} className="border-t border-zinc-100 hover:bg-zinc-50" data-testid="admin-user-row">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <UserAvatar user={u} size={28} />
                  <span className="font-medium">{u.first_name} {u.last_name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-zinc-600">{u.email}</td>
              <td className="px-3 py-2.5">
                <span className={`text-xs font-medium rounded-md px-2 py-0.5 ${u.role === "admin" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                  {u.role === "admin" ? "Admin" : "Uživatel"}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span className={`text-xs font-medium ${u.active ? "text-emerald-700" : "text-zinc-400"}`}>
                  {u.active ? "Aktivní" : "Neaktivní"}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <Button variant="ghost" size="sm" onClick={() => setEditing({ ...u })} data-testid="admin-user-edit"><Pencil className="w-3.5 h-3.5" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upravit uživatele</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Jméno</Label><Input value={editing.first_name} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Příjmení</Label><Input value={editing.last_name} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} className="mt-1.5" /></div>
              </div>
              <div><Label>Avatar URL</Label><Input value={editing.avatar_url || ""} onChange={(e) => setEditing({ ...editing, avatar_url: e.target.value })} className="mt-1.5" /></div>
              <div>
                <Label>Role</Label>
                <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v })} disabled={editing.id === me?.id}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="admin">Administrátor</SelectItem><SelectItem value="user">Uživatel</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} disabled={editing.id === me?.id} /><Label>Aktivní</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Zrušit</Button>
            <Button onClick={save} className="bg-zinc-900" data-testid="admin-user-save">Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!creating} onOpenChange={(v) => !v && setCreating(null)}>
        <DialogContent data-testid="admin-user-create-dialog">
          <DialogHeader><DialogTitle>Nový uživatel</DialogTitle></DialogHeader>
          {creating && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Jméno *</Label><Input value={creating.first_name} onChange={(e) => setCreating({ ...creating, first_name: e.target.value })} className="mt-1.5" data-testid="new-user-firstname" /></div>
                <div><Label>Příjmení *</Label><Input value={creating.last_name} onChange={(e) => setCreating({ ...creating, last_name: e.target.value })} className="mt-1.5" data-testid="new-user-lastname" /></div>
              </div>
              <div><Label>E-mail *</Label><Input type="email" value={creating.email} onChange={(e) => setCreating({ ...creating, email: e.target.value })} className="mt-1.5" data-testid="new-user-email" /></div>
              <div><Label>Heslo * (min. 6 znaků)</Label><Input type="password" value={creating.password} onChange={(e) => setCreating({ ...creating, password: e.target.value })} className="mt-1.5" data-testid="new-user-password" /></div>
              <div><Label>Avatar URL</Label><Input value={creating.avatar_url || ""} onChange={(e) => setCreating({ ...creating, avatar_url: e.target.value })} className="mt-1.5" placeholder="https://…" /></div>
              <div>
                <Label>Role</Label>
                <Select value={creating.role} onValueChange={(v) => setCreating({ ...creating, role: v })}>
                  <SelectTrigger className="mt-1.5" data-testid="new-user-role"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="user">Uživatel</SelectItem><SelectItem value="admin">Administrátor</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={creating.active} onCheckedChange={(v) => setCreating({ ...creating, active: v })} /><Label>Aktivní</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(null)}>Zrušit</Button>
            <Button onClick={create} className="bg-zinc-900" data-testid="new-user-save">Vytvořit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function LabelsAdmin() {
  const { labels, reload } = useAppData();
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [q, setQ] = useState("");

  const empty = { name: "", description: "", color: "#3b82f6", active: true };
  const save = async () => {
    try {
      if (editing.id) await api.patch(`/labels/${editing.id}`, editing);
      else await api.post(`/labels`, editing);
      toast.success("Uloženo"); setEditing(null); reload();
    } catch (e) { toast.error(apiError(e)); }
  };
  const del = async () => {
    try { await api.delete(`/labels/${deleteId}`); toast.success("Smazáno"); setDeleteId(null); reload(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const filtered = labels.filter(l => !q || l.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card className="bg-white border border-zinc-200 overflow-hidden">
      <div className="p-3 border-b border-zinc-200 flex items-center justify-between gap-2">
        <Input placeholder="Hledat…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs h-9" data-testid="admin-labels-search" />
        <Button className="bg-zinc-900 hover:bg-zinc-800 h-9" onClick={() => setEditing(empty)} data-testid="admin-labels-new"><Plus className="w-4 h-4 mr-1" /> Nový štítek</Button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
          <tr><th className="px-4 py-2.5 text-left font-semibold">Štítek</th><th className="px-3 py-2.5 text-left font-semibold">Popis</th><th className="px-3 py-2.5 w-24 text-left font-semibold">Stav</th><th className="w-24"></th></tr>
        </thead>
        <tbody>
          {filtered.map(l => (
            <tr key={l.id} className="border-t border-zinc-100 hover:bg-zinc-50">
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-0.5" style={{ background: `${l.color}22`, color: l.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />{l.name}
                </span>
              </td>
              <td className="px-3 py-2.5 text-zinc-600">{l.description}</td>
              <td className="px-3 py-2.5"><span className={`text-xs font-medium ${l.active ? "text-emerald-700" : "text-zinc-400"}`}>{l.active ? "Aktivní" : "Neaktivní"}</span></td>
              <td className="px-3 py-2.5 text-right">
                <Button variant="ghost" size="sm" onClick={() => setEditing({ ...l })}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(l.id)} className="text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Upravit štítek" : "Nový štítek"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Název</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5" data-testid="label-name" /></div>
              <div><Label>Popis</Label><Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1.5" /></div>
              <div className="flex items-center gap-3"><Label>Barva</Label><input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="h-9 w-14 rounded border border-zinc-200" data-testid="label-color" /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><Label>Aktivní</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Zrušit</Button>
            <Button onClick={save} className="bg-zinc-900" data-testid="label-save">Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Smazat štítek?</AlertDialogTitle><AlertDialogDescription>Tato akce je nevratná.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Zrušit</AlertDialogCancel><AlertDialogAction onClick={del}>Smazat</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function StatusesAdmin() {
  const { statuses, reload } = useAppData();
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const empty = { name: "", color: "#64748b", order: (statuses[statuses.length - 1]?.order || 0) + 1, active: true, is_terminal: false };

  const save = async () => {
    try {
      if (editing.id) await api.patch(`/statuses/${editing.id}`, editing);
      else await api.post(`/statuses`, editing);
      toast.success("Uloženo"); setEditing(null); reload();
    } catch (e) { toast.error(apiError(e)); }
  };
  const del = async () => {
    try { await api.delete(`/statuses/${deleteId}`); toast.success("Smazáno"); setDeleteId(null); reload(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <Card className="bg-white border border-zinc-200 overflow-hidden">
      <div className="p-3 border-b border-zinc-200 flex items-center justify-end">
        <Button className="bg-zinc-900 hover:bg-zinc-800 h-9" onClick={() => setEditing(empty)} data-testid="admin-status-new"><Plus className="w-4 h-4 mr-1" /> Nový stav</Button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
          <tr><th className="px-4 py-2.5 text-left font-semibold">Stav</th><th className="px-3 py-2.5 w-24 text-left font-semibold">Pořadí</th><th className="px-3 py-2.5 w-24 text-left font-semibold">Terminální</th><th className="px-3 py-2.5 w-24 text-left font-semibold">Stav</th><th className="w-24"></th></tr>
        </thead>
        <tbody>
          {statuses.map(s => (
            <tr key={s.id} className="border-t border-zinc-100 hover:bg-zinc-50">
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-0.5" style={{ background: `${s.color}22`, color: s.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.name}
                </span>
              </td>
              <td className="px-3 py-2.5 tabular-nums text-zinc-600">{s.order}</td>
              <td className="px-3 py-2.5 text-zinc-600">{s.is_terminal ? "Ano" : "Ne"}</td>
              <td className="px-3 py-2.5"><span className={`text-xs font-medium ${s.active ? "text-emerald-700" : "text-zinc-400"}`}>{s.active ? "Aktivní" : "Neaktivní"}</span></td>
              <td className="px-3 py-2.5 text-right">
                <Button variant="ghost" size="sm" onClick={() => setEditing({ ...s })}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)} className="text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Upravit stav" : "Nový stav"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Název</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5" data-testid="status-name" /></div>
              <div className="flex items-center gap-3"><Label>Barva</Label><input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="h-9 w-14 rounded border border-zinc-200" /></div>
              <div><Label>Pořadí</Label><Input type="number" value={editing.order} onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value || 0) })} className="mt-1.5" /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_terminal} onCheckedChange={(v) => setEditing({ ...editing, is_terminal: v })} /><Label>Terminální (dokončený/zrušený)</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><Label>Aktivní</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Zrušit</Button>
            <Button onClick={save} className="bg-zinc-900" data-testid="status-save">Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Smazat stav?</AlertDialogTitle><AlertDialogDescription>Stav půjde smazat pouze pokud jej nepoužívá žádný úkol.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Zrušit</AlertDialogCancel><AlertDialogAction onClick={del}>Smazat</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
