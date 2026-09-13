import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchRequesters, type Requester } from "../api.js";

// The selected Development Requester, held in React context and persisted in
// localStorage (BR-12, C-32). This is a Lab 2 testing mechanism standing in for
// login until Lab 3 (BR-03): nothing here is an authenticated identity, and the
// backend re-checks ownership on every request regardless of what is stored.

export const STORAGE_KEY = "toktickit.requesterId";

export type LoadState = "loading" | "ready" | "error";

export interface RequesterContextValue {
  loadState: LoadState;
  requesters: Requester[];
  selected: Requester | null;
  /** True when a stored selection was cleared on boot because that Requester is gone (BR-13). */
  staleNotice: boolean;
  select: (id: number) => void;
  clearSelection: () => void;
  reload: () => void;
}

const RequesterContext = createContext<RequesterContextValue | null>(null);

function readStoredId(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function writeStoredId(id: number | null): void {
  try {
    if (id === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // storage unavailable: the selection still lives in memory for this session
  }
}

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selected, setSelected] = useState<Requester | null>(null);
  const [staleNotice, setStaleNotice] = useState(false);
  const [loadToken, setLoadToken] = useState(0);

  // Boot, and every Retry: load the active list, then re-validate the stored
  // selection against it (BR-13). On failure nothing is stored (BR-18).
  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");

    fetchRequesters().then(
      (list) => {
        if (cancelled) return;
        setRequesters(list);
        const storedId = readStoredId();
        if (storedId !== null) {
          const match = list.find((r) => r.id === storedId);
          if (match) {
            setSelected(match);
          } else {
            writeStoredId(null);
            setSelected(null);
            setStaleNotice(true);
          }
        }
        setLoadState("ready");
      },
      () => {
        if (cancelled) return;
        setRequesters([]);
        setLoadState("error");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [loadToken]);

  const select = useCallback(
    (id: number) => {
      const match = requesters.find((r) => r.id === id);
      if (!match) return;
      writeStoredId(match.id);
      setSelected(match);
      setStaleNotice(false);
    },
    [requesters],
  );

  const clearSelection = useCallback(() => {
    writeStoredId(null);
    setSelected(null);
    setStaleNotice(false);
  }, []);

  const reload = useCallback(() => setLoadToken((n) => n + 1), []);

  return (
    <RequesterContext.Provider
      value={{ loadState, requesters, selected, staleNotice, select, clearSelection, reload }}
    >
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester(): RequesterContextValue {
  const value = useContext(RequesterContext);
  if (!value) throw new Error("useRequester must be used inside <RequesterProvider>");
  return value;
}
