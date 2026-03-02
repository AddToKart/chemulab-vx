import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="mainContent">
      {/* ── Hero Banner ── */}
      <section className="flex items-center justify-between gap-12 p-10 md:p-14 mb-10 bg-card border border-border rounded-3xl shadow-sm relative overflow-hidden flex-col md:flex-row text-center md:text-left">
        <div className="flex-1 min-w-[220px] relative z-[2]">
          <h1 className="m-0 mb-5 text-4xl md:text-5xl lg:text-[3.25rem] text-foreground font-extrabold leading-[1.1] tracking-tight">
            Learn Chemistry Through Play
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-[580px] leading-relaxed mb-10 mx-auto md:mx-0">
            Discover elements, combine them to create new reactions, and save your progress. Friendly for beginners and fun for learners of all ages.
          </p>
          <div className="flex gap-4 flex-wrap justify-center md:justify-start">
            <Link
              href="/elements"
              className="px-8 py-3.5 bg-primary text-primary-foreground no-underline font-semibold text-base md:text-lg rounded-full shadow-sm hover:bg-primary/90 transition-all duration-200 active:scale-95"
            >
              Start Exploring
            </Link>
            <Link
              href="/lab"
              className="px-8 py-3.5 bg-background text-foreground border border-border no-underline font-semibold text-base md:text-lg rounded-full hover:bg-muted transition-all duration-200 active:scale-95 shadow-sm"
            >
              Your Lab
            </Link>
          </div>
        </div>

        <div className="w-[240px] md:w-[280px] flex justify-center items-center shrink-0 relative">
          <div className="absolute w-[200px] h-[200px] bg-primary/20 rounded-full blur-[60px] animate-[pulse_4s_ease-in-out_infinite]" />
          <Image
            src="/img/jepoy.png"
            alt="Popoy"
            width={280}
            height={280}
            priority
            className="max-w-full h-auto drop-shadow-xl relative z-[1] hover:scale-105 transition-transform duration-500"
          />
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <div className="flex gap-5 flex-wrap mb-8">
        {[
          { href: '/elements', emoji: '⚗️', title: 'Start Discovery', desc: 'Explore elements and try combinations', accent: 'bg-blue-500' },
          { href: '/lab', emoji: '🧪', title: 'Your Lab', desc: 'View and manage your discovered elements', accent: 'bg-primary' },
          { href: '/progress', emoji: '📈', title: 'Progress', desc: 'Check your learning progress and milestones', accent: 'bg-orange-500' },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex-1 min-w-[240px] flex flex-col gap-2 p-6 bg-card border border-border rounded-2xl shadow-sm no-underline group hover:bg-muted/50 hover:border-primary transition-all duration-300 relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${card.accent}`} />
            <div className="flex justify-between items-center pl-2">
              <strong className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{card.emoji}</span> <span>{card.title}</span>
              </strong>
              <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 text-xl text-primary transition-all duration-300">→</span>
            </div>
            <span className="text-muted-foreground text-sm pl-2">{card.desc}</span>
          </Link>
        ))}
      </div>

      {/* ── Recent Activity ── */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-foreground tracking-tight">Recent Activity</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 bg-card px-6 py-4 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary transition-all duration-200">
            <div className="text-2xl w-10 h-10 flex items-center justify-center bg-muted rounded-full shrink-0">🎉</div>
            <div className="flex flex-col flex-1">
              <strong className="text-base text-foreground font-semibold">Welcome to CheMuLab!</strong>
              <span className="text-sm text-muted-foreground">Started your chemistry journey</span>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Just now</span>
          </div>
        </div>
      </section>
    </div>
  );
}