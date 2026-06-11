export function NotFound({ message }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="mono text-xs uppercase tracking-widest text-walnut">404</div>
      <h1 className="font-prata text-3xl text-aubergine mt-2">Page not found</h1>
      <p className="text-sm text-ink/60 mt-3 max-w-md">{message || "This page does not exist."}</p>
    </div>
  );
}
