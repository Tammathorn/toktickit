import { Link } from "../router.js";

// ui-spec.md section 20.1 - the Not found state: heading
// "That item does not exist.", a body naming what was addressed, and a
// secondary link back to the list. A different component from Forbidden
// (C-65): a 404 renders this, a 403 renders Forbidden - the API's status
// decides, never the client's guess. role="alert" so the refusal is announced
// on arrival, as the earlier panel was.
export default function NotFound({ what, backTo, backLabel }: { what: string; backTo: string; backLabel: string }) {
  return (
    <div className="tk-forbidden tk-not-found" role="alert">
      <div className="card tk-card tk-forbidden-card">
        <h1 className="tk-title">That item does not exist.</h1>
        <p>{what}</p>
        <Link to={backTo} className="btn btn-secondary">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
