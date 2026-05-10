export default function SoireesGrid() {
  return (
    <section
      id="soirees"
      className="px-10 py-15 border-b border-line max-md:px-5 max-md:py-10 scroll-mt-12"
    >
      <div className="flex justify-between items-baseline mb-8">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.16em]">
          Soirées · à venir
        </h2>
      </div>

      <div className="border border-line rounded-lg px-10 py-16 flex flex-col items-center text-center gap-3 max-md:px-6 max-md:py-12">
        <div className="font-mono font-semibold text-[10px] leading-none tracking-[0.16em] uppercase text-red">
          ★ Bientôt
        </div>
        <div className="font-bold text-[28px] leading-[1.1] tracking-[-0.02em] max-w-[520px]">
          Les soirées à thème arrivent
        </div>
        <p className="text-[14px] leading-[1.6] text-ink-2 max-w-[480px]">
          Nuits d&apos;auteurs, marathons, cycles par pays ou par décennie.
          Programmation en cours d&apos;écriture.
        </p>
      </div>
    </section>
  );
}
