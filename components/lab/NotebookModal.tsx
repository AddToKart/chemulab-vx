'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useNotebook } from '@/lib/hooks/use-notebook';
import { cn } from '@/lib/utils';

interface NotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid?: string;
}

export function NotebookModal({ isOpen, onClose, uid }: NotebookModalProps) {
  const { notebook, loading, saving, updateContent } = useNotebook(uid);
  const content = notebook?.content ?? '';

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    updateContent(newContent);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Lab Notebook
          </DialogTitle>
          <DialogDescription>
            Write notes about your experiments, discoveries, and ideas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Start writing your lab notes here..."
              className={cn(
                "w-full h-full resize-none rounded-lg border border-white/10 bg-black/5 dark:bg-white/5 p-4 text-[var(--text-main)] placeholder:text-[var(--text-light)]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all custom-scrollbar",
                saving && "opacity-80"
              )}
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold animate-pulse">
                Saving...
              </span>
            )}
            {notebook && (
              <span className="text-[10px] text-[var(--text-light)]">
                Last saved: {new Date(notebook.updatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
