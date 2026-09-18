/**
 * Purpose: Providers and router only. Feature screens live under src/features/.
 * Inputs: APP_ROUTES from routes.ts.
 * Returns: Root React element.
 * Does not: Call Gemini, Apify, or read the Obsidian vault.
 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { APP_ROUTES } from "../routes";
import { AppShell } from "./layout/AppShell";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          {APP_ROUTES.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<PlaceholderScreen title={route.title} feature={route.feature} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function PlaceholderScreen({ title, feature }: { title: string; feature: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>
        Scaffold only. Implement this screen in{" "}
        <code>frontend/src/features/{feature}/</code> and wire it in{" "}
        <code>frontend/src/app/App.tsx</code>.
      </p>
    </section>
  );
}
