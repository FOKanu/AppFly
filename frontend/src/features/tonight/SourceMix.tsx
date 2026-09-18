import type { SourceChannel } from "./types";

const CHANNELS: { id: SourceChannel; label: string; hint: string }[] = [
  { id: "api", label: "API", hint: "Arbeitsagentur" },
  { id: "rss", label: "RSS", hint: "allowed feeds" },
  { id: "clips", label: "clips", hint: "_inbox/" },
];

/**
 * Ingest mix for last night: API · RSS · clips. Does not fetch listing URLs.
 */
export function SourceMix({ mix }: { mix: Record<SourceChannel, number> }) {
  const total = CHANNELS.reduce((sum, channel) => sum + (mix[channel.id] ?? 0), 0) || 1;
  return (
    <section className="panel source-mix" aria-labelledby="source-mix-title">
      <p className="panel-kicker">Ingest</p>
      <h2 id="source-mix-title">Source mix</h2>
      <p className="source-legend">API · RSS · clips</p>
      <div className="source-bar" aria-hidden="true">
        {CHANNELS.map((channel) => (
          <span
            key={channel.id}
            className={`source-seg source-${channel.id}`}
            style={{ flexGrow: mix[channel.id] ?? 0 }}
          />
        ))}
      </div>
      <ul className="source-counts">
        {CHANNELS.map((channel) => (
          <li key={channel.id}>
            <span className={`swatch source-${channel.id}`} />
            <strong>{channel.label}</strong>
            <span className="muted">{channel.hint}</span>
            <b>{mix[channel.id] ?? 0}</b>
            <small>{Math.round(((mix[channel.id] ?? 0) / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
