import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "../api.js";
import type { AuthUser } from "../api.js";

// Who is signed in - Lab 3, ui-spec.md section 9.2. The client asks
// GET /api/auth/me at start-up and holds the answer in React state only:
// nothing is written to localStorage, sessionStorage or a script cookie, so
// nothing about the user survives a logout or a closed tab (FR-11, BR-25). The
// session itself is the HttpOnly tt_session cookie, which script never sees.
//
// Any 401 AUTH_REQUIRED from any request ends the in-memory user and shows
// Login with the session-ended message (BR-34, FR-12).

export type AuthState =
  | { status: "loading" }
  | { status: "anonymous"; sessionEnded: boolean }
  | { status: "authenticated"; user: AuthUser };

interface AuthValue {
  state: AuthState;
  /** After a successful login. */
  signedIn: (user: AuthUser) => void;
  /** After a successful password change: the gate clears (FR-18). */
  passwordChanged: (user: AuthUser) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let live = true;
    api.fetchCurrentUser().then(
      (user) => live && setState(user ? { status: "authenticated", user } : { status: "anonymous", sessionEnded: false }),
      // The API could not be reached: show Login, whose own failure banner
      // takes over if signing in fails too.
      () => live && setState({ status: "anonymous", sessionEnded: false }),
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => api.onSessionLost(() => setState({ status: "anonymous", sessionEnded: true })), []);

  // The server says a password change is owed: re-read who this is, and the
  // gate shows Change Password (ui-spec 6.2, BR-19).
  useEffect(
    () =>
      api.onPasswordChangeRequired(() => {
        api.fetchCurrentUser().then(
          (user) => user && setState({ status: "authenticated", user }),
          () => undefined,
        );
      }),
    [],
  );

  const signedIn = useCallback((user: AuthUser) => setState({ status: "authenticated", user }), []);
  const passwordChanged = useCallback((user: AuthUser) => setState({ status: "authenticated", user }), []);

  // The user is forgotten only once the server has ended the session, so a
  // failed logout never pretends the session is over (BR-23).
  const signOut = useCallback(async () => {
    await api.logout();
    setState({ status: "anonymous", sessionEnded: false });
  }, []);

  return <AuthContext.Provider value={{ state, signedIn, passwordChanged, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

/** The signed-in user. Only for screens rendered behind the authentication gate. */
export function useCurrentUser(): AuthUser {
  const { state } = useAuth();
  if (state.status !== "authenticated") throw new Error("useCurrentUser needs a signed-in user");
  return state.user;
}
