import sys

file_path = "app/(app)/lab/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace mobile section state
content = content.replace(
    "const [mobileSection, setMobileSection] = useState<'lab' | 'elements' | 'inventory'>('lab');",
    "const [mobileSection, setMobileSection] = useState<'lab' | 'inventory'>('lab');"
)

# Replace the tabs logic
old_tabs = """      <div className="sticky top-20 z-20 block xl:hidden">
        <div className="glass-panel p-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'elements', label: 'Elements' },
              { id: 'lab', label: 'Lab' },
              { id: 'inventory', label: 'Inventory' },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setMobileSection(section.id as 'lab' | 'elements' | 'inventory')}"""

new_tabs = """      <div className="sticky top-[4.5rem] md:top-20 z-30 block xl:hidden">
        <div className="glass-panel p-2 bg-white/90 dark:bg-[#0a0f1c]/90 backdrop-blur-2xl border-b border-white/5 shadow-md">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'lab', label: 'Lab Workspace' },
              { id: 'inventory', label: 'Inventory' },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setMobileSection(section.id as 'lab' | 'inventory')}"""

# Convert line endings to match the file
if "\r\n" in content:
    old_tabs = old_tabs.replace("\n", "\r\n")
    new_tabs = new_tabs.replace("\n", "\r\n")

if old_tabs in content:
    content = content.replace(old_tabs, new_tabs)
else:
    print("Tabs target not found")

# Replace Elements panel classes
old_elements = """      <div
        className={cn(
          'flex w-full flex-col gap-5 glass-panel p-5 shadow-xl animate-in slide-in-from-left-5 duration-500 sm:p-6 xl:order-1 xl:w-[min(24rem,26vw)] xl:min-w-[20rem] xl:max-w-[26rem]',
          'max-xl:max-h-[32rem]',
          mobileSection === 'elements' ? 'max-xl:flex' : 'max-xl:hidden',
          'xl:flex',
        )}
      >"""

new_elements = """      <div
        className={cn(
          'flex w-full flex-col gap-5 glass-panel p-5 shadow-xl animate-in slide-in-from-left-5 duration-500 sm:p-6 xl:w-[min(24rem,26vw)] xl:min-w-[20rem] xl:max-w-[26rem]',
          'max-xl:max-h-[32rem]',
          mobileSection === 'lab' ? 'max-xl:flex order-2' : 'max-xl:hidden',
          'xl:flex xl:order-1',
        )}
      >"""

if "\r\n" in content:
    old_elements = old_elements.replace("\n", "\r\n")
    new_elements = new_elements.replace("\n", "\r\n")

if old_elements in content:
    content = content.replace(old_elements, new_elements)
else:
    print("Elements panel target not found")

# Replace Lab panel classes
old_lab = """      <div
        className={cn(
          'group/craft relative flex min-h-[32rem] flex-1 flex-col items-center justify-start overflow-y-auto custom-scrollbar glass-panel p-6 shadow-2xl animate-in zoom-in-95 duration-700 sm:p-8 xl:order-2 xl:min-h-0 xl:p-10',
          mobileSection === 'lab' ? 'max-xl:flex' : 'max-xl:hidden',
          'xl:flex',
        )}
      >"""

new_lab = """      <div
        className={cn(
          'group/craft relative flex min-h-[32rem] flex-1 flex-col items-center justify-start overflow-y-auto custom-scrollbar glass-panel p-6 shadow-2xl animate-in zoom-in-95 duration-700 sm:p-8 xl:min-h-0 xl:p-10',
          mobileSection === 'lab' ? 'max-xl:flex order-1' : 'max-xl:hidden',
          'xl:flex xl:order-2',
        )}
      >"""

if "\r\n" in content:
    old_lab = old_lab.replace("\n", "\r\n")
    new_lab = new_lab.replace("\n", "\r\n")

if old_lab in content:
    content = content.replace(old_lab, new_lab)
else:
    print("Lab panel target not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Modifications applied successfully!")
