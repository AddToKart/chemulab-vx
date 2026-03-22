'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/auth-store';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  FieldValue,
} from 'firebase/firestore';
import { Clock, MessageSquare, User as UserIcon } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch'; // Assuming Switch component exists, if not we can use a simple button or checkbox
import { cn } from '@/lib/utils';

interface ReviewVisibility {
  showUsername: boolean;
  showProfilePicture: boolean;
  showEmail: boolean;
}

interface Review {
  id: string; // This will be the userId
  rating: number;
  comment?: string;
  visibility: ReviewVisibility;
  authorName: string;
  authorPhoto?: string;
  authorEmail?: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

export default function AboutPage() {
  const { user, profile } = useAuthStore();
  
  // State for ratings
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visibility, setVisibility] = useState<ReviewVisibility>({
    showUsername: true,
    showProfilePicture: true,
    showEmail: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
    : 0;

  const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0,
  }));

  // Fetch reviews from Firestore
  useEffect(() => {
    const reviewsQuery = query(
      collection(db, 'reviews'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
      const reviewsData: Review[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
      setReviews(reviewsData);
    });

    return () => unsubscribe();
  }, []);

  // Pre-populate form if user has existing review
  useEffect(() => {
    if (!user) return;

    const userReview = reviews.find(r => r.id === user.uid);
    
    if (userReview) {
      setSelectedRating(userReview.rating);
      setComment(userReview.comment || '');
      
      // Check if anonymous (all visibility flags false)
      const isCurrentlyAnonymous = !userReview.visibility.showUsername 
                                && !userReview.visibility.showProfilePicture 
                                && !userReview.visibility.showEmail;
      
      setIsAnonymous(isCurrentlyAnonymous);
      
      if (!isCurrentlyAnonymous) {
        setVisibility(userReview.visibility);
      }
    } else {
      // Reset form if no review found
      setSelectedRating(0);
      setComment('');
      setIsAnonymous(false);
      setVisibility({ showUsername: true, showProfilePicture: true, showEmail: false });
    }
  }, [user, reviews]);

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!user || !user.emailVerified) {
      setSubmitStatus({ 
        type: 'error', 
        message: 'Please verify your email to submit a review.' 
      });
      return;
    }

    if (selectedRating === 0) {
      setSubmitStatus({ 
        type: 'error', 
        message: 'Please select a rating.' 
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const reviewRef = doc(db, 'reviews', user.uid);
      
      // Calculate final visibility based on isAnonymous state
      const finalVisibility = isAnonymous 
        ? { showUsername: false, showProfilePicture: false, showEmail: false }
        : visibility;

      const reviewData: {
        rating: number;
        comment?: string;
        visibility: ReviewVisibility;
        authorName: string;
        authorPhoto?: string;
        authorEmail?: string;
        createdAt?: FieldValue;
        updatedAt: FieldValue;
      } = {
        rating: selectedRating,
        visibility: finalVisibility,
        authorName: isAnonymous ? 'Anonymous' : profile?.username || 'Anonymous',
        updatedAt: serverTimestamp(),
      };

      if (comment.trim()) {
        reviewData.comment = comment.trim();
      }

      if (!isAnonymous) {
        if (profile?.photoURL) reviewData.authorPhoto = profile.photoURL;
        if (profile?.email) reviewData.authorEmail = profile.email;
      }

      // Check if user already has a review to determine create vs update
      const userReview = reviews.find(r => r.id === user.uid);
      if (!userReview) {
        reviewData.createdAt = serverTimestamp();
      }

      if (userReview) {
        await updateDoc(reviewRef, reviewData);
      } else {
        await setDoc(reviewRef, reviewData);
      }

      setSubmitStatus({ type: 'success', message: 'Review submitted successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSubmitStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: 'Failed to submit review. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle review deletion
  const handleDeleteReview = async () => {
    if (!user) return;

    if (confirm('Are you sure you want to delete your review?')) {
      try {
        await deleteDoc(doc(db, 'reviews', user.uid));
        
        // Reset form state
        setSelectedRating(0);
        setComment('');
        setIsAnonymous(false);
        setVisibility({ showUsername: true, showProfilePicture: true, showEmail: false });
        
        setSubmitStatus({ type: 'success', message: 'Review deleted successfully!' });
        setTimeout(() => setSubmitStatus({ type: null, message: '' }), 3000);
      } catch (error) {
        console.error('Error deleting review:', error);
        setSubmitStatus({ 
          type: 'error', 
          message: 'Failed to delete review. Please try again.' 
        });
      }
    }
  };

  // Helper to format timestamp
  const formatTime = (ts: { seconds: number; nanoseconds: number } | null) => {
    if (!ts) return 'Just now';
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if user is verified
  const isVerified = user?.emailVerified;
  const isSignedIn = !!user;
  const userReview = reviews.find(r => r.id === user?.uid);

  return (
    <div>
      <h1 className="text-[2rem] font-extrabold text-[var(--text-main)] mb-6 tracking-tight">About CheMuLab</h1>

      {/* About Section */}
      <section className="bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[28px] p-10 relative overflow-hidden shadow-[var(--shadow-md)]">
        <span className="absolute top-5 right-10 text-[3rem] opacity-20 pointer-events-none select-none animate-bounce">🧪</span>
        <span className="absolute top-[4.5rem] right-[3.5rem] text-[2rem] opacity-15 pointer-events-none select-none">⚛️</span>

        <h2 className="text-[1.5rem] font-bold text-[var(--text-main)] mb-3">Welcome to CheMuLab!</h2>
        <p className="text-[var(--text-light)] leading-relaxed mb-8 max-w-2xl">
          CheMuLab remains the ultimate interactive chemistry learning platform that bridges the gap between complex science and engaging education. Whether you are a student, a teacher, or a lifelong learner, this is your reactive playground.
        </p>

        <div className="grid grid-cols-2 gap-5 mb-8 max-[700px]:grid-cols-1">
          {[
            { icon: '⚗️', title: 'Interactive Lab', desc: 'Begin experimenting with high-fidelity chemical reactions in your personal workspace. Discover hundreds of unique combinations.', accent: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
            { icon: '📖', title: 'Element Database', desc: 'Explore a comprehensive, high-detail periodic table. Learn about atomic properties, history, and usage of every element.', accent: 'rgba(14,165,233,0.15)', border: 'rgba(14,165,233,0.3)' },
            { icon: '🎮', title: 'Gamified Learning', desc: 'Master your chemistry knowledge through addictive mini-games. Compete for the highest scores on global leaderboards.', accent: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
            { icon: '🤝', title: 'Social Science', desc: 'Team up with friends, compare chemical discoveries, and enjoy a shared learning journey in our growing community.', accent: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
          ].map((card) => (
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

      {/* Rating Section */}
      <section className="mt-8 bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[28px] p-10 relative overflow-hidden shadow-[var(--shadow-md)]">
        <h2 className="text-[1.5rem] font-bold text-[var(--text-main)] mb-6">Rate CheMuLab</h2>

        {/* Average Rating Display */}
        <div className="flex items-center gap-6 mb-8 p-6 bg-[var(--bg-sidebar)] rounded-[20px] border border-[var(--border-color)]">
          <div className="text-center">
            <div className="text-[3rem] font-bold text-[var(--accent-color)]">
              {averageRating.toFixed(1)}
            </div>
            <div className="text-[var(--text-light)] text-sm">
              out of 5.0
            </div>
          </div>
          <div className="flex-1">
            <StarRating rating={averageRating} readonly size="lg" />
            <div className="text-[var(--text-light)] text-sm mt-1">
              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </div>
          </div>
          {/* Rating Distribution */}
          <div className="flex-1 space-y-2">
            {ratingCounts.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-light)] w-4">{rating}</span>
                <div className="flex-1 h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-light)] w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Review Form */}
        <div className="mb-8">
          <h3 className="font-semibold text-[var(--text-main)] mb-4">
            {userReview ? 'Update Your Review' : 'Write a Review'}
          </h3>
          
          {!isSignedIn ? (
            <div className="p-6 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-[16px] text-center">
              <p className="text-[var(--text-light)]">
                Please <a href="/auth/sign-in" className="text-[var(--accent-color)] hover:underline">sign in</a> to submit a review.
              </p>
            </div>
          ) : !isVerified ? (
            <div className="p-6 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-[16px] text-center">
              <p className="text-[var(--text-light)]">
                Please verify your email address to submit a review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Star Rating Input */}
              <div className="flex items-center gap-4">
                <label className="text-[var(--text-light)] text-sm">Your Rating:</label>
                <StarRating 
                  rating={selectedRating} 
                  onRatingChange={setSelectedRating} 
                  size="lg"
                />
              </div>

              {/* Comment Input */}
              <div>
                <label className="text-[var(--text-light)] text-sm mb-2 block">Your Review (optional):</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with CheMuLab..."
                  className="resize-none"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-right text-xs text-[var(--text-light)] mt-1">
                  {comment.length}/500
                </div>
              </div>

              {/* Visibility Controls */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={isAnonymous} 
                      onCheckedChange={(checked: boolean) => {
                        setIsAnonymous(checked);
                        if (checked) {
                          // Option A: Destructive - reset visibility when turning on anonymous
                          setVisibility({ showUsername: false, showProfilePicture: false, showEmail: false });
                        } else {
                          // Reset to defaults when turning off anonymous
                          setVisibility({ showUsername: true, showProfilePicture: true, showEmail: false });
                        }
                      }} 
                    />
                    <label className="text-[var(--text-light)] text-sm cursor-pointer">Post Anonymously</label>
                  </div>
                  
                  {!isAnonymous && (
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-[var(--accent-color)] underline"
                    >
                      {showAdvanced ? 'Hide Options' : 'Advanced Options'}
                    </button>
                  )}
                </div>

                {/* Advanced Options (Indented, no border) */}
                {!isAnonymous && showAdvanced && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={visibility.showUsername} 
                        onCheckedChange={(checked: boolean) => setVisibility(prev => ({ ...prev, showUsername: checked }))} 
                      />
                      <label className="text-[var(--text-light)] text-sm cursor-pointer">Show Username</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={visibility.showProfilePicture} 
                        onCheckedChange={(checked: boolean) => setVisibility(prev => ({ ...prev, showProfilePicture: checked }))} 
                      />
                      <label className="text-[var(--text-light)] text-sm cursor-pointer">Show Profile Picture</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={visibility.showEmail} 
                        onCheckedChange={(checked: boolean) => setVisibility(prev => ({ ...prev, showEmail: checked }))} 
                      />
                      <label className="text-[var(--text-light)] text-sm cursor-pointer">Show Email</label>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Message */}
              {submitStatus.message && (
                <div className={cn(
                  "p-3 rounded-[12px] text-sm",
                  submitStatus.type === 'success' 
                    ? "bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-emerald-400" 
                    : "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-red-400"
                )}>
                  {submitStatus.message}
                </div>
              )}

              {/* Submit/Delete Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || selectedRating === 0}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : (userReview ? 'Update Review' : 'Submit Review')}
                </Button>
                
                {userReview && (
                  <Button
                    onClick={handleDeleteReview}
                    variant="destructive"
                    className="flex-shrink-0"
                  >
                    Delete Review
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div>
          <h3 className="font-semibold text-[var(--text-main)] mb-4">Community Reviews</h3>
          
          {reviews.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-light)]">
              <MessageSquare className="mx-auto mb-3 w-8 h-8 opacity-50" />
              <p>No reviews yet. Be the first to rate CheMuLab!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 bg-[var(--bg-sidebar)] rounded-[16px] border border-[var(--border-color)]"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {review.visibility.showProfilePicture && review.authorPhoto ? (
                      <Image
                        src={review.authorPhoto}
                        alt={review.authorName}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-[var(--text-light)]" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="font-medium text-[var(--text-main)]">
                            {review.visibility.showUsername ? review.authorName : 'Anonymous'}
                          </span>
                          {review.visibility.showEmail && review.authorEmail && (
                            <div className="text-xs text-[var(--text-light)] mt-0.5">
                              {review.authorEmail}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-light)]">
                          <Clock className="w-3 h-3" />
                          {formatTime(review.updatedAt)}
                        </div>
                      </div>
                      <StarRating rating={review.rating} readonly size="sm" />
                      {review.comment && (
                        <p className="text-[var(--text-light)] text-sm mt-2 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
