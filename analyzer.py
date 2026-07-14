import urllib.request
import json
import re
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import pandas as pd
import FinanceDataReader as fdr

# Initialize stock list to get codes
print("Loading KRX stock list...")
krx = fdr.StockListing('KRX')
# Create a dictionary for O(1) lookup
stock_dict = dict(zip(krx['Name'], krx['Code']))

def get_stock_code(name):
    # Some names in reports might have '보통주' or differ slightly, but we try exact match first
    return stock_dict.get(name)

def calculate_attention_score(mention_count):
    # Max 25 points. 
    if mention_count >= 4:
        return 25
    elif mention_count == 3:
        return 20
    elif mention_count == 2:
        return 15
    else:
        return 10

def calculate_momentum_score(reports):
    score = 0
    growth_keywords = ['로봇', '자율주행', 'AI', '인공지능', '메타버스', '2차전지', '우주항공', 'HBM', '바이오', '전고체', '자율']
    catalyst_keywords = ['수주', '승인', '흑자', '턴어라운드', 'M&A', '서프라이즈', '상향', '매수', '호조', '최대', '돌파']
    
    for report in reports:
        title = report['title'].upper()
        
        # Check growth themes
        for kw in growth_keywords:
            if kw in title:
                score += 10
                break # count once per report
                
        # Check catalysts
        for kw in catalyst_keywords:
            if kw in title:
                score += 15
                break # count once per report
                
    return min(score, 25) # Cap at 25

def calculate_technical_score(code):
    try:
        # Get last 100 days of data
        today = datetime.now()
        start_date = today - timedelta(days=100)
        df = fdr.DataReader(code, start_date.strftime('%Y-%m-%d'))
        
        if len(df) < 60:
            return 10 # Not enough data
            
        current_price = df['Close'].iloc[-1]
        
        # Calculate Moving Averages
        ma20 = df['Close'].rolling(window=20).mean().iloc[-1]
        ma60 = df['Close'].rolling(window=60).mean().iloc[-1]
        
        score = 0
        if current_price > ma20:
            score += 15
        if current_price > ma60:
            score += 10
            
        return score
    except Exception as e:
        print(f"Error fetching chart for {code}: {e}")
        return 0

def calculate_fundamental_score(code):
    # Very basic fundamental check by parsing Naver Finance side panel
    try:
        url = f"https://finance.naver.com/item/main.naver?code={code}"
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get(url, headers=headers)
        soup = BeautifulSoup(res.text, 'html.parser')
        
        score = 5 # Base score
        
        # We try to find PER and PBR in the aside section
        # The IDs are _per, _pbr
        per_em = soup.select_one('#_per')
        pbr_em = soup.select_one('#_pbr')
        
        if per_em:
            per_val = float(per_em.text.replace(',', ''))
            if per_val > 0 and per_val < 15: # Undervalued or reasonable
                score += 10
        else:
            # Maybe no PER (deficit), so no points
            pass
            
        if pbr_em:
            pbr_val = float(pbr_em.text.replace(',', ''))
            if pbr_val > 0 and pbr_val < 1.5:
                score += 10
                
        return min(score, 25)
    except Exception as e:
        print(f"Error fetching fundamentals for {code}: {e}")
        return 5

def analyze_and_score(reports_data):
    scored_data = []
    
    for item in reports_data:
        stock_name = item['stock']
        code = get_stock_code(stock_name)
        
        attention = calculate_attention_score(item['count'])
        momentum = calculate_momentum_score(item['reports'])
        
        technical = 0
        fundamental = 0
        
        if code:
            technical = calculate_technical_score(code)
            fundamental = calculate_fundamental_score(code)
        else:
            print(f"Could not find ticker for: {stock_name}")
            
        total = attention + momentum + technical + fundamental
        
        # Add to the item
        item['scores'] = {
            'attention': attention,
            'momentum': momentum,
            'technical': technical,
            'fundamental': fundamental,
            'total': total
        }
        item['code'] = code
        scored_data.append(item)
        
    # Sort by total score descending
    scored_data.sort(key=lambda x: x['scores']['total'], reverse=True)
    return scored_data

if __name__ == "__main__":
    # Test script standalone
    with open('frontend/data/reports.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print("Scoring data...")
    scored = analyze_and_score(data)
    
    with open('frontend/data/reports_scored.json', 'w', encoding='utf-8') as f:
        json.dump(scored, f, ensure_ascii=False, indent=2)
        
    print("Saved scored data to frontend/data/reports_scored.json")
