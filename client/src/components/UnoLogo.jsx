export default function UnoLogo({ size = "md", className = "" }) {
  const sizes = {
    sm: "h-12 w-[4.4rem] text-xl",
    md: "h-16 w-[5.8rem] text-3xl",
    lg: "h-[5.5rem] w-[8.2rem] text-5xl",
  };

  return (
    <div
      className={`uno-logo ${sizes[size] || sizes.md} ${className}`}
      aria-label="UNO"
    >
      <span>UNO</span>
    </div>
  );
}
