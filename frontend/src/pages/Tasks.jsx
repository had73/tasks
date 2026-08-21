import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, apiError } from "@/lib/api";
import { useAppData } from "@/hooks/useAppData";
import { UserAvatarGroup } from "@/components/UserAvatar";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import TaskDialog from "@/components/TaskDialog";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import Timeline from "@/components/Timeline";
import { List as ListIcon, LayoutGrid, GanttChartSquare, ArrowUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function Tasks({ onlyMine = false }) {
  const { user } = useAuth();
  const { statuses, labels, users, reload } = useAppData();
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState(onlyMine ? "me" : "all");
  const [dueFilter, setDueFilter] = useState("all"); // all, overdue, today, week
  const [sortBy, setSortBy] = useState("due_date");
  const [sortDir, setSortDir] = useState("asc");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const load = async () => {
    try {
      const params = {};
      if (search) params.q = search;
      if (statusFilter !== "all") params.status_id = statusFilter;
      if (labelFilter !== "all") params.label_id = labelFilter;
      if (assigneeFilter !== "all") params.assignee_id = assigneeFilter === "me" ? user.id : assigneeFilter;
      const { data } = await api.get("/tasks", { params });
      setTasks(data);
    } catch (e) { toast.error(apiError(e)); }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search, statusFilter, labelFilter, assigneeFilter]);

  const statusById = useMemo(() => Object.fromEntries(statuses.map(s => [s.id, s])), [statuses]);
  const labelById = useMemo(() => Object.fromEntries(labels.map(l => [l.id, l])), [labels]);
  const userById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    let list = tasks;
    if (dueFilter === "overdue") {
      list = list.filter(t => t.due_date && t.due_date < today && !statusById[t.status_id]?.is_terminal);
    } else if (dueFilter === "today") {
      list = list.filter(t => t.due_date === today);
    } else if (dueFilter === "week") {
      list = list.filter(t => t.due_date && t.due_date >= today && t.due_date <= weekEnd);
    }
    const sorted = [...list].sort((a, b) => {
      let av, bv;
      if (sortBy === "title") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
      else if (sortBy === "status") { av = statusById[a.status_id]?.order || 0; bv = statusById[b.status_id]?.order || 0; }
      else if (sortBy === "label") { av = labelById[a.label_ids?.[0]]?.name || "zzz"; bv = labelById[b.label_ids?.[0]]?.name || "zzz"; }
      else { av = a[sortBy] || "9999-12-31"; bv = b[sortBy] || "9999-12-31"; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [tasks, dueFilter, sortBy, sortDir, statusById, labelById]);

  const resetFilters = () => {
    setStatusFilter("all"); setLabelFilter("all"); setDueFilter("all");
    if (!onlyMine) setAssigneeFilter("all");
  };

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (t) => t.due_date && t.due_date < today && !statusById[t.status_id]?.is_terminal;

  return (
    <Layout search={search} setSearch={setSearch} onCreateTask={() => setCreateOpen(true)}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{onlyMine ? "Moje úkoly" : "Úkoly"}</h1>
          <p className="text-sm text-zinc-500 mt-1">{filtered.length} úkolů</p>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-white border border-zinc-200">
            <TabsTrigger value="list" data-testid="view-list"><ListIcon className="w-4 h-4 mr-1.5" />Seznam</TabsTrigger>
            <TabsTrigger value="cards" data-testid="view-cards"><LayoutGrid className="w-4 h-4 mr-1.5" />Karty</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="view-timeline"><GanttChartSquare className="w-4 h-4 mr-1.5" />Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="p-3 mb-4 bg-white border border-zinc-200 flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9" data-testid="filter-status"><SelectValue placeholder="Stav" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={labelFilter} onValueChange={setLabelFilter}>
          <SelectTrigger className="w-[160px] h-9" data-testid="filter-label"><SelectValue placeholder="Štítek" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny štítky</SelectItem>
            {labels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {!onlyMine && (
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px] h-9" data-testid="filter-assignee"><SelectValue placeholder="Osoba" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny osoby</SelectItem>
              <SelectItem value="me">Moje úkoly</SelectItem>
              {users.filter(u => u.active).map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={dueFilter} onValueChange={setDueFilter}>
          <SelectTrigger className="w-[160px] h-9" data-testid="filter-due"><SelectValue placeholder="Termín" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny termíny</SelectItem>
            <SelectItem value="overdue">Po termínu</SelectItem>
            <SelectItem value="today">Dnes</SelectItem>
            <SelectItem value="week">Tento týden</SelectItem>
          </SelectContent>
        </Select>
        <div className="mx-1 h-6 w-px bg-zinc-200" />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[170px] h-9" data-testid="sort-by"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="due_date">Termín</SelectItem>
            <SelectItem value="created_at">Datum vytvoření</SelectItem>
            <SelectItem value="updated_at">Datum změny</SelectItem>
            <SelectItem value="title">Název</SelectItem>
            <SelectItem value="status">Stav</SelectItem>
            <SelectItem value="label">Štítek</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} data-testid="sort-dir">
          <ArrowUpDown className="w-3.5 h-3.5 mr-1" />{sortDir === "asc" ? "Vzestupně" : "Sestupně"}
        </Button>
        <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="reset-filters">
          <X className="w-3.5 h-3.5 mr-1" />Vymazat
        </Button>
      </Card>

      {view === "list" && (
        <Card className="bg-white border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Název</th>
                <th className="px-3 py-2.5 text-left font-semibold w-40">Stav</th>
                <th className="px-3 py-2.5 text-left font-semibold w-40">Štítky</th>
                <th className="px-3 py-2.5 text-left font-semibold w-32">Termín</th>
                <th className="px-3 py-2.5 text-left font-semibold w-32">Spolupracovníci</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const st = statusById[t.status_id];
                const asg = (t.assignee_ids || []).map(id => userById[id]).filter(Boolean);
                const tls = (t.label_ids || []).map(id => labelById[id]).filter(Boolean);
                return (
                  <tr key={t.id} onClick={() => setDetailId(t.id)}
                    className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors" data-testid="task-row">
                    <td className="px-4 py-2.5 font-medium">{t.title}</td>
                    <td className="px-3 py-2.5">
                      {st && <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-0.5"
                        style={{ background: `${st.color}22`, color: st.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />{st.name}
                      </span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {tls.map(l => (
                          <span key={l.id} className="text-xs rounded-md px-1.5 py-0.5 font-medium" style={{ background: `${l.color}22`, color: l.color }}>{l.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className={cn("px-3 py-2.5", isOverdue(t) && "text-red-700 font-medium")}>
                      {t.due_date ? format(parseISO(t.due_date), "d. M. yyyy") : "—"}
                    </td>
                    <td className="px-3 py-2.5"><UserAvatarGroup users={asg} size={26} /></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-zinc-500">Žádné úkoly neodpovídají filtrům</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {view === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => {
            const st = statusById[t.status_id];
            const asg = (t.assignee_ids || []).map(id => userById[id]).filter(Boolean);
            const tls = (t.label_ids || []).map(id => labelById[id]).filter(Boolean);
            return (
              <Card key={t.id} onClick={() => setDetailId(t.id)}
                className="p-4 bg-white border border-zinc-200 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer" data-testid="task-card">
                <div className="flex items-start justify-between gap-2">
                  {st && <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-0.5"
                    style={{ background: `${st.color}22`, color: st.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />{st.name}
                  </span>}
                  {isOverdue(t) && <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md px-1.5 py-0.5">Po termínu</span>}
                </div>
                <div className="mt-2 font-display font-semibold text-base leading-snug">{t.title}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tls.map(l => (
                    <span key={l.id} className="text-[11px] rounded-md px-1.5 py-0.5 font-medium" style={{ background: `${l.color}22`, color: l.color }}>{l.name}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>{t.due_date ? format(parseISO(t.due_date), "d. M. yyyy") : "Bez termínu"}</span>
                  <UserAvatarGroup users={asg} size={24} />
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full p-8 text-center text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-md">Žádné úkoly</div>
          )}
        </div>
      )}

      {view === "timeline" && (
        <Timeline tasks={filtered} statuses={statuses} labels={labels} users={users} onOpen={(id) => setDetailId(id)} />
      )}

      <TaskDialog open={createOpen || !!editTask} onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditTask(null); } }}
        task={editTask} statuses={statuses} labels={labels} users={users}
        onSaved={() => { load(); reload(); }} />
      <TaskDetailSheet taskId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}
        statuses={statuses} labels={labels} users={users}
        onEdit={(t) => { setDetailId(null); setEditTask(t); }}
        onDeleted={load} />
    </Layout>
  );
}
