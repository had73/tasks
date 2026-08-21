import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { api, apiError } from "@/lib/api";
import { useAppData } from "@/hooks/useAppData";
import { CalendarClock, AlarmClock, ListTodo, CalendarDays, UserRound, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import TaskDialog from "@/components/TaskDialog";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import { UserAvatarGroup } from "@/components/UserAvatar";
import { toast } from "sonner";

export default function Dashboard() {
  const { statuses, labels, users, reload } = useAppData();
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    try { const { data } = await api.get("/dashboard/stats"); setStats(data); }
    catch (e) { toast.error(apiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const statusById = useMemo(() => Object.fromEntries(statuses.map(s => [s.id, s])), [statuses]);
  const labelById = useMemo(() => Object.fromEntries(labels.map(l => [l.id, l])), [labels]);

  const kpi = [
    { label: "Otevřené úkoly", value: stats?.open_count ?? "—", icon: ListTodo, tint: "bg-zinc-50 text-zinc-900 border-zinc-200" },
    { label: "Po termínu", value: stats?.overdue_count ?? "—", icon: AlarmClock, tint: "bg-red-50 text-red-700 border-red-200" },
    { label: "Splatné dnes", value: stats?.today_count ?? "—", icon: CalendarClock, tint: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "Tento týden", value: stats?.week_count ?? "—", icon: CalendarDays, tint: "bg-amber-50 text-amber-800 border-amber-200" },
    { label: "Moje úkoly", value: stats?.my_count ?? "—", icon: UserRound, tint: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ];

  return (
    <Layout search={search} setSearch={setSearch} onCreateTask={() => setCreateOpen(true)}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight" data-testid="page-title">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Přehled aktuálních úkolů a aktivity týmu</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {kpi.map((k) => (
          <Card key={k.label} className={`p-4 border ${k.tint} transition-transform hover:-translate-y-0.5`} data-testid={`kpi-${k.label.replace(/\s/g, "-").toLowerCase()}`}>
            <div className="flex items-center justify-between">
              <k.icon className="w-4 h-4 opacity-70" />
            </div>
            <div className="mt-2 font-display text-3xl font-bold tracking-tight">{k.value}</div>
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 mt-0.5">{k.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 bg-white border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Poslední změněné úkoly</h2>
            <button onClick={() => navigate("/tasks")} className="text-sm text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1">
              Zobrazit vše <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-zinc-100">
            {(stats?.recent || []).map((t) => {
              const st = statusById[t.status_id];
              const asg = users.filter(u => t.assignee_ids?.includes(u.id));
              const today = new Date().toISOString().slice(0, 10);
              const overdue = t.due_date && t.due_date < today && st && !st.is_terminal;
              return (
                <li key={t.id} className="py-2.5 flex items-center gap-3 hover:bg-zinc-50 -mx-2 px-2 rounded-md cursor-pointer transition-colors"
                  onClick={() => setDetailId(t.id)} data-testid="dash-recent-item">
                  {st && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: st.color }} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                      {st?.name}
                      {t.due_date && <span className={overdue ? "text-red-600 font-medium" : ""}>· {format(parseISO(t.due_date), "d. M.")}</span>}
                    </div>
                  </div>
                  <UserAvatarGroup users={asg} max={3} size={26} />
                </li>
              );
            })}
            {(!stats?.recent || stats.recent.length === 0) && (
              <div className="py-6 text-center text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-md">Zatím žádné úkoly</div>
            )}
          </ul>
        </Card>

        <Card className="p-5 bg-white border border-zinc-200">
          <h2 className="font-display text-lg font-semibold mb-4">Podle stavu</h2>
          <ul className="space-y-2.5">
            {statuses.map(s => {
              const count = stats?.by_status?.[s.id] || 0;
              return (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1">{s.name}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </li>
              );
            })}
          </ul>
          <h2 className="font-display text-lg font-semibold mt-6 mb-3">Podle štítků</h2>
          <div className="flex flex-wrap gap-1.5">
            {labels.map(l => {
              const count = stats?.by_label?.[l.id] || 0;
              return (
                <span key={l.id} className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ background: `${l.color}22`, color: l.color }}>
                  {l.name} <span className="opacity-70">{count}</span>
                </span>
              );
            })}
          </div>
        </Card>
      </div>

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
