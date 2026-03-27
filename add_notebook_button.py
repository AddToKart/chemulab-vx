import re

file_path = 'app/(app)/lab/page.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# Find the h3 line with Inventory
for i, line in enumerate(lines):
    if '<h3' in line and 'Inventory' in lines[i+1]:
        # Found the opening h3 line at i, content at i+1, Syncing span at i+2, closing h3 at i+3
        # We'll insert button after the Syncing span line, before the closing h3 line.
        # Ensure we have the correct lines:
        # i: <h3 ...>
        # i+1:   Inventory
        # i+2:   {saving && <span ...>Syncing</span>}
        # i+3: </h3>
        # Insert button after i+2, before i+3.
        button_lines = [
            '            <button\n',
            '              type="button"\n',
            '              onClick={() => setNotebookModalOpen(true)}\n',
            '              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-[var(--text-light)] hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-all cursor-pointer"\n',
            '              title="Open Lab Notebook"\n',
            '            >\n',
            '              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">\n',
            '                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />\n',
            '              </svg>\n',
            '              Notebook\n',
            '            </button>\n'
        ]
        # Insert after line i+2
        for offset, bline in enumerate(button_lines):
            lines.insert(i + 3 + offset, bline)
        break

with open(file_path, 'w') as f:
    f.writelines(lines)
print('Added notebook button')
