/** "Built by Abielan Tech" credit shown at the bottom of every screen and the login page. */
export function BuiltBy({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-stone-500 ${className}`}>
      Built by{" "}
      <span className="font-display font-extrabold tracking-wide text-maroon">
        Abielan <span className="text-gold">Tech</span>
      </span>
    </p>
  );
}
