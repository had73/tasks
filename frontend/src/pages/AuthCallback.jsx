import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = location.hash || window.location.hash;
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { navigate("/login"); return; }
    const sessionId = m[1];
    api.post("/auth/google/session", null, { headers: { "X-Session-ID": sessionId } })
      .then((r) => {
        setUser(r.data);
        window.history.replaceState(null, "", "/");
        navigate("/");
        toast.success("Přihlášeno pomocí Google");
      })
      .catch((e) => {
        toast.error(apiError(e));
        navigate("/login");
      });
  }, [location, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-zinc-500">Přihlašování…</div>
    </div>
  );
}
