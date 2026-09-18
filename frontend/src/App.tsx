import { Navigate, Route, Routes } from "react-router-dom";
import { PacketPage } from "./features/packet/PacketPage";
import { QueuePage } from "./features/queue/QueuePage";

/**
 * Two-route wiring for Queue master-detail and the sealed Packet page.
 * AppShell (owned elsewhere) can replace this file by importing the same two pages.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/queue" replace />} />
      <Route path="/queue" element={<QueuePage />} />
      <Route path="/queue/:sourceId" element={<QueuePage />} />
      <Route path="/packet/:sourceId" element={<PacketPage />} />
    </Routes>
  );
}
