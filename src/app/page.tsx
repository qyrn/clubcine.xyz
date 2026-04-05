import Player from "@/components/Player";
import NowPlaying from "@/components/NowPlaying";
import Schedule from "@/components/Schedule";
import Chat from "@/components/Chat";
import ViewerCount from "@/components/ViewerCount";

export default function Home() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-[var(--font-display)] text-accent text-sm animate-[glow-pulse_3s_ease-in-out_infinite]">
            TV.QYRN
          </h1>
          <span className="text-text-dim text-[10px] hidden sm:inline">
            cinema underground 24/7
          </span>
        </div>
        <ViewerCount />
      </header>

      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0">
            <Player />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 shrink-0 border-t border-border">
            <NowPlaying />
            <Schedule />
          </div>
        </div>

        <aside className="w-full lg:w-80 lg:border-l border-t lg:border-t-0 border-border flex flex-col h-[300px] lg:h-auto shrink-0 lg:shrink">
          <Chat />
        </aside>
      </main>

      <footer className="px-4 py-1.5 border-t border-border bg-surface shrink-0">
        <p className="text-text-dim text-[10px] text-center font-mono">
          signal pirate &mdash; cinema de contrebande
        </p>
      </footer>
    </div>
  );
}
