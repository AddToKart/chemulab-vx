import os
import re

games_dir = "app/(app)/games"
games = [d for d in os.listdir(games_dir) if os.path.isdir(os.path.join(games_dir, d))]

for game in games:
    tsx_path = os.path.join(games_dir, game, "page.tsx")
    css_path = os.path.join(games_dir, game, "page.module.css")
    
    if not os.path.exists(tsx_path) or not os.path.exists(css_path):
        continue

    # 1. First, find the max-width or width of .gameArea in the CSS
    with open(css_path, "r", encoding="utf-8") as f:
        css_content = f.read()
    
    game_area_match = re.search(r'\.gameArea\s*\{[^}]*\}', css_content)
    max_width_val = "800px" # fallback
    if game_area_match:
        block = game_area_match.group(0)
        # try to find max-width
        mw_match = re.search(r'max-width:\s*([^;]+);', block)
        if mw_match and "100%" not in mw_match.group(1) and "vw" not in mw_match.group(1):
            max_width_val = mw_match.group(1)
        else:
            w_match = re.search(r'width:\s*([^;]+);', block)
            if w_match and "100%" not in w_match.group(1):
                max_width_val = w_match.group(1)
    
    # 2. Add or update .container in CSS
    if ".container {" not in css_content:
        # prepend .container
        container_css = f".container {{\n  max-width: calc({max_width_val} + 50px);\n  margin: 0 auto;\n  padding: 20px;\n}}\n\n"
        css_content = container_css + css_content
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(css_content)
            
    # 3. Update the TSX file to wrap return in <div className={styles.container}>
    with open(tsx_path, "r", encoding="utf-8") as f:
        tsx_content = f.read()

    # Find the main return block
    # Usually it looks like: return ( \n <div> \n <Link ... backLink
    # We want to replace the outer <div> with <div className={styles.container}>
    # Or if it's already <div className={styles.container}>, do nothing.
    
    if "className={styles.container}" not in tsx_content:
        # naive replacement: find return (\n    <div
        # and replace with return (\n    <div className={styles.container}>
        tsx_content = re.sub(
            r'return\s*\(\s*<div\s*>', 
            r'return (\n    <div className={styles.container}>', 
            tsx_content, 
            count=1
        )
        # Also handle empty fragment <>
        tsx_content = re.sub(
            r'return\s*\(\s*<>\s*<Link\s*href="/games"', 
            r'return (\n    <div className={styles.container}>\n      <Link href="/games"', 
            tsx_content, 
            count=1
        )
        with open(tsx_path, "w", encoding="utf-8") as f:
            f.write(tsx_content)

print("Alignment update completed.")
