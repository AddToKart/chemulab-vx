import glob
import os

games_dir = "app/(app)/games"
games = [d for d in os.listdir(games_dir) if os.path.isdir(os.path.join(games_dir, d))]

for game in games:
    page_path = os.path.join(games_dir, game, "page.tsx")
    css_path = os.path.join(games_dir, game, "page.module.css")
    
    if os.path.exists(page_path):
        with open(page_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # print some context around back to games
            idx = content.find("Back to Games")
            if idx != -1:
                start = max(0, idx - 150)
                end = min(len(content), idx + 150)
                print(f"\n--- {game} ---")
                print(content[start:end])
                
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css = f.read()
            if ".backLink" not in css:
                print(f"[{game}] missing .backLink in CSS")
