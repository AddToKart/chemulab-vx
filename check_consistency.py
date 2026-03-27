import os
import re

games_dir = 'app/(app)/games'
for game in os.listdir(games_dir):
    page_path = os.path.join(games_dir, game, 'page.tsx')
    if not os.path.exists(page_path):
        continue
    with open(page_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    # find line numbers of backLink and gameArea
    back_link_line = None
    game_area_line = None
    for i, line in enumerate(lines):
        if 'className={styles.backLink}' in line:
            back_link_line = i
        if 'className={styles.gameArea}' in line:
            game_area_line = i
    if back_link_line is not None and game_area_line is not None:
        if back_link_line < game_area_line:
            print(f'{game}: backLink BEFORE gameArea (good)')
        else:
            print(f'{game}: backLink AFTER gameArea (bad)')
    else:
        print(f'{game}: missing backLink or gameArea')
