import os
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime

def scrape_naver_reports():
    url = "https://finance.naver.com/research/company_list.naver"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # We will just scrape the first few pages to be sure we get all of today's or recent reports.
    # For a real service, it might check the date and stop, but here we just get page 1 to 3.
    reports = []
    
    for page in range(1, 4):
        resp = requests.get(f"{url}?&page={page}", headers=headers)
        resp.encoding = 'euc-kr'
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        table = soup.select_one('table.type_1')
        if not table:
            continue
            
        rows = table.select('tr')
        for row in rows:
            tds = row.select('td')
            if len(tds) >= 5:
                stock_name = tds[0].text.strip()
                title = tds[1].text.strip()
                broker = tds[2].text.strip()
                date_str = tds[4].text.strip()
                
                # We can choose to filter by today's date if we want,
                # but for the sake of having enough data to display, 
                # let's just gather recent reports.
                
                if stock_name: # Ensure it's not an empty row
                    reports.append({
                        'stock': stock_name,
                        'title': title,
                        'broker': broker,
                        'date': date_str
                    })
                    
    return reports

def process_reports(reports):
    # Group by stock and count mentions
    stock_counts = {}
    for r in reports:
        stock = r['stock']
        if stock not in stock_counts:
            stock_counts[stock] = {
                'count': 0,
                'reports': []
            }
        stock_counts[stock]['count'] += 1
        stock_counts[stock]['reports'].append({
            'title': r['title'],
            'broker': r['broker'],
            'date': r['date']
        })
        
    # Convert to list and sort by count descending
    result = []
    for stock, data in stock_counts.items():
        result.append({
            'stock': stock,
            'count': data['count'],
            'reports': data['reports']
        })
        
    result.sort(key=lambda x: x['count'], reverse=True)
    return result

if __name__ == "__main__":
    print("Scraping reports from Naver Finance...")
    raw_reports = scrape_naver_reports()
    print(f"Total reports fetched: {len(raw_reports)}")
    
    import analyzer
    processed = process_reports(raw_reports)
    
    print("Scoring data using 4-factor model...")
    scored = analyzer.analyze_and_score(processed)
    
    # Ensure data directory exists
    os.makedirs('frontend/data', exist_ok=True)
    
    output_path = 'frontend/data/reports_scored.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(scored, f, ensure_ascii=False, indent=2)
        
    print(f"Data saved to {output_path}")
