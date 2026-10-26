/** "Built by Abielan Tech" credit shown at the bottom of every screen and the login page. */
export function BuiltBy({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-stone-500 ${className}`}>
      Built by{" "}
      <a
        href="https://www.abielan.in"
        target="_blank"
        rel="noopener"
        className="font-display font-extrabold tracking-wide text-maroon underline-offset-2 hover:underline"
      >
        Abielan <span className="text-gold">Tech</span>
      </a>
    </p>
  );
}
