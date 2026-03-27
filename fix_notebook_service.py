import re

file_path = 'lib/firebase/notebook.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Remove serverTimestamp import
content = re.sub(r',\s*serverTimestamp,\s*', '\n', content)
# Also remove the line if it's单独一行? The import block is multiline.
# Let's just replace the whole import block with a cleaned version.
import_block = '''import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';'''
# Find the existing import block up to the first closing brace.
# Use regex to capture from 'import {' to '} from 'firebase/firestore';'
pattern = r"import\s*\{[^}]+\}\s*from\s*'firebase/firestore';"
content = re.sub(pattern, import_block, content)

# Replace `any` with proper type
content = content.replace('const data = snap.data() as any;', 'const data = snap.data() as NotebookData;')

with open(file_path, 'w') as f:
    f.write(content)
