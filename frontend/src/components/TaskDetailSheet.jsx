import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, UserAvatarGroup } from "@/components/UserAvatar";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, User as UserIcon, Tag, Circle, Pencil, Trash2, History } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TaskDetailSheet({ taskId, open, onOpenChange, statuses, labels, users, onEdit, onDeleted }) {
  const [task, setTask] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      setLoading(true);
      Promise.all([
        api.get(`/tasks/${taskId}`).then(r => r.data),
        api.get(`/tasks/${taskId}/history`).then(r => r.data),
      ]).then(([t, h]) => { setTask(t); setHistory(h); })
        .catch(e => toast.error(apiError(e)))
        .finally(() => setLoading(false));
    }
  }, [taskId, open]);

  const status = statuses.find(s => s.id === task?.status_id);
  const taskLabels = labels.filter(l => task?.label_ids?.includes(l.id));
  const assignees = users.filter(u => task?.assignee_ids?.includes(u.id));
  const author = users.find(u => u.id === task?.author_id);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = task?.due_date && task.due_date < today && status && !status.is_terminal;

  const deleteTask = async () => {
    if (!confirm("Opravdu smazat úkol?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success("Úkol smazán");
      onDeleted?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const fieldLabel = (f) => ({
    title: "Nadpis", description_html: "Popis", due_date: "Termín",
    status_id: "Stav", label_ids: "Štítky", assignee_ids: "Spolupracovníci",
    created: "Vytvořen",
  }[f] || f);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="task-detail-sheet">
        {loading || !task ? (
          <div className="p-8 text-zinc-500">Načítám…</div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="font-display text-2xl leading-tight text-left">{task.title}</SheetTitle>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(task)} data-testid="detail-edit-btn">
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Upravit
                  </Button>
                  <Button variant="outline" size="sm" onClick={deleteTask} className="text-red-600 hover:bg-red-50" data-testid="detail-delete-btn">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2 font-semibold">Popis</div>
                {task.description_html ? (
                  <div className="task-desc-render text-sm text-zinc-800" dangerouslySetInnerHTML={{ __html: task.description_html }} />
                ) : (
                  <div className="text-sm text-zinc-500 italic">Bez popisu</div>
                )}

                <div className="mt-6">
                  <div className="text-xs uppercase tracking-wider text-zinc-400 mb-3 font-semibold flex items-center gap-1.5">
                    <History className="w-3 h-3" /> Historie změn
                  </div>
                  {history.length === 0 ? (
                    <div className="text-sm text-zinc-500 italic">Žádné změny</div>
                  ) : (
                    <ul className="space-y-2">
                      {history.map((h) => {
                        const u = users.find(x => x.id === h.user_id);
                        return (
                          <li key={h.id} className="flex gap-3 text-sm">
                            <UserAvatar user={u} size={26} />
                            <div className="flex-1 min-w-0">
                              <div className="text-zinc-800">
                                <span className="font-medium">{u?.first_name} {u?.last_name}</span>
                                {" · "}
                                <span className="text-zinc-500">{fieldLabel(h.field)}</span>
                              </div>
                              <div className="text-xs text-zinc-500">
                                {format(parseISO(h.timestamp), "d. M. yyyy HH:mm")}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <MetaRow icon={Circle} label="Stav">
                  {status && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium rounded-md px-2 py-0.5"
                      style={{ background: `${status.color}22`, color: status.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                      {status.name}
                    </span>
                  )}
                </MetaRow>
                <MetaRow icon={Calendar} label="Termín">
                  {task.due_date ? (
                    <span className={cn("text-sm", overdue && "text-red-700 font-semibold")}>
                      {format(parseISO(task.due_date), "d. M. yyyy")}
                      {overdue && " · Po termínu"}
                    </span>
                  ) : <span className="text-sm text-zinc-500">—</span>}
                </MetaRow>
                <MetaRow icon={Tag} label="Štítky">
                  <div className="flex flex-wrap gap-1">
                    {taskLabels.length === 0 && <span className="text-sm text-zinc-500">—</span>}
                    {taskLabels.map((l) => (
                      <span key={l.id} className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
                        style={{ background: `${l.color}22`, color: l.color }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                </MetaRow>
                <MetaRow icon={UserIcon} label="Zadavatel">
                  {author ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar user={author} size={24} />
                      <span className="text-sm">{author.first_name} {author.last_name}</span>
                    </div>
                  ) : <span className="text-sm text-zinc-500">—</span>}
                </MetaRow>
                <MetaRow icon={UserIcon} label="Spolupracovníci">
                  {assignees.length ? (
                    <div className="space-y-1.5">
                      {assignees.map(u => (
                        <div key={u.id} className="flex items-center gap-2">
                          <UserAvatar user={u} size={22} />
                          <span className="text-sm">{u.first_name} {u.last_name}</span>
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-sm text-zinc-500">—</span>}
                </MetaRow>
                <MetaRow icon={Clock} label="Vytvořeno">
                  <span className="text-sm text-zinc-600">
                    {format(parseISO(task.created_at), "d. M. yyyy HH:mm")}
                  </span>
                </MetaRow>
                <MetaRow icon={Clock} label="Změněno">
                  <span className="text-sm text-zinc-600">
                    {format(parseISO(task.updated_at), "d. M. yyyy HH:mm")}
                  </span>
                </MetaRow>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetaRow({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-semibold flex items-center gap-1.5">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div>{children}</div>
    </div>
  );
}
