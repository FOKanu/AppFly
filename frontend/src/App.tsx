import { Navigate, Route, Routes } from "react-router-dom";
import { SettingsPage } from "./features/settings/SettingsPage";

/**
 * Copilot web shell. Settings is the only routed screen until the shared
 * frontend foundation lands; keep additional wiring to a Route + Navigate.
 */
export function App() {
  return (
    <Routes>
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  );
}
