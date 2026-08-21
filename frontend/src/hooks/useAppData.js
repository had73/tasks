import React, { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";

export function useAppData() {
  const [statuses, setStatuses] = useState([]);
  const [labels, setLabels] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = React.useCallback(async () => {
    try {
      const [s, l, u] = await Promise.all([
        api.get("/statuses").then(r => r.data),
        api.get("/labels").then(r => r.data),
        api.get("/users").then(r => r.data),
      ]);
      setStatuses(s); setLabels(l); setUsers(u);
    } catch (e) {
      console.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { statuses, labels, users, loading, reload };
}
