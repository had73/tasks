import React, { useMemo, useState } from "react";
import { addDays, differenceInDays, format, parseISO, startOfWeek, startOfMonth, startOfYear, endOfMonth, endOfYear } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import { UserAvatarGroup } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

const ZOOMS = {
  day:   { unit: "day",   count: 21, dayWidth: 60,  fmt: "d. M." },
  week:  { unit: "week",  count: 12, dayWidth: 22,  fmt: "d. M." },
  month: { unit: "month", count: 6,  dayWidth: 8,   fmt: "MMM" },
  year:  { unit: "year",  count: 2,  dayWidth: 2.5, fmt: "MMM yy" },
};

export default function Timeline({ tasks, statuses, labels, users, onOpen }) {
  const [zoom, setZoom] = useState("week");
  const cfg = ZOOMS[zoom];
  const today = new Date();

  const start = useMemo(() => {
    if (zoom === "day") return addDays(today, -3);
    if (zoom === "week") return startOfWeek(addDays(today, -14), { weekStartsOn: 1 });
    if (zoom === "month") return startOfMonth(addDays(today, -30));
    return startOfYear(today);
  }, [zoom]);

  const end = useMemo(() => {
    if (zoom === "day") return addDays(start, 21);
    if (zoom === "week") return addDays(start, 12 * 7);
    if (zoom === "month") return endOfMonth(addDays(start, 30 * 6));
    return endOfYear(addDays(start, 365));
  }, [start, zoom]);

  const totalDays = differenceInDays(end, start);
  const totalWidth = totalDays * cfg.dayWidth;

  const statusById = useMemo(() => Object.fromEntries(statuses.map(s => [s.id, s])), [statuses]);
  const userById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const dayHeaders = useMemo(() => {
    const arr = [];
    if (zoom === "day" || zoom === "week") {
      for (let i = 0; i <= totalDays; i += (zoom === "day" ? 1 : 7)) {
        arr.push({ date: addDays(start, i), offset: i * cfg.dayWidth });
      }
    } else if (zoom === "month") {
      let cur = startOfMonth(start);
      while (cur <= end) {
        arr.push({ date: cur, offset: differenceInDays(cur, start) * cfg.dayWidth });
        cur = startOfMonth(addDays(cur, 32));
      }
    } else {
      let cur = startOfMonth(start);
      while (cur <= end) {
        arr.push({ date: cur, offset: differenceInDays(cur, start) * cfg.dayWidth });
        cur = startOfMonth(addDays(cur, 32));
      }
    }
    return arr;
  }, [start, end, totalDays, cfg.dayWidth, zoom]);

  const rows = useMemo(() =>
    tasks.filter(t => t.due_date).sort((a, b) => a.due_date.localeCompare(b.due_date))
  , [tasks]);

  const todayOffset = differenceInDays(today, start) * cfg.dayWidth;
  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-zinc-200">
        <div className="flex gap-1 bg-zinc-100 p-0.5 rounded-md">
          {Object.keys(ZOOMS).map(z => (
            <button key={z} onClick={() => setZoom(z)} data-testid={`zoom-${z}`}
              className={cn("px-3 py-1 text-xs font-medium rounded-md capitalize",
                zoom === z ? "bg-white shadow-sm text-zinc-900" : "text-zinc-600 hover:text-zinc-900")}>
              {z === "day" ? "Den" : z === "week" ? "Týden" : z === "month" ? "Měsíc" : "Rok"}
            </button>
          ))}
        </div>
        <div className="text-sm text-zinc-500">{format(start, "d. M. yyyy", { locale: cs })} — {format(end, "d. M. yyyy", { locale: cs })}</div>
      </div>

      <div className="flex overflow-hidden">
        <div className="w-56 flex-shrink-0 border-r border-zinc-200 bg-white sticky left-0 z-10">
          <div className="h-10 border-b border-zinc-200 px-3 flex items-center text-xs uppercase tracking-wider text-zinc-500 font-semibold">Úkol</div>
          {rows.map(t => (
            <div key={t.id} onClick={() => onOpen(t.id)}
              className="h-11 px-3 border-b border-zinc-100 flex items-center text-sm hover:bg-zinc-50 cursor-pointer truncate" data-testid="timeline-row-label">
              {t.title}
            </div>
          ))}
        </div>

        <div className="overflow-x-auto flex-1">
          <div style={{ width: totalWidth, minWidth: "100%" }} className="relative">
            <div className="h-10 border-b border-zinc-200 relative bg-zinc-50">
              {dayHeaders.map((h, i) => (
                <div key={i} className="absolute top-0 h-full flex items-center px-1.5 text-xs text-zinc-600 border-l border-zinc-200" style={{ left: h.offset }}>
                  {format(h.date, cfg.fmt, { locale: cs })}
                </div>
              ))}
            </div>

            {rows.map(t => {
              const st = statusById[t.status_id];
              const dueOffset = differenceInDays(parseISO(t.due_date), start) * cfg.dayWidth;
              const isOverdue = t.due_date < todayStr && st && !st.is_terminal;
              const asg = (t.assignee_ids || []).map(id => userById[id]).filter(Boolean);
              const pillWidth = Math.max(80, cfg.dayWidth * (zoom === "day" ? 2 : zoom === "week" ? 4 : 8));
              return (
                <div key={t.id} className="h-11 border-b border-zinc-100 relative">
                  {dayHeaders.map((h, i) => (
                    <div key={i} className="absolute top-0 h-full border-l border-zinc-100" style={{ left: h.offset }} />
                  ))}
                  <button
                    onClick={() => onOpen(t.id)}
                    data-testid="timeline-task-pill"
                    className={cn(
                      "absolute top-1.5 h-8 rounded-md px-2 flex items-center gap-1.5 text-xs font-medium shadow-sm hover:shadow-md transition-shadow overflow-hidden",
                      isOverdue && "ring-2 ring-red-400"
                    )}
                    style={{
                      left: Math.max(0, dueOffset - pillWidth + cfg.dayWidth / 2),
                      width: pillWidth,
                      background: st ? `${st.color}22` : "#f4f4f5",
                      color: st?.color || "#3f3f46",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st?.color }} />
                    <span className="truncate">{t.title}</span>
                  </button>
                </div>
              );
            })}

            {todayOffset >= 0 && todayOffset <= totalWidth && (
              <div className="absolute top-0 bottom-0 border-l-2 border-red-500 pointer-events-none" style={{ left: todayOffset }}>
                <span className="absolute -top-0.5 -left-6 text-[10px] text-red-500 font-semibold bg-white px-1">Dnes</span>
              </div>
            )}

            {rows.length === 0 && (
              <div className="p-10 text-center text-sm text-zinc-500">Žádné úkoly s termínem</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
