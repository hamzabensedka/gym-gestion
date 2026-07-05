export default function AppLoading() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+3.25rem)] z-10 h-0.5 overflow-hidden rounded-full bg-border lg:hidden"
    >
      <div className="h-full w-1/3 animate-[loading-bar_0.8s_ease-in-out_infinite] rounded-full bg-brand" />
    </div>
  );
}
