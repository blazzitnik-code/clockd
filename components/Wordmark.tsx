export default function Wordmark({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "-0.03em",
        color: "var(--ink)",
      }}
    >
      cl
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: "0.62em",
          height: "0.62em",
          margin: "0 0.02em",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="100%"
          height="100%"
          style={{ position: "absolute", top: "0.14em" }}
        >
          <circle
            cx="12"
            cy="12"
            r="10.5"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2.4"
          />
          <path
            d="M12 6.5V12L16 14.5"
            stroke="var(--ink)"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>
      ckd
    </div>
  );
}
