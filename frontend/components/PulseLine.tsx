"use client";

/**
 * PulseLine — the product's signature visual motif.
 *
 * Two modes:
 *  - "brand": a continuous animated heartbeat trace used next to the logo.
 *  - "journey": a static trace whose single spike height is driven by real
 *    latency data, used as the connector between Payment Journey stages.
 *    A slow stage produces a taller/sharper spike — the visual literally
 *    encodes the telemetry rather than just decorating the brand name.
 */
export function PulseLine({
  mode = "brand",
  intensity = 0.4,
  color = "#6366F1",
  width = 64,
  height = 20,
  className = "",
}: {
  mode?: "brand" | "journey";
  intensity?: number; // 0..1, how sharp/tall the spike is
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const midY = height / 2;
  const spike = Math.min(Math.max(intensity, 0), 1) * (height / 2 - 2);

  if (mode === "brand") {
    const path = `M0 ${midY} L${width * 0.28} ${midY} L${width * 0.36} ${midY - height * 0.32} L${width * 0.44} ${midY + height * 0.4} L${width * 0.52} ${midY - height * 0.18} L${width * 0.6} ${midY} L${width} ${midY}`;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 4"
          className="animate-pulse-line"
        />
      </svg>
    );
  }

  // journey mode: flat line -> single spike proportional to intensity -> flat line
  const path = `M0 ${midY} L${width * 0.38} ${midY} L${width * 0.46} ${midY - spike} L${width * 0.54} ${midY + spike * 0.6} L${width * 0.62} ${midY} L${width} ${midY}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
