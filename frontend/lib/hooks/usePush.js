"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { ensureSubscribed, ensureUnsubscribed, getPushStatus, isPushSupported } from "../push";

export function usePush() {
  const [status, setStatus] = useState({
    supported: false,
    permission: "default",
    subscribed: false,
    loading: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setStatus({ supported: false, permission: "unsupported", subscribed: false, loading: false });
      return;
    }
    try {
      const s = await getPushStatus();
      setStatus({ ...s, loading: false });
    } catch {
      setStatus((p) => ({ ...p, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await ensureSubscribed(api);
      await refresh();
      return true;
    } catch (e) {
      setError(e?.code === "PERMISSION_DENIED" ? "Notifications blocked in browser settings." : e?.message || "Could not enable notifications.");
      await refresh();
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await ensureUnsubscribed(api);
      await refresh();
      return true;
    } catch (e) {
      setError(e?.message || "Could not disable notifications.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return { ...status, busy, error, subscribe, unsubscribe, refresh };
}
