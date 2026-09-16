import { RouterProvider, useRouter } from "./router.js";
import { RequesterProvider, useRequester } from "./requester/RequesterContext.js";
import AppShell from "./components/AppShell.js";
import RequesterSelection from "./pages/RequesterSelection.js";
import MyTickets from "./pages/MyTickets.js";
import CreateTicket from "./pages/CreateTicket.js";
import TicketDetail from "./pages/TicketDetail.js";
import SystemCheck from "./pages/SystemCheck.js";

// Route table. /system-check is the Lab 1 screen (C-04) and is not
// Requester-scoped; every other path is, so without a valid selection the
// Selection screen renders instead of it (BR-15, FR-10, AC-02).
function Screen() {
  const { path } = useRouter();
  const { selected } = useRequester();

  if (path === "/system-check") return <SystemCheck />;
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
      <RequesterProvider>
        <Screen />
      </RequesterProvider>
    </RouterProvider>
  );
}
