import { RouterProvider, useRouter } from "./router.js";
import { RequesterProvider, useRequester } from "./requester/RequesterContext.js";
import { AuthProvider, useAuth } from "./auth/AuthContext.js";
import AppShell from "./components/AppShell.js";
import Login from "./pages/Login.js";
import ChangePassword from "./pages/ChangePassword.js";
import RequesterSelection from "./pages/RequesterSelection.js";
import MyTickets from "./pages/MyTickets.js";
import CreateTicket from "./pages/CreateTicket.js";
import TicketDetail from "./pages/TicketDetail.js";
import SystemCheck from "./pages/SystemCheck.js";

// Route table. /system-check is the Lab 1 screen (C-04) and stays public
// (C-87). Every other path sits behind two guards, in this order (ui-spec 1):
//   1. no session              -> Login, at the address asked for, so the
//                                 screen behind it is never rendered (FR-07)
//   2. a password change owed  -> Change Password, whatever the address (FR-14)
// The guards are feedback; the server's 401 and 403 are the control (BR-20).
// Behind them the Lab 2 Requester flow runs unchanged until #40 replaces the
// Development Requester selector with the signed-in identity.
function Screen() {
  const { path } = useRouter();
  const { state } = useAuth();
  const { selected } = useRequester();

  if (path === "/system-check") return <SystemCheck />;
  if (state.status === "loading") return <main className="tk-auth" aria-busy="true" />;
  if (state.status === "anonymous") return <Login sessionEnded={state.sessionEnded} />;
  if (state.user.mustChangePassword) return <ChangePassword />;
  if (!selected) return <RequesterSelection />;

  // Keying the shell by Requester id remounts every screen on a switch, which
  // discards A's data in memory and refetches for B (BR-14, AC-11).
  const detail = /^\/tickets\/(\d+)$/.exec(path);
  return (
    <AppShell key={selected.id}>
      {path === "/tickets/new" ? (
        <CreateTicket />
      ) : detail ? (
        <TicketDetail id={Number(detail[1])} />
      ) : (
        <MyTickets />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <RequesterProvider>
          <Screen />
        </RequesterProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
