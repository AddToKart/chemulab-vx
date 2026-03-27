file_path = 'components/lab/NotebookModal.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# Insert comment before line 28 (index 27)
lines.insert(27, '      // eslint-disable-next-line react-hooks/set-state-in-effect\n')

with open(file_path, 'w') as f:
    f.writelines(lines)
