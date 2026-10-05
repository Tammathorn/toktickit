// ui-spec.md section 5 - the red asterisk, hidden from screen readers, with the
// word "required" in the label's accessible name instead, so the colour is
// never the only signal. The same markup Create Ticket uses.
export default function RequiredMarker() {
  return (
    <>
      {" "}
      <span className="tk-required" aria-hidden="true">*</span>
      <span className="visually-hidden"> (required)</span>
    </>
  );
}
