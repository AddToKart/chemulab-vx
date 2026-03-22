'use client';

import Image from 'next/image';
import { FriendRequest } from '../types';

interface Props {
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  onAccept: (req: FriendRequest) => void;
  onDecline: (req: FriendRequest) => void;
  onCancel: (req: FriendRequest) => void;
}

export function RequestsList({
  incomingRequests,
  outgoingRequests,
  onAccept,
  onDecline,
  onCancel,
}: Props) {
  return (
    <>
      <h3 className="font-bold text-[var(--text-main)] text-base">Friend Requests</h3>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
          <p className="text-[var(--text-light)] text-sm text-center py-4">No pending requests.</p>
        )}
        {incomingRequests.length > 0 && (
          <>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)] mb-2">Incoming</h4>
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 p-3 rounded-[12px] border border-transparent hover:bg-[var(--bg-sidebar)] hover:border-[var(--border-color)] cursor-pointer transition-all opacity-80"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-sidebar)]">
                  <Image src="/img/default-avatar.png" alt={req.fromUsername} width={44} height={44} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <strong className="text-[var(--text-main)] text-sm font-semibold truncate">{req.fromUsername}</strong>
                  <span className="text-[var(--text-light)] text-xs truncate">{req.fromEmail}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-semibold px-2.5 py-1 rounded-[6px] hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    onClick={() => onAccept(req)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-semibold px-2.5 py-1 rounded-[6px] hover:bg-red-500/20 transition-colors cursor-pointer"
                    onClick={() => onDecline(req)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
        {outgoingRequests.length > 0 && (
          <>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)] mb-2 mt-4">Outgoing</h4>
            {outgoingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 p-3 rounded-[12px] border border-transparent hover:bg-[var(--bg-sidebar)] hover:border-[var(--border-color)] transition-all opacity-80"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-sidebar)]">
                  <Image src="/img/default-avatar.png" alt={req.toEmail} width={44} height={44} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <strong className="text-[var(--text-main)] text-sm font-semibold truncate">{req.toEmail}</strong>
                  <span className="text-[var(--text-light)] text-xs truncate">Pending...</span>
                </div>
                <button
                  type="button"
                  className="bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] text-xs font-semibold px-2.5 py-1 rounded-[6px] hover:border-red-500/50 transition-colors cursor-pointer"
                  onClick={() => onCancel(req)}
                >
                  Cancel
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
