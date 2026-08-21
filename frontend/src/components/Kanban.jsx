import React, { useMemo, useState } from "react";
import { UserAvatarGroup } from "@/components/UserAvatar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";

export default function Kanban({ tasks, statuses, labels, users, onOpen, onChanged }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

  const activeStatuses = useMemo(
    () => statuses.filter((s) => s.active).sort((a, b) => (a.order || 0) - (b.order || 0)),
    [statuses]
  );
  const labelById = useMemo(() => Object.fromEntries(labels.map((l) => [l.id, l])), [labels]);
  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const today = new Date().toISOString().slice(0, 10);

  const grouped = useMemo(() => {
    const g = Object.fromEntries(activeStatuses.map((s) => [s.id, []]));
    tasks.forEach((t) => {
      if (g[t.status_id]) g[t.status_id].push(t);
    });
    return g;
  }, [tasks, activeStatuses]);

  const onDrop = async (statusId) => {
    setDragOverStatus(null);
    if (!dragId) return;
    const task = tasks.find((t) => t.id === dragId);
    setDragId(null);
    if (!task || task.status_id === statusId) return;
    try {
      await api.patch(`/tasks/${task.id}`, { status_id: statusId });
      const st = activeStatuses.find((s) => s.id === statusId);
      toast.success(`Přesunuto do „${st?.name}"`);
      onChanged?.();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="overflow-x-auto no-scrollbar" data-testid="kanban-board">
      <div className="flex gap-3 min-w-max pb-2">
        {activeStatuses.map((s) => {
          const items = grouped[s.id] || [];
          const isOver = dragOverStatus === s.id;
          return (
            <div
              key={s.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverStatus(s.id); }}
              onDragLeave={() => setDragOverStatus((v) => (v === s.id ? null : v))}
              onDrop={() => onDrop(s.id)}
              data-testid={`kanban-col-${s.id}`}
              className={cn(
                "w-[300px] flex-shrink-0 rounded-lg bg-zinc-100/60 border border-zinc-200 transition-colors",
                isOver && "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
              )}
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200/70">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="font-display font-semibold text-sm">{s.name}</span>
                </div>
                <span className="text-xs font-medium tabular-nums text-zinc-500 bg-white border border-zinc-200 rounded-md px-1.5 py-0.5">
                  {items.length}
                </span>
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {items.map((t) => {
                  const tls = (t.label_ids || []).map((id) => labelById[id]).filter(Boolean);
                  const asg = (t.assignee_ids || []).map((id) => userById[id]).filter(Boolean);
                  const overdue = t.due_date && t.due_date < today && !s.is_terminal;
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => onOpen?.(t.id)}
                      data-testid="kanban-card"
                      className={cn(
                        "bg-white rounded-md border border-zinc-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-all",
                        dragId === t.id && "opacity-40"
                      )}
                    >
                      <div className="font-medium text-sm leading-snug">{t.title}</div>
                      {tls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tls.slice(0, 3).map((l) => (
                            <span key={l.id} className="text-[11px] rounded-md px-1.5 py-0.5 font-medium"
                              style={{ background: `${l.color}22`, color: l.color }}>
                              {l.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className={cn(
                          "text-xs",
                          overdue ? "text-red-700 font-semibold" : "text-zinc-500"
                        )}>
                          {t.due_date ? format(parseISO(t.due_date), "d. M. yyyy") : "—"}
                          {overdue && " · Po termínu"}
                        </span>
                        <UserAvatarGroup users={asg} size={22} />
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="text-xs text-zinc-400 text-center py-6 border border-dashed border-zinc-200 rounded-md">
                    Přetáhněte úkol sem
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
