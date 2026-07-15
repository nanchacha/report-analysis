import glob, json, os, re
path = r'C:\Users\csw44\.gemini\antigravity\brain\**\*_pdf_analysis.md'
files = glob.glob(path, recursive=True)
conclusions = {}
for f in files:
    stock_name = os.path.basename(f).replace('_pdf_analysis.md', '')
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        match = re.search(r'종합 의견[^\n]*\n(.*)', content, re.DOTALL | re.IGNORECASE)
        if match:
            conclusions[stock_name] = match.group(1).strip()
            
with open(r'frontend\data\conclusions.json', 'w', encoding='utf-8') as out:
    json.dump(conclusions, out, ensure_ascii=False, indent=2)
print(f'Extracted {len(conclusions)} conclusions.')
