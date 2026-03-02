import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="mainContent">
      {/* ── Hero Banner ── */}
      <section className="flex items-center justify-between gap-12 p-14 mb-10 bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[32px] shadow-[var(--shadow-lg)] relative overflow-hidden max-[768px]:flex-col max-[768px]:p-8 max-[768px]:text-center">
        <div className="flex-1 min-w-[220px] relative z-[2]">
          <h1 className="m-0 mb-5 text-[3.25rem] text-[var(--text-main)] font-extrabold leading-[1.05] tracking-[-0.04em] max-[768px]:text-[2rem]">
            <span className="inline-block overflow-hidden whitespace-nowrap border-r-[0.1em] border-[var(--accent-color)]" style={{ animation: 'typewriter 2.5s steps(30,end), blink 0.75s step-end infinite' }}>
              Learn Chemistry Through Play
            </span>
          </h1>
          <p className="text-[var(--text-main)] opacity-80 text-xl font-medium max-w-[580px] leading-relaxed mb-10 max-[768px]:text-base">
            Discover elements, combine them to create new reactions, and save your progress. Friendly for beginners and fun for learners of all ages.
          </p>
          <div className="flex gap-5 flex-wrap max-[768px]:justify-center">
            <Link
              href="/elements"
              className="relative overflow-hidden px-10 py-4 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white no-underline font-bold text-lg rounded-full shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:-translate-y-[3px] hover:shadow-[0_8px_25px_rgba(16,185,129,0.5)] hover:brightness-110 transition-all duration-300"
            >
              Start Exploring
            </Link>
            <Link
              href="/lab"
              className="px-10 py-4 bg-black/5 text-[var(--text-main)] border border-[var(--glass-border)] no-underline font-bold text-lg rounded-full hover:bg-white/20 transition-all duration-300"
            >
              Your Lab
            </Link>
          </div>
        </div>

        <div className="w-[280px] flex justify-center items-center shrink-0 relative max-[768px]:w-[200px]">
          <div className="absolute w-[200px] h-[200px] bg-[var(--accent-color)] rounded-full blur-[80px] opacity-30 animate-[pulseGlow_4s_infinite_alternate]" />
          <Image
            src="/img/jepoy.png"
            alt="Popoy"
            width={280}
            height={280}
            priority
            className="max-w-full h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.15)] relative z-[1] animate-[float_6s_ease-in-out_infinite]"
          />
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <div className="flex gap-5 flex-wrap mb-8">
        {[
          { href: '/elements', emoji: '⚗️', title: 'Start Discovery', desc: 'Explore elements and try combinations', accent: 'var(--color-flask-blue)' },
          { href: '/lab',      emoji: '🧪', title: 'Your Lab',        desc: 'View and manage your discovered elements', accent: 'var(--color-neon-green)' },
          { href: '/progress', emoji: '📈', title: 'Progress',        desc: 'Check your learning progress and milestones', accent: 'var(--color-reaction-orange)' },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex-1 min-w-[240px] flex flex-col gap-2 p-7 bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[20px] shadow-[var(--shadow-md)] no-underline text-[var(--text-main)] group hover:-translate-y-1.5 hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-lg)] transition-all duration-300"
            style={{ borderLeft: `4px solid ${card.accent}` }}
          >
            <div className="flex justify-between items-center">
              <strong className="text-xl font-extrabold tracking-[-0.02em] text-[var(--text-main)]">
                {card.emoji} {card.title}
              </strong>
              <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 text-xl text-[var(--accent-color)] transition-all duration-300">→</span>
            </div>
            <span className="text-[var(--text-main)] opacity-60 text-sm">{card.desc}</span>
          </Link>
        ))}
      </div>

      {/* ── Recent Activity ── */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-[var(--text-main)] tracking-[-0.02em]">Recent Activity</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 bg-[var(--bg-card)] backdrop-blur-[40px] px-6 py-4 rounded-[12px] border border-[var(--glass-border)] shadow-[var(--shadow-sm)] hover:translate-x-1 hover:shadow-[var(--shadow-md)] hover:border-l-4 hover:border-l-[var(--accent-color)] transition-all duration-200">
            <div className="text-2xl w-10 h-10 flex items-center justify-center bg-[var(--bg-item-active)] rounded-full shrink-0">🎉</div>
            <div className="flex flex-col flex-1">
              <strong className="text-base text-[var(--text-main)]">Welcome to CheMuLab!</strong>
              <span className="text-sm text-[var(--text-light)]">Started your chemistry journey</span>
            </div>
            <span className="text-xs text-[var(--text-light)] whitespace-nowrap">Just now</span>
          </div>
        </div>
      </section>
    </div>
  );
}