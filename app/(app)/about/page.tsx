import styles from "./page.module.css";

export default function AboutPage() {
  return (
    <div className="mainContent">
      <h1 className={styles.pageTitle}>About CheMuLab</h1>

      <section className={styles.aboutSection}>
        <span className={`${styles.decoration} ${styles.flask}`}>🧪</span>
        <span className={`${styles.decoration} ${styles.atom}`}>⚛️</span>

        <h2>Welcome to CheMuLab!</h2>
        <p>
          CheMuLab remains the ultimate interactive chemistry learning platform
          that bridges the gap between complex science and engaging education.
          Whether you&apos;re a student, a teacher, or a lifelong learner, this
          is your reactive playground.
        </p>

        <div className={styles.aboutGrid}>
          <div className={`${styles.featureCard} ${styles.cardInteractive}`}>
            <div className={styles.featureIcon}>⚗️</div>
            <h4>Interactive Lab</h4>
            <p>
              Begin experimenting with high-fidelity chemical reactions in your
              personal workspace. Discover hundreds of unique combinations.
            </p>
          </div>

          <div className={`${styles.featureCard} ${styles.cardDatabase}`}>
            <div className={styles.featureIcon}>📖</div>
            <h4>Element Database</h4>
            <p>
              Explore a comprehensive, high-detail periodic table. Learn about
              atomic properties, history, and usage of every element.
            </p>
          </div>

          <div className={`${styles.featureCard} ${styles.cardGamified}`}>
            <div className={styles.featureIcon}>🎮</div>
            <h4>Gamified Learning</h4>
            <p>
              Master your chemistry knowledge through addictive mini-games.
              Compete for the highest scores on global leaderboards.
            </p>
          </div>

          <div className={`${styles.featureCard} ${styles.cardSocial}`}>
            <div className={styles.featureIcon}>🤝</div>
            <h4>Social Science</h4>
            <p>
              Team up with friends, compare chemical discoveries, and enjoy a
              shared learning journey in our growing community.
            </p>
          </div>
        </div>

        <div className={styles.missionBlock}>
          <h3>Our Mission</h3>
          <p>
            To provide a state-of-the-art educational environment that transforms
            the way people perceive science through a fusion of premium design, agentic
            technology, and scientific rigor.
          </p>
        </div>

        <section className={styles.teamSection}>
          <h2>Meet the Team</h2>
          <p>The curious minds behind CheMuLab.</p>
          <div className={styles.teamGrid}>
            <div className={styles.teamCard}>
              <div className={styles.teamAvatar}>🧑‍🔬</div>
              <div className={styles.teamName}>Hans</div>
              <div className={styles.teamRole}>Founder & Alchemist</div>
            </div>
            <div className={styles.teamCard}>
              <div className={styles.teamAvatar}>🤖</div>
              <div className={styles.teamName}>Popoy AI</div>
              <div className={styles.teamRole}>Lab Assistant</div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
