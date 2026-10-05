// ui-spec.md section 20.1 - the Success state: a --tk-pale panel with a check
// icon and a sentence, announced politely; never colour alone. The same markup
// User Management uses, shared by the two Ticket Detail screens (C-119).
export default function SuccessPanel({ message }: { message: string }) {
  return (
    <div className="tk-panel tk-panel-pale tk-panel-success" role="status" aria-live="polite">
      <p>
        <svg className="tk-success-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M13.5 4.5 6.5 11.5 2.5 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>{" "}
        <span>{message}</span>
      </p>
    </div>
  );
}
