import { useEffect } from "react";
import { RouterProvider, useRouter } from "./router.js";
import { AuthProvider, useAuth } from "./auth/AuthContext.js";
import { LANDING, mayReach, type Destination } from "./auth/roles.js";
import type { UserRole } from "./api.js";
import AppShell from "./components/AppShell.js";
import Forbidden from "./components/Forbidden.js";
import Login from "./pages/Login.js";
import ChangePassword from "./pages/ChangePassword.js";
import MyTickets from "./pages/MyTickets.js";
import CreateTicket from "./pages/CreateTicket.js";
import TicketDetail from "./pages/TicketDetail.js";
import StaffTicketQueue from "./pages/StaffTicketQueue.js";
import StaffTicketDetail from "./pages/StaffTicketDetail.js";
import SystemCheck from "./pages/SystemCheck.js";

// Route table and guards (ui-spec.md 1, 9; C-85). /system-check is the Lab 1
// screen and stays public (C-87). Every other address passes three guards, in
// the order the server checks the same things (C-63):
//   1. no session              -> Login, at the address asked for, so the
//                                 screen behind it never renders (FR-07)
//   2. a password change owed  -> Change Password, whatever the address (FR-14)
//   3. a destination the role may not use -> Forbidden inside the shell, and
//                                 nothing is fetched for it (FR-24)
// "/" and any unknown address go to the role's landing screen (ui-spec 9.1).
// The guards are feedback; the server's 401 and 403 are the control (BR-20,
// BR-40).

type Match = { destination: Destination; ticketId?: number } | null;

function match(path: string): Match {
  if (path === "/tickets") return { destination: "myTickets" };
  if (path === "/tickets/new") return { destination: "createTicket" };
  const detail = /^\/tickets\/(\d+)$/.exec(path);
  if (detail) return { destination: "ticketDetail", ticketId: Number(detail[1]) };
  if (path === "/queue") return { destination: "queue" };
  const staffDetail = /^\/queue\/(\d+)$/.exec(path);
  if (staffDetail) return { destination: "staffTicketDetail", ticketId: Number(staffDetail[1]) };
  if (path === "/users") return { destination: "users" };
  return null;
}

function GoToLanding({ role }: { role: UserRole }) {
  const { navigate } = useRouter();
  useEffect(() => navigate(LANDING[role], { replace: true }), [navigate, role]);
  return null;
}

// IT Staff Ticket Detail (#42) and User Management (#43) are built in their
// own Issues. Until then their routes exist, with their role rules, so the
// Queue's row link, the navigation, the landing screen and the Forbidden
// state can all be built and tested now.
function ScreenTitle({ title }: { title: string }) {
  return <h1 className="tk-title">{title}</h1>;
}

function Screen() {
  const { path } = useRouter();
  const { state } = useAuth();

  if (path === "/system-check") return <SystemCheck />;
  if (state.status === "loading") return <main className="tk-auth" aria-busy="true" />;
  if (state.status === "anonymous") return <Login sessionEnded={state.sessionEnded} />;
  const { user } = state;
  if (user.mustChangePassword) return <ChangePassword />;

  const found = match(path);
  if (!found) return <GoToLanding role={user.role} />;

  let screen;
  if (!mayReach(user.role, found.destination)) screen = <Forbidden />;
  else if (found.destination === "myTickets") screen = <MyTickets />;
  else if (found.destination === "createTicket") screen = <CreateTicket />;
  else if (found.destination === "ticketDetail") screen = <TicketDetail id={found.ticketId!} />;
  else if (found.destination === "queue") screen = <StaffTicketQueue />;
  else if (found.destination === "staffTicketDetail") screen = <StaffTicketDetail id={found.ticketId!} />;
  else screen = <ScreenTitle title="User Management" />;

  // Keyed by user, so a different person signing in starts every screen afresh
  // and nothing of the last user's data survives in memory (BR-14).
  return <AppShell key={user.id}>{screen}</AppShell>;
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <Screen />
      </AuthProvider>
    </RouterProvider>
  );
}
