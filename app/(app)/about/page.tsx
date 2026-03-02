export default function AboutPage() {
  const featureCards = [
    { icon: '⚗️', title: 'Interactive Lab', desc: 'Begin experimenting with high-fidelity chemical reactions in your personal workspace. Discover hundreds of unique combinations.', accent: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
    { icon: '📖', title: 'Element Database', desc: 'Explore a comprehensive, high-detail periodic table. Learn about atomic properties, history, and usage of every element.', accent: 'rgba(14,165,233,0.15)', border: 'rgba(14,165,233,0.3)' },
    { icon: '🎮', title: 'Gamified Learning', desc: 'Master your chemistry knowledge through addictive mini-games. Compete for the highest scores on global leaderboards.', accent: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
    { icon: '🤝', title: 'Social Science', desc: 'Team up with friends, compare chemical discoveries, and enjoy a shared learning journey in our growing community.', accent: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
  ];

  return (
    <div>
      <h1 className="text-[2rem] font-extrabold text-[var(--text-main)] mb-6 tracking-tight">About CheMuLab</h1>

      <section className="bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[28px] p-10 relative overflow-hidden shadow-[var(--shadow-md)]">
        <span className="absolute top-5 right-10 text-[3rem] opacity-20 pointer-events-none select-none animate-bounce">🧪</span>
        <span className="absolute top-[4.5rem] right-[3.5rem] text-[2rem] opacity-15 pointer-events-none select-none">⚛️</span>

        <h2 className="text-[1.5rem] font-bold text-[var(--text-main)] mb-3">Welcome to CheMuLab!</h2>
        <p className="text-[var(--text-light)] leading-relaxed mb-8 max-w-2xl">
          CheMuLab remains the ultimate interactive chemistry learning platform that bridges the gap between complex science and engaging education. Whether you&apos;re a student, a teacher, or a lifelong learner, this is your reactive playground.
        </p>

        <div className="grid grid-cols-2 gap-5 mb-8 max-[700px]:grid-cols-1">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="p-6 rounded-[20px] border transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[var(--shadow-lg)]"
              style={{ background: card.accent, borderColor: card.border }}
            >
              <div className="text-[2.5rem] mb-3">{card.icon}</div>
              <h4 className="font-bold text-[var(--text-main)] text-lg mb-2">{card.title}</h4>
              <p className="text-[var(--text-light)] text-sm leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-[rgba(16,185,129,0.1)] to-[rgba(14,165,233,0.1)] border border-[rgba(16,185,129,0.2)] rounded-[20px] p-8 mb-8">
          <h3 className="font-bold text-[var(--text-main)] text-xl mb-3">Our Mission</h3>
          <p className="text-[var(--text-light)] leading-relaxed">
            To provide a state-of-the-art educational environment that transforms the way people perceive science through a fusion of premium design, agentic technology, and scientific rigor.
          </p>
        </div>
      </section>
    </div>
  );
}
