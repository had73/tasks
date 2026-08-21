import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X, Check, ChevronDown } from "lucide-react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import TipTapEditor from "@/components/TipTapEditor";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";

export default function TaskDialog({ open, onOpenChange, task, statuses, labels, users, onSaved }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: "", description_html: "", due_date: "",
    status_id: "", label_ids: [], assignee_ids: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title || "",
          description_html: task.description_html || "",
          due_date: task.due_date || "",
          status_id: task.status_id || "",
          label_ids: task.label_ids || [],
          assignee_ids: task.assignee_ids || [],
        });
      } else {
        setForm({
          title: "", description_html: "", due_date: "",
          status_id: statuses[0]?.id || "",
          label_ids: [], assignee_ids: [],
        });
      }
    }
  }, [open, task, statuses]);

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Zadejte nadpis úkolu"); return; }
    if (!form.status_id) { toast.error("Vyberte stav"); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/tasks/${task.id}`, form);
        toast.success("Úkol uložen");
      } else {
        await api.post(`/tasks`, form);
        toast.success("Úkol vytvořen");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="task-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{isEdit ? "Upravit úkol" : "Nový úkol"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-4">
            <div>
              <Label htmlFor="task-title">Nadpis *</Label>
              <Input
                id="task-title" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Např. Q4 marketingová kampaň"
                data-testid="task-title-input"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Popis</Label>
              <div className="mt-1.5">
                <TipTapEditor
                  value={form.description_html}
                  onChange={(v) => setForm({ ...form, description_html: v })}
                  placeholder="Detailní popis úkolu…"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Termín splnění</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start mt-1.5 font-normal", !form.due_date && "text-zinc-500")}
                    data-testid="task-due-btn"
                  >
                    <CalendarIcon className="mr-2 w-4 h-4" />
                    {form.due_date ? format(parseISO(form.due_date), "d. M. yyyy") : "Vyberte datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.due_date ? parseISO(form.due_date) : undefined}
                    onSelect={(d) => setForm({ ...form, due_date: d ? format(d, "yyyy-MM-dd") : "" })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Stav</Label>
              <Select value={form.status_id} onValueChange={(v) => setForm({ ...form, status_id: v })}>
                <SelectTrigger className="mt-1.5" data-testid="task-status-select"><SelectValue placeholder="Stav" /></SelectTrigger>
                <SelectContent>
                  {statuses.filter(s => s.active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Štítky</Label>
              <MultiSelect
                items={labels.filter(l => l.active).map(l => ({ id: l.id, label: l.name, color: l.color }))}
                selected={form.label_ids}
                onChange={(ids) => setForm({ ...form, label_ids: ids })}
                placeholder="Vyberte štítky"
                testid="task-labels-select"
              />
            </div>

            <div>
              <Label>Spolupracovníci</Label>
              <MultiSelect
                items={users.filter(u => u.active).map(u => ({
                  id: u.id, label: `${u.first_name} ${u.last_name}`, sub: u.email,
                }))}
                selected={form.assignee_ids}
                onChange={(ids) => setForm({ ...form, assignee_ids: ids })}
                placeholder="Přiřadit osoby"
                testid="task-assignees-select"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="task-cancel-btn">Zrušit</Button>
          <Button onClick={submit} disabled={saving} className="bg-zinc-900 hover:bg-zinc-800" data-testid="task-save-btn">
            {saving ? "Ukládám…" : (isEdit ? "Uložit" : "Vytvořit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MultiSelect({ items, selected, onChange, placeholder, testid }) {
  const [open, setOpen] = useState(false);
  const selectedItems = useMemo(() => items.filter(i => selected.includes(i.id)), [items, selected]);

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between mt-1.5 font-normal h-auto min-h-[40px] py-2"
          data-testid={testid}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedItems.length === 0 ? (
              <span className="text-zinc-500">{placeholder}</span>
            ) : selectedItems.map((it) => (
              <span key={it.id} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
                style={{ background: it.color ? `${it.color}22` : "#f4f4f5", color: it.color || "#3f3f46" }}>
                {it.label}
                <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(it.id); }} />
              </span>
            ))}
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Hledat…" />
          <CommandList>
            <CommandEmpty>Nic nenalezeno</CommandEmpty>
            <CommandGroup>
              {items.map((it) => (
                <CommandItem key={it.id} onSelect={() => toggle(it.id)}>
                  <div className={cn("mr-2 w-4 h-4 border rounded flex items-center justify-center",
                    selected.includes(it.id) ? "bg-zinc-900 border-zinc-900" : "border-zinc-300")}>
                    {selected.includes(it.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{it.label}</div>
                    {it.sub && <div className="text-xs text-zinc-500">{it.sub}</div>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
