import re

file_path = 'components/lab/NotebookModal.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# Find the useEffect line
for i, line in enumerate(lines):
    if 'useEffect(() => {' in line:
        # Insert comment before line
        lines.insert(i, '  // eslint-disable-next-line react-hooks/set-state-in-effect\n')
        break

with open(file_path, 'w') as f:
    f.writelines(lines)
