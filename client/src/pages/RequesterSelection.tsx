import { useState, type FormEvent } from "react";
import { useRequester } from "../requester/RequesterContext.js";

// Development Requester Selection — ui-spec.md section 10, LS 8.1.
// A testing mechanism that stands in for login until Lab 3 (BR-03). The screen
// precedes the shell: no header, a centred card on the page ground.
//
// Four states, driven by the context's load result:
//   loading  -> spinner, select and Continue disabled          (BR-16, AC-05)
//   populated-> select of active Requesters, Continue on choice
//   empty    -> no select, explanatory message, Continue off   (BR-17, AC-06)
//   failure  -> danger panel + Retry, nothing stored           (BR-18, AC-07)

export const DISCLAIMER =
  "Select a Development Requester to test requester-specific ticket behavior. " +
  "This is not a login screen. Authentication and role-based access will be introduced in Lab 3.";

export const EMPTY_MESSAGE =
  "No active Development Requester is available. Seed the database and reload.";

export const STALE_MESSAGE =
  "Your previous Development Requester is no longer available. Choose another.";

// ui-spec.md 6.1, INTERNAL_ERROR. The only text a failed request ever shows.
export const INTERNAL_ERROR_MESSAGE =
  "Something went wrong on our side. Your work has not been lost - please try again.";

export default function RequesterSelection() {
  const { loadState, requesters, staleNotice, select, reload } = useRequester();
  const [chosenId, setChosenId] = useState("");

  const isLoading = loadState === "loading";
  const isError = loadState === "error";
  const isEmpty = loadState === "ready" && requesters.length === 0;
  const isPopulated = loadState === "ready" && requesters.length > 0;
  const canContinue = isPopulated && chosenId !== "";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canContinue) return;
    select(Number(chosenId));
  }

  return (
    <main className="tk-selection">
      <form className="card tk-card tk-selection-card" onSubmit={handleSubmit} noValidate>
        <h1 className="tk-title">TokTickIT</h1>

        {staleNotice && (
          <div className="tk-callout tk-callout-warning" role="status">
            {STALE_MESSAGE}
          </div>
        )}

        <div className="tk-panel tk-panel-pale">
          <p className="mb-0">{DISCLAIMER}</p>
        </div>

        {isLoading && (
          <div className="tk-status d-flex align-items-center gap-2" role="status" aria-busy="true">
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
            <span>Loading Development Requesters…</span>
          </div>
        )}

        {isError && (
          <div className="tk-panel tk-panel-danger" role="alert" aria-live="assertive">
            <p>{INTERNAL_ERROR_MESSAGE}</p>
            <button type="button" className="btn btn-secondary" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        {isEmpty && (
          <div className="tk-panel tk-panel-empty" role="status">
            <p className="mb-0">{EMPTY_MESSAGE}</p>
          </div>
        )}

        {(isLoading || isPopulated) && (
          <div className="mb-3">
            <label htmlFor="requester-select" className="form-label tk-label">
              Development Requester
            </label>
            <select
              id="requester-select"
              className="form-select"
              value={chosenId}
              disabled={isLoading}
              onChange={(e) => setChosenId(e.target.value)}
            >
              <option value="">Choose a Development Requester</option>
              {requesters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="btn btn-primary w-100" disabled={!canContinue}>
          Continue
        </button>
      </form>
    </main>
  );
}
