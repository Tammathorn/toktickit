// Requester Ticket Detail - placeholder route target for /tickets/:id.
// The read-only detail and the attachment lifecycle land with Issue #15.
export default function TicketDetail({ id }: { id: number }) {
  return (
    <section aria-labelledby="ticket-detail-title">
      <h1 id="ticket-detail-title" className="tk-title">Ticket Detail</h1>
      <p className="tk-muted">Ticket id {id}</p>
    </section>
  );
}
