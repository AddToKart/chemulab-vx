import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <div className="mainContent">
      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>
            <span className={styles.typewriter}>Learn Chemistry Through Play</span>
          </h1>
          <p className={styles.heroDescription}>
            Discover elements, combine them to create new reactions, and save
            your progress. Friendly for beginners and fun for learners of all
            ages.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/elements" className={styles.primaryBtn}>
              Start Exploring
            </Link>
            <Link href="/lab" className={styles.secondaryBtn}>
              Your Lab
            </Link>
          </div>
        </div>
        <div className={styles.heroImageWrapper}>
          <div className={styles.heroGlow}></div>
          <Image
            src="/img/jepoy.png"
            alt="Popoy"
            width={280}
            height={280}
            priority
            className={styles.popoyImage}
          />
        </div>
      </section>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <Link href="/elements" className={`${styles.quickActionCard} ${styles.cardElements}`}>
          <div className={styles.cardHeader}>
            <strong>&#128300; Start Discovery</strong>
            <span className={styles.arrowIcon}>→</span>
          </div>
          <span className={styles.muted}>
            Explore elements and try combinations
          </span>
        </Link>
        <Link href="/lab" className={`${styles.quickActionCard} ${styles.cardLab}`}>
          <div className={styles.cardHeader}>
            <strong>&#129514; Your Lab</strong>
            <span className={styles.arrowIcon}>→</span>
          </div>
          <span className={styles.muted}>
            View and manage your discovered elements
          </span>
        </Link>
        <Link href="/progress" className={`${styles.quickActionCard} ${styles.cardProgress}`}>
          <div className={styles.cardHeader}>
            <strong>&#128200; Progress</strong>
            <span className={styles.arrowIcon}>→</span>
          </div>
          <span className={styles.muted}>
            Check your learning progress and milestones
          </span>
        </Link>
      </div>

      {/* Recent Activity */}
      <section className={styles.recentActivity}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        <div className={styles.activityList}>
          <div className={styles.activityItem}>
            <div className={styles.activityIcon}>&#127881;</div>
            <div className={styles.activityDetails}>
              <strong>Welcome to CheMuLab!</strong>
              <span>Started your chemistry journey</span>
            </div>
            <span className={styles.activityTime}>Just now</span>
          </div>
        </div>
      </section>
    </div>
  );
}
