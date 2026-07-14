import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

url = "https://finance.naver.com/research/company_list.naver"
# Provide a user-agent to avoid being blocked
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

response = requests.get(url, headers=headers)
response.encoding = 'euc-kr' # Naver finance often uses euc-kr
soup = BeautifulSoup(response.text, 'html.parser')

# Find the table containing the reports
table = soup.select_one('table.type_1')

reports = []
if table:
    rows = table.select('tr')
    for row in rows:
        tds = row.select('td')
        if len(tds) >= 5:
            stock_name = tds[0].text.strip()
            title = tds[1].text.strip()
            broker = tds[2].text.strip()
            file_link = tds[3].select_one('a')['href'] if tds[3].select_one('a') else ''
            date = tds[4].text.strip()
            reports.append({
                'stock': stock_name,
                'title': title,
                'broker': broker,
                'date': date
            })

with open("test_output.json", "w", encoding="utf-8") as f:
    json.dump(reports[:5], f, ensure_ascii=False, indent=2)
