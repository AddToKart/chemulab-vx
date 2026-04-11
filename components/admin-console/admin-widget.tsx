'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { verifyAdminKey } from '@/lib/utils/admin-key';
import { 
  getUserDiscoveries, 
  getUserProgress,
  addDiscoveryToUser,
  removeDiscoveryFromUser,
  resetUserDiscoveries,
  setDiscoveryMilestone
} from '@/lib/firebase/admin-console';
import type { Discovery } from '@/lib/firebase/discoveries';
import { X, Plus, Minus, RotateCcw, Settings } from 'lucide-react';

interface AdminConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminConsole({ isOpen, onClose }: AdminConsoleProps) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [percentage, setPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.uid) {
      loadUserData();
    }
  }, [isOpen, user?.uid]);

  const loadUserData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    const progress = await getUserProgress(user.uid);
    if (progress) {
      setDiscoveries(progress.discoveries);
      setPercentage(progress.percentage);
    }
    setLoading(false);
  };

  const handleAddDiscovery = async (symbol: string, name: string) => {
    if (!user?.uid) return;
    setActionLoading(true);
    const result = await addDiscoveryToUser(user.uid, symbol, name);
    setMessage(result.message);
    if (result.success) {
      loadUserData();
    }
    setActionLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRemoveDiscovery = async (symbol: string) => {
    if (!user?.uid) return;
    setActionLoading(true);
    const result = await removeDiscoveryFromUser(user.uid, symbol);
    setMessage(result.message);
    if (result.success) {
      loadUserData();
    }
    setActionLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReset = async () => {
    if (!user?.uid) return;
    setActionLoading(true);
    const result = await resetUserDiscoveries(user.uid);
    setMessage(result.message);
    if (result.success) {
      loadUserData();
    }
    setActionLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSetMilestone = async (milestone: number) => {
    if (!user?.uid) return;
    setActionLoading(true);
    const result = await setDiscoveryMilestone(user.uid, milestone);
    setMessage(result.message);
    if (result.success) {
      loadUserData();
    }
    setActionLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 w-80 max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl z-[9999] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-border">
        <span className="font-bold text-foreground">Admin Console</span>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {message && (
          <div className="p-2 text-sm bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
            {message}
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2">Current Progress</h4>
          <div className="p-2 bg-muted rounded text-sm">
            <p>Discoveries: {discoveries.length}/118</p>
            <p>Percentage: {percentage.toFixed(1)}%</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Set Milestone</h4>
          <div className="grid grid-cols-2 gap-2">
            {[10, 25, 50, 75, 100].map((milestone) => (
              <button
                key={milestone}
                onClick={() => handleSetMilestone(milestone)}
                disabled={actionLoading}
                className="px-2 py-1 text-xs bg-muted hover:bg-primary/20 rounded transition-colors"
              >
                {milestone}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const symbol = prompt('Enter element symbol (e.g., H, He, Li):');
                const name = prompt('Enter element name:');
                if (symbol && name) handleAddDiscovery(symbol, name);
              }}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-green-500/20 text-green-600 hover:bg-green-500/30 rounded"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
            <button
              onClick={() => {
                const symbol = prompt('Enter element symbol to remove:');
                if (symbol) handleRemoveDiscovery(symbol);
              }}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-red-500/20 text-red-600 hover:bg-red-500/30 rounded"
            >
              <Minus className="h-3 w-3" /> Remove
            </button>
            <button
              onClick={() => {
                if (confirm('Reset all discoveries? This cannot be undone.')) {
                  handleReset();
                }
              }}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-orange-500/20 text-orange-600 hover:bg-orange-500/30 rounded"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Discoveries List</h4>
          <div className="max-h-32 overflow-y-auto bg-muted rounded p-2 text-xs">
            {discoveries.length === 0 ? (
              <p className="text-muted-foreground">No discoveries</p>
            ) : (
              discoveries.map((d) => (
                <div key={d.symbol} className="flex justify-between py-0.5">
                  <span>{d.symbol}</span>
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminConsoleWidget() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [isOpen, setIsOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (profile?.bio) {
      const hasKey = verifyAdminKey(profile.bio);
      setHasAccess(hasKey);
    } else {
      setHasAccess(false);
    }
  }, [profile?.bio]);

  if (!user || !hasAccess) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-32 right-4 h-12 w-12 rounded-full bg-red-500/80 hover:bg-red-500 shadow-lg flex items-center justify-center z-[9998] transition-transform hover:scale-110"
        aria-label="Admin Console"
      >
        <Settings className="h-5 w-5 text-white" />
      </button>
      <AdminConsole isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}