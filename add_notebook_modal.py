import re

file_path = 'app/(app)/lab/page.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# Find the line with '    </div>' that is immediately before '  );'
for i in range(len(lines)-1, -1, -1):
    if lines[i].strip() == '</div>':
        # Ensure next non-empty line is '  );'
        for j in range(i+1, len(lines)):
            if lines[j].strip():
                if lines[j].strip() == ');':
                    # Insert before line i
                    lines.insert(i, '      <NotebookModal isOpen={notebookModalOpen} onClose={() => setNotebookModalOpen(false)} uid={uid} />\n')
                    break
        break

with open(file_path, 'w') as f:
    f.writelines(lines)
print('Added NotebookModal component')
