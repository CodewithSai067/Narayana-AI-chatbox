import requests
from bs4 import BeautifulSoup
import os

TARGET_URLS = [
    "https://necn.ac.in/",
    "https://necn.ac.in/about-us.php",
    "https://necn.ac.in/college-Fees.php",
    "https://necn.ac.in/departments.php",
    "https://necn.ac.in/admissions.php",
]

def scrape_full_text():
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    full_text = "NARAYANA ENGINEERING COLLEGE (NECN) OFFICIAL PORTAL KNOWLEDGE BASE\n\n"

    print("🔍 Crawling college portal pages...")
    for url in TARGET_URLS:
        try:
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                soup = BeautifulSoup(res.content, "html.parser")
                for s in soup(["script", "style", "nav", "footer"]):
                    s.extract()
                
                clean = " ".join(soup.get_text().split())
                full_text += f"\n--- SOURCE: {url} ---\n{clean}\n"
                print(f"✅ Extracted: {url}")
        except Exception as e:
            print(f"⚠️ Error {url}: {e}")

    with open("college_full_knowledge.txt", "w", encoding="utf-8") as f:
        f.write(full_text)

    print("🎉 All portal text saved to 'college_full_knowledge.txt'")

if __name__ == "__main__":
    scrape_full_text()