import os
import json
import requests
import time

def download_pdfs(top_n=5, output_dir='scratch_pdfs'):
    os.makedirs(output_dir, exist_ok=True)
    
    with open('frontend/data/reports_scored.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    top_stocks = data[:top_n]
    
    downloaded = []
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    for item in top_stocks:
        stock_name = item['stock']
        for idx, report in enumerate(item['reports']):
            pdf_url = report.get('pdf_url')
            if pdf_url:
                print(f"Downloading {stock_name} PDF from {pdf_url}...")
                try:
                    res = requests.get(pdf_url, headers=headers)
                    if res.status_code == 200:
                        safe_title = "".join([c for c in report['title'] if c.isalpha() or c.isdigit() or c==' ']).rstrip()
                        filename = f"{stock_name}_{idx}_{safe_title[:10]}.pdf"
                        filepath = os.path.join(output_dir, filename)
                        
                        with open(filepath, 'wb') as pdf_file:
                            pdf_file.write(res.content)
                        
                        print(f"Saved: {filepath}")
                        downloaded.append({
                            'stock': stock_name,
                            'title': report['title'],
                            'filepath': os.path.abspath(filepath)
                        })
                    else:
                        print(f"Failed to download {pdf_url}: status {res.status_code}")
                except Exception as e:
                    print(f"Error downloading {pdf_url}: {e}")
                
                # Sleep briefly to avoid blocking
                time.sleep(1)
                
    with open('downloaded_pdfs.json', 'w', encoding='utf-8') as f:
        json.dump(downloaded, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    download_pdfs()
