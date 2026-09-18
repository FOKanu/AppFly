/**
 * Purpose: Minimal chrome (title, nav, outlet). Not a product screen.
 * Inputs: Child routes via React Router Outlet; labels from APP_ROUTES.
 * Returns: Layout element.
 * Does not: Fetch jobs, store secrets, or implement feature UI.
 */
import { NavLink, Outlet } from "react-router-dom";

import { APP_ROUTES } from "../../routes";

export function AppShell() {
  return (
    <div>
      <header>
        <strong>Jobhunt Copilot</strong>
        <nav>
          {APP_ROUTES.map((route) => (
            <NavLink key={route.path} to={route.path} end={route.path === "/"}>
              {route.title}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
