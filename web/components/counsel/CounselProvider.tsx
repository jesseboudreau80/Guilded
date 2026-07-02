"use client";

import {
  createContext, useCallback, useContext,
  useEffect, useReducer, useRef, type ReactNode,
} from "react";

// ── Message type ──────────────────────────────────────────────────────────────

export type CounselMessage = {
  id:      number;
  role:    "user" | "counsel";
  content: string;
};

// ── State & actions ───────────────────────────────────────────────────────────

type State = {
  isOpen:   boolean;
  messages: CounselMessage[];
  loading:  boolean;
};

type Action =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "TOGGLE" }
  | { type: "ADD_MESSAGE"; message: CounselMessage }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "INIT"; state: Partial<State> }
  | { type: "CLEAR_MESSAGES" };

const INITIAL_STATE: State = {
  isOpen:   false,
  messages: [],
  loading:  false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN":    return { ...state, isOpen: true };
    case "CLOSE":   return { ...state, isOpen: false };
    case "TOGGLE":  return { ...state, isOpen: !state.isOpen };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message].slice(-20) };
    case "SET_LOADING": return { ...state, loading: action.loading };
    case "INIT":    return { ...state, ...action.state };
    case "CLEAR_MESSAGES": return { ...state, messages: [] };
    default: return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

type CounselContextValue = {
  state:       State;
  open:        () => void;
  close:       () => void;
  toggle:      () => void;
  addMessage:  (msg: Omit<CounselMessage, "id">) => void;
  setLoading:  (loading: boolean) => void;
  clearMessages: () => void;
};

const CounselContext = createContext<CounselContextValue | null>(null);

export function useCounsel() {
  const ctx = useContext(CounselContext);
  if (!ctx) throw new Error("useCounsel must be used inside CounselProvider");
  return ctx;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_KEY = "guilded:counsel";

function loadFromStorage(): Partial<State> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      // Never restore open state — always start closed to prevent surprise
      // full-screen overlays on mobile after navigation or refresh.
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-15) : [],
    };
  } catch {
    return {};
  }
}

function saveToStorage(state: State) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      isOpen:   state.isOpen,
      messages: state.messages.slice(-15),
    }));
  } catch { /* storage unavailable */ }
}

// ── Provider ──────────────────────────────────────────────────────────────────

let msgIdCounter = 0;

export function CounselProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const initialized = useRef(false);

  // Hydrate from localStorage on first mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = loadFromStorage();
    if (Object.keys(saved).length > 0) {
      dispatch({ type: "INIT", state: saved });
    }
  }, []);

  // Persist to localStorage on every state change
  useEffect(() => {
    if (!initialized.current) return;
    saveToStorage(state);
  }, [state]);

  const open        = useCallback(() => dispatch({ type: "OPEN" }), []);
  const close       = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const toggle      = useCallback(() => dispatch({ type: "TOGGLE" }), []);
  const setLoading  = useCallback((loading: boolean) =>
    dispatch({ type: "SET_LOADING", loading }), []);
  const clearMessages = useCallback(() => dispatch({ type: "CLEAR_MESSAGES" }), []);

  const addMessage = useCallback((msg: Omit<CounselMessage, "id">) => {
    msgIdCounter += 1;
    dispatch({ type: "ADD_MESSAGE", message: { id: msgIdCounter, ...msg } });
  }, []);

  return (
    <CounselContext.Provider value={{ state, open, close, toggle, addMessage, setLoading, clearMessages }}>
      {children}
    </CounselContext.Provider>
  );
}
