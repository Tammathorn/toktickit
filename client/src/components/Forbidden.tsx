import { useCurrentUser } from "../auth/AuthContext.js";
import { LANDING, LANDING_LABEL } from "../auth/roles.js";
import { Link } from "../router.js";

// ui-spec.md section 20.1 - the forbidden state: a centred card inside the
// shell, never a blank screen or a generic error (FR-24). It is rendered in
// place of the screen the role may not use, so no data is ever fetched for
// that screen (AC-97). Forbidden and Not found are different components:
// this one is chosen by role, and by a 403 from the API.
export default function Forbidden() {
  const user = useCurrentUser();
  return (
    <div className="tk-forbidden">
      <div className="card tk-card tk-forbidden-card">
        <h1 className="tk-title">You do not have access to that page.</h1>
        <p>Your role does not allow this. Choose a destination from the menu above.</p>
        <Link to={LANDING[user.role]} className="btn btn-primary">
          Go to {LANDING_LABEL[user.role]}
        </Link>
      </div>
    </div>
  );
}
