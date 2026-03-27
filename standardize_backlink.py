import os
import re

games_dir = 'app/(app)/games'
backlink_css = '''  display: block;
  margin-bottom: 16px;
  color: #818cf8;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95em;
  transition: opacity 0.2s;
}

.backLink:hover {
  opacity: 0.8;'''

for game in os.listdir(games_dir):
    css_path = os.path.join(games_dir, game, 'page.module.css')
    if os.path.exists(css_path):
        with open(css_path, 'r') as f:
            content = f.read()
        # Replace .backLink block
        pattern = r'\.backLink\s*\{[^}]+\}\s*\.backLink:hover\s*\{[^}]+\}'
        new_content = re.sub(pattern, '.backLink {\n' + backlink_css + '\n}', content, flags=re.MULTILINE)
        if new_content != content:
            with open(css_path, 'w') as f:
                f.write(new_content)
            print(f'Updated {css_path}')
        else:
            print(f'No change for {css_path}')
