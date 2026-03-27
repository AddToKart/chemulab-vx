import os
games_dir = 'app/(app)/games'
for game in os.listdir(games_dir):
    page_path = os.path.join(games_dir, game, 'page.tsx')
    if not os.path.exists(page_path):
        continue
    with open(page_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    back_link_line = None
    game_area_line = None
    for i, line in enumerate(lines):
        if 'className={styles.backLink}' in line:
            if back_link_line is None:
                back_link_line = i
        if 'className={styles.gameArea}' in line:
            if game_area_line is None:
                game_area_line = i
    print(f'{game}: backLink at {back_link_line}, gameArea at {game_area_line}')
