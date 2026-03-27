import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="mainContent space-y-6">
      <section className="relative mb-8 flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-sm sm:p-8 lg:flex-row lg:gap-12 lg:p-12 lg:text-left">
        <div className="relative z-[2] min-w-0 flex-1">
          <h1 className="m-0 mb-5 text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-[3.25rem]">
            Learn Chemistry Through Play
          </h1>
          <p className="mx-auto mb-8 max-w-[36rem] text-base font-medium leading-relaxed text-muted-foreground sm:text-lg lg:mx-0 lg:text-xl">
            Discover elements, combine them to create new reactions, and save your progress. Friendly for beginners and fun for learners of all ages.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 lg:justify-start">
            <Link
              href="/elements"
              className="rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground no-underline shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-95 sm:px-8 sm:py-3.5 sm:text-lg"
            >
              Start Exploring
            </Link>
            <Link
              href="/lab"
              className="rounded-full border border-border bg-background px-6 py-3 text-base font-semibold text-foreground no-underline shadow-sm transition-all duration-200 hover:bg-muted active:scale-95 sm:px-8 sm:py-3.5 sm:text-lg"
            >
              Your Lab
            </Link>
          </div>
        </div>

        <div className="relative flex w-[11rem] shrink-0 items-center justify-center sm:w-[14rem] lg:w-[17.5rem]">
          <div className="absolute h-[10rem] w-[10rem] rounded-full bg-primary/20 blur-[60px] animate-[pulse_4s_ease-in-out_infinite] sm:h-[12rem] sm:w-[12rem]" />
          <Image
            src="/img/jepoy.png"
            alt="Popoy"
            width={280}
            height={280}
            priority
            className="relative z-[1] h-auto max-w-full drop-shadow-xl transition-transform duration-500 hover:scale-105"
          />
        </div>
      </section>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { href: '/elements', emoji: '⚗️', title: 'Start Discovery', desc: 'Explore elements and try combinations', accent: 'bg-blue-500' },
          { href: '/lab', emoji: '🧪', title: 'Your Lab', desc: 'View and manage your discovered elements', accent: 'bg-primary' },
          { href: '/progress', emoji: '📈', title: 'Progress', desc: 'Check your learning progress and milestones', accent: 'bg-orange-500' },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative flex min-h-[11rem] flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-card p-6 no-underline shadow-sm transition-all duration-300 hover:border-primary hover:bg-muted/50"
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${card.accent}`} />
            <div className="flex items-center justify-between pl-2">
              <strong className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                <span>{card.emoji}</span> <span>{card.title}</span>
              </strong>
              <span className="-translate-x-2 text-xl text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">→</span>
            </div>
            <span className="pl-2 text-sm text-muted-foreground">{card.desc}</span>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Recent Activity</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md sm:px-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-2xl">🎉</div>
            <div className="min-w-0 flex-1">
              <strong className="text-base font-semibold text-foreground">Welcome to CheMuLab!</strong>
              <div className="text-sm text-muted-foreground">Started your chemistry journey</div>
            </div>
            <span className="text-xs whitespace-nowrap text-muted-foreground">Just now</span>
          </div>
        </div>
      </section>
    </div>
  );
}
