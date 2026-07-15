import json
import requests
from bs4 import BeautifulSoup
import time

def fetch_industries():
    print("Loading reports_scored.json...")
    with open('frontend/data/reports_scored.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    industries = {}
    print(f"Fetching industries for {len(data)} stocks...")
    for i, stock in enumerate(data):
        code = stock.get('code')
        stock_name = stock.get('stock')
        if not code: continue
        
        try:
            url = f"https://finance.naver.com/item/main.naver?code={code}"
            r = requests.get(url)
            soup = BeautifulSoup(r.content, 'html.parser', from_encoding='cp949')
            
            # Find industry link
            upjong_link = soup.select_one('a[href*="type=upjong"]')
            if upjong_link and upjong_link.text:
                industries[stock_name] = upjong_link.text.strip()
            else:
                industries[stock_name] = "기타"
        except Exception as e:
            print(f"Error for {stock_name}: {e}")
            industries[stock_name] = "기타"
            
        time.sleep(0.1) # Be nice to Naver
        
        if (i+1) % 10 == 0:
            print(f"Processed {i+1}/{len(data)} stocks.")
            
    with open('frontend/data/industries.json', 'w', encoding='utf-8') as f:
        json.dump(industries, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(industries)} industries to frontend/data/industries.json.")

if __name__ == "__main__":
    fetch_industries()
