"""
Run inside your backend folder:   python test_gemini.py
Tests several current models, with and without Google Search, and tells you which work.
"""
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY", "").strip()
if not key:
    print("GEMINI_API_KEY missing in .env")
    raise SystemExit

from google import genai
from google.genai import types

client = genai.Client(api_key=key)

print("All Gemini text models on your key:")
try:
    for m in client.models.list():
        n = m.name.replace("models/", "")
        if n.startswith("gemini") and not any(x in n for x in ("image", "tts", "transcribe", "omni")):
            print("  -", n)
except Exception as e:
    print("  could not list:", e)

candidates = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
]

working = []
for model in candidates:
    for use_search in (True, False):
        label = "with Google Search" if use_search else "without search"
        try:
            cfg = (
                types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())])
                if use_search
                else None
            )
            r = client.models.generate_content(
                model=model, contents="Reply with the single word: ok", config=cfg
            )
            print(f"OK     {model:32} {label}")
            working.append((model, use_search))
        except Exception as e:
            msg = str(e).replace("\n", " ")[:110]
            print(f"FAILED {model:32} {label} -> {msg}")

print("\nWorking combinations:", working or "none")