import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pypdf import PdfReader
from google import genai
from google.genai import types
from google.auth.transport import requests as grequests
from google.oauth2 import id_token

load_dotenv()

app = FastAPI(title="Narayana AI ChatBox API", version="2.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static_uploads", StaticFiles(directory=UPLOAD_DIR), name="static_uploads")

COLLEGE_TEXT_CONTEXT = ""
if os.path.exists("college_full_knowledge.txt"):
    with open("college_full_knowledge.txt", "r", encoding="utf-8") as f:
        COLLEGE_TEXT_CONTEXT = f.read()


def get_uploaded_docs_content():
    extracted_text = ""
    if not os.path.exists(UPLOAD_DIR):
        return extracted_text

    for fname in os.listdir(UPLOAD_DIR):
        fpath = os.path.join(UPLOAD_DIR, fname)
        if fname.lower().endswith(".pdf"):
            try:
                reader = PdfReader(fpath)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += f"\n--- Content from {fname} ---\n" + text
            except Exception:
                pass
        elif fname.lower().endswith((".txt", ".md", ".csv")):
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    extracted_text += f"\n--- Content from {fname} ---\n" + f.read()
            except Exception:
                pass
    return extracted_text


gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
ai_client = genai.Client(api_key=gemini_api_key) if gemini_api_key else None

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

STUDENT_REGISTRY = {
    "23711A4349": {"name": "SHAIK FAROOQ AHMED", "batch": "Rejoin", "attendance": "74%"},
    "21711A4361": {"name": "TANGIRALA V S P KARTHIKEYA", "batch": "Rejoin", "attendance": "78%"},
    "23711A4365": {"name": "PATIBANDLA SANDEEP KUMAR", "batch": "Rejoin", "attendance": "82%"},
    "24711A4301": {"name": "ANCHANALA SAI SATHVIKA", "batch": "Regular", "attendance": "77%"},
    "24711A4302": {"name": "ARIKONDA LASYA", "batch": "Regular", "attendance": "89%"},
    "24711A4303": {"name": "AVULA NIRMAL KUMAR", "batch": "Regular", "attendance": "50%"},
    "24711A4304": {"name": "BADUGU YUVA CHANDRA", "batch": "Regular", "attendance": "68%"},
    "24711A4305": {"name": "BANKA LIKHITHA", "batch": "Regular", "attendance": "80%"},
    "24711A4306": {"name": "BHEEMAVARAPU SRIVIDYA", "batch": "Regular", "attendance": "72%"},
    "24711A4307": {"name": "BOMMANA SAI KUMAR", "batch": "Regular", "attendance": "72%"},
    "24711A4308": {"name": "BURIDI ROHITHA", "batch": "Regular", "attendance": "90%"},
    "24711A4309": {"name": "CHEMUDU GUNTA JAYADEEP", "batch": "Regular", "attendance": "69%"},
    "24711A4310": {"name": "CHITTATURU SUSRUTHA", "batch": "Regular", "attendance": "79%"},
    "24711A4311": {"name": "CHITTETI AMRUTHA", "batch": "Regular", "attendance": "79%"},
    "24711A4312": {"name": "CHITTIBOYINA LOKESWARI", "batch": "Regular", "attendance": "75%"},
    "24711A4313": {"name": "DAMAVARAPU VAISHNAVI", "batch": "Regular", "attendance": "74%"},
    "24711A4314": {"name": "DHANDU KARTHIKEYA", "batch": "Regular", "attendance": "80%"},
    "24711A4315": {"name": "DUGGISETTY SHANMUKA SRINIVAS", "batch": "Regular", "attendance": "64%"},
    "24711A4316": {"name": "ELIKAM SUMANTH KUMAR", "batch": "Regular", "attendance": "59%"},
    "24711A4317": {"name": "GANESHAM TEJASRI", "batch": "Regular", "attendance": "75%"},
    "24711A4318": {"name": "GANGISETTY VENKATA SATYA SAI NAGA KEDAR", "batch": "Regular", "attendance": "84%"},
    "24711A4319": {"name": "GUTHIKONDA SUCHAITHRA", "batch": "Regular", "attendance": "63%"},
    "24711A4320": {"name": "INDURUPALLI SAI SIDDARDHA", "batch": "Regular", "attendance": "61%"},
    "24711A4321": {"name": "KADALURU ARTHI", "batch": "Regular", "attendance": "68%"},
    "24711A4322": {"name": "KADAVA JAYALAKSHMI", "batch": "Regular", "attendance": "79%"},
    "24711A4323": {"name": "KARETI SAI SPANDANA", "batch": "Regular", "attendance": "75%"},
    "24711A4324": {"name": "KATABATHINA PRAVEEN SAI", "batch": "Regular", "attendance": "74%"},
    "24711A4325": {"name": "KATARI BRAHMAJI", "batch": "Regular", "attendance": "70%"},
    "24711A4326": {"name": "KOLATAM CHAITHRIKA", "batch": "Regular", "attendance": "76%"},
    "24711A4327": {"name": "KUDUMULA PAVITHRA", "batch": "Regular", "attendance": "79%"},
    "24711A4328": {"name": "KUNTA TEJESH", "batch": "Regular", "attendance": "72%"},
    "24711A4329": {"name": "LAGHUTHOTI CHARAN TEJA", "batch": "Regular", "attendance": "70%"},
    "24711A4330": {"name": "LOKE HRISHIKESH KUMAR", "batch": "Regular", "attendance": "76%"},
    "24711A4331": {"name": "MATTIPI SUMA VARSHINI", "batch": "Regular", "attendance": "79%"},
    "24711A4332": {"name": "MUDDALA DEVAKI", "batch": "Regular", "attendance": "76%"},
    "24711A4333": {"name": "MUTHYALA MOHAN KUMAR", "batch": "Regular", "attendance": "68%"},
    "24711A4334": {"name": "NANDIMANDALAM JAHNAVI", "batch": "Regular", "attendance": "60%"},
    "24711A4335": {"name": "NEMALIPURI MOHAN RUPA", "batch": "Regular", "attendance": "79%"},
    "24711A4336": {"name": "PALLAPU BHARATHI", "batch": "Regular", "attendance": "84%"},
    "24711A4337": {"name": "PENETI VENKATA GNANESH", "batch": "Regular", "attendance": "87%"},
    "24711A4338": {"name": "PONUGOTTI NANDAN REDDY", "batch": "Regular", "attendance": "70%"},
    "24711A4339": {"name": "PUTHA P L N TULASI KUMARI", "batch": "Regular", "attendance": "88%"},
    "24711A4340": {"name": "RACHAGORLA CHARANTEJA", "batch": "Regular", "attendance": "63%"},
    "24711A4341": {"name": "RATAVARAPU DIVYA", "batch": "Regular", "attendance": "96%"},
    "24711A4342": {"name": "RAVINUTHALA HAVEELA", "batch": "Regular", "attendance": "90%"},
    "24711A4343": {"name": "SABBI SWETHA", "batch": "Regular", "attendance": "83%"},
    "24711A4344": {"name": "SADANA MUKESH SANKAR", "batch": "Regular", "attendance": "58%"},
    "24711A4345": {"name": "SANA BALAMURALI", "batch": "Regular", "attendance": "77%"},
    "24711A4346": {"name": "SANANGALA SWAPNIKA", "batch": "Regular", "attendance": "51%"},
    "24711A4347": {"name": "SHAIK AQEEL AHMAD", "batch": "Regular", "attendance": "68%"},
    "24711A4348": {"name": "SHAIK ARSHIYA", "batch": "Regular", "attendance": "81%"},
    "24711A4349": {"name": "SHAIK FAREEN", "batch": "Regular", "attendance": "62%"},
    "24711A4350": {"name": "SHAIK FAZIL", "batch": "Regular", "attendance": "86%"},
    "24711A4351": {"name": "SHAIK HASEEB AHMAD", "batch": "Regular", "attendance": "73%"},
    "24711A4352": {"name": "SHAIK KHAJA ASHRAF AHMED", "batch": "Regular", "attendance": "83%"},
    "24711A4353": {"name": "SHAIK MOHAMMED ZAID", "batch": "Regular", "attendance": "66%"},
    "24711A4354": {"name": "SHAIK SUMIYABHANU", "batch": "Regular", "attendance": "68%"},
    "24711A4355": {"name": "SYED SHARUK", "batch": "Regular", "attendance": "75%"},
    "24711A4356": {"name": "TALAPANENI HEMA", "batch": "Regular", "attendance": "83%"},
    "24711A4357": {"name": "TARITE DIVYA LAKSHMI", "batch": "Regular", "attendance": "78%"},
    "24711A4358": {"name": "THAMMISETTY SRAVANI", "batch": "Regular", "attendance": "80%"},
    "24711A4359": {"name": "THATHULA VYSHNAVI", "batch": "Regular", "attendance": "82%"},
    "24711A4360": {"name": "THATIPALLI OSHMA PRIYA", "batch": "Regular", "attendance": "63%"},
    "24711A4361": {"name": "THUMMALA PENCHALA PAVAN KALYAN", "batch": "Regular", "attendance": "77%"},
    "24711A4362": {"name": "UGGELA MANASA", "batch": "Regular", "attendance": "79%"},
    "24711A4363": {"name": "UTUKURU HANEESH", "batch": "Regular", "attendance": "85%"},
    "24711A4364": {"name": "VARIIKUNTLA MOHANA PRIYA", "batch": "Regular", "attendance": "76%"},
    "25715A4301": {"name": "ANDAGUNDA VENKATA NARAYANA", "batch": "Lateral Entry", "attendance": "88%"},
    "25715A4302": {"name": "ASAPU HARSHITH KUMAR", "batch": "Lateral Entry", "attendance": "89%"},
    "25715A4303": {"name": "KONDURU ESWARA PRASAD", "batch": "Lateral Entry", "attendance": "87%"},
    "25715A4304": {"name": "MALLISETTI SAHITHYA", "batch": "Lateral Entry", "attendance": "79%"},
    "25715A4305": {"name": "NIMMALA VENKATA SAI GOWTHAM", "batch": "Lateral Entry", "attendance": "85%"},
}

# Google account -> roll number. Fill this in so students can use "Sign in with Google".
# Emails must be lowercase. Example:
#   "faazil@gmail.com": "24711A4350",
STUDENT_EMAILS: Dict[str, str] = {
}

DEFAULT_PASSWORD = os.getenv("TEMP_PASSWORD", "Necn@2025")

# token -> roll_number (in memory; cleared when the server restarts)
SESSIONS: Dict[str, str] = {}

# ---------------------------------------------------------------------------
# TIME TABLE (B.Tech ECA, III-I, W.E.F. 06/10/2026) - typed from the timetable image
# ---------------------------------------------------------------------------
IST = timezone(timedelta(hours=5, minutes=30))

TIMETABLE_INFO = (
    "Department of Electronics & Communication Engineering\n"
    "B.Tech ECA | Class III-I | Room B-203 (Faraday's Block)\n"
    "Academic Year 2026-27 | W.E.F. 06/10/2026"
)

LUNCH = ("12:40-01:30", "LUNCH")

TIMETABLE = {
    "MON": [
        ("10:10-11:00", "CAO"), ("11:00-11:50", "DC"), ("11:50-12:40", "AWP"), LUNCH,
        ("01:30-02:20", "TECHNICAL"), ("02:20-05:00", "DC/MPMC LAB"),
    ],
    "TUE": [
        ("10:10-11:00", "DC"), ("11:00-11:50", "IQTA"), ("11:50-12:40", "RC-DC"), LUNCH,
        ("01:30-02:20", "TECHNICAL"), ("02:20-03:10", "CAO"), ("03:10-04:00", "AWP"),
        ("04:00-04:10", "BREAK"), ("04:10-05:00", "MPMC"),
    ],
    "WED": [
        ("10:10-11:00", "REASONING"), ("11:00-12:40", "MPMC/DC LAB"), LUNCH,
        ("01:30-02:20", "TECHNICAL"), ("02:20-03:10", "RC-AWP"), ("03:10-04:00", "GB"),
        ("04:00-04:10", "BREAK"), ("04:10-05:00", "MPMC"),
    ],
    "THU": [
        ("10:10-11:00", "REASONING"), ("11:00-11:50", "MPMC"), ("11:50-12:40", "DC"), LUNCH,
        ("01:30-02:20", "COMM SKILLS"), ("02:20-03:10", "VERBAL"), ("03:10-05:00", "PCB"),
    ],
    "FRI": [
        ("10:10-11:00", "DC"), ("11:00-12:40", "TINKERING LAB"), LUNCH,
        ("01:30-02:20", "MPMC"), ("02:20-03:10", "CAO"), ("03:10-04:00", "APTITUDE"),
        ("04:00-04:10", "BREAK"), ("04:10-05:00", "REASONING"),
    ],
    "SAT": [
        ("10:10-11:00", "GB"), ("11:00-11:50", "TECHNICAL"), ("11:50-12:40", "APTITUDE"), LUNCH,
        ("01:30-02:20", "AWP"), ("02:20-03:10", "IQTA"), ("03:10-04:00", "CAO"),
        ("04:00-04:10", "BREAK"), ("04:10-05:00", "RC-MPMC"),
    ],
}

DAY_NAMES = {
    "MON": "Monday", "TUE": "Tuesday", "WED": "Wednesday", "THU": "Thursday",
    "FRI": "Friday", "SAT": "Saturday", "SUN": "Sunday",
}
DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
DAY_PATTERNS = {
    "MON": r"\bmon(day)?\b", "TUE": r"\btue(s|sday)?\b", "WED": r"\bwed(nesday)?\b",
    "THU": r"\bthu(r|rs|rsday)?\b", "FRI": r"\bfri(day)?\b", "SAT": r"\bsat(urday)?\b",
    "SUN": r"\bsun(day)?\b",
}

SUBJECTS_TEXT = """Subjects and faculty (B.Tech ECA, III-I):
1. Microprocessors and Microcontrollers (MPMC) - 23EC2008 - Mr. T. Murali Krishna
2. Digital Communication (DC) - 23AC2002 - Mr. G. Gopi
3. Antenna and Wave Propagation (AWP) - 23EC2007 - Dr. K. S. Sagar Reddy
4. Computer Architecture and Organization (CAO) - 23EC4001 - Mr. P. Sravan Kumar Reddy
5. Sustainable Materials and Green Buildings (MOOCS) (GB) - 23CE3009 - Mrs. G. Shobana
6. Introduction to Quantum Technologies and Applications (IQTA) - 23ES1014 - Dr. K. Murali
7. Microprocessors and Microcontrollers Lab - 23EC2505 - Mr. T. Murali Krishna
8. Digital Communication Lab - 23AC2502 - Mrs. Syed Athika Sultana
9. Tinkering Lab - 23ES1507 - Dr. K. S. Sagar Reddy / Mr. A. Benjamin Paul
10. PCB Design and Prototype Development (PCB) - 23SC6110 - Ms. T. Rajitha / Mrs. V. Srilatha
11. Aptitude / Reasoning / Verbal
Class Incharge: Mr. V. Praveen Kumar"""


def detect_day(q: str) -> Optional[str]:
    now = datetime.now(IST)
    if "tomorrow" in q:
        return DAY_ORDER[(now.weekday() + 1) % 7]
    if "today" in q:
        return DAY_ORDER[now.weekday()]
    for key, pattern in DAY_PATTERNS.items():
        if re.search(pattern, q):
            return key
    return None


def format_day(day: str) -> str:
    if day not in TIMETABLE:
        return f"{DAY_NAMES.get(day, day)}: no classes (holiday)."
    lines = [f"{t}   {s}" for t, s in TIMETABLE[day]]
    return f"{DAY_NAMES[day]} time table:\n" + "\n".join(lines)


def answer_timetable(q: str) -> Optional[str]:
    if re.search(r"faculty|teacher|professor|subject code|subjects|in-?charge", q):
        return SUBJECTS_TEXT
    if not re.search(r"time\s*-?\s*table|timetable|\bperiods?\b|\bclasses\b", q):
        return None
    day = detect_day(q)
    if day:
        return TIMETABLE_INFO + "\n\n" + format_day(day)
    blocks = [format_day(d) for d in DAY_ORDER if d in TIMETABLE]
    return TIMETABLE_INFO + "\n\n" + "\n\n".join(blocks) + "\n\nAsk for a day, e.g. \"time table today\" or \"friday time table\"."


class LoginRequest(BaseModel):
    roll_number: str
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str


class ChatRequest(BaseModel):
    message: str
    roll_number: Optional[str] = None  # ignored; identity comes from the login token


def get_student_profile(roll_no: str):
    roll = roll_no.strip().upper()
    if roll not in STUDENT_REGISTRY:
        return {"valid": False}

    student_data = STUDENT_REGISTRY[roll]
    match = re.search(r"(\d+)$", roll)
    num = int(match.group(1)) if match else 1

    return {
        "valid": True,
        "roll_number": roll,
        "name": student_data["name"],
        "branch": "ECE-ACT",
        "section": "A",
        "batch_type": student_data["batch"],
        "attendance": student_data["attendance"],
        "marks": {
            "DC": f"{min(30, 20 + (num % 10))}/30",
            "MPMC": f"{min(30, 21 + ((num * 3) % 10))}/30",
            "VLSI": f"{min(30, 22 + ((num * 2) % 9))}/30",
            "AWP": f"{min(30, 19 + ((num * 4) % 11))}/30",
        },
    }


def create_session(roll: str) -> str:
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = roll
    return token


def get_current_roll(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing login token. Please sign in again.")
    token = authorization.split(" ", 1)[1].strip()
    roll = SESSIONS.get(token)
    if not roll or roll not in STUDENT_REGISTRY:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    return roll


@app.get("/")
def read_root():
    return {"status": "Online", "system": "Narayana AI ChatBox ECE-ACT Backend Active"}


@app.post("/api/login")
def student_login(req: LoginRequest):
    roll = req.roll_number.strip().upper()
    pwd = req.password.strip()

    if roll not in STUDENT_REGISTRY:
        raise HTTPException(status_code=401, detail="Roll Number not found in ECE-ACT database.")

    if not secrets.compare_digest(pwd, DEFAULT_PASSWORD):
        raise HTTPException(status_code=401, detail="Incorrect Password. Default is Necn@2025.")

    student = get_student_profile(roll)
    return {
        "success": True,
        "message": f"Welcome {student['name']}!",
        "student": student,
        "token": create_session(roll),
    }


@app.post("/api/google-login")
def google_login(req: GoogleLoginRequest):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not set in backend/.env")

    try:
        info = id_token.verify_oauth2_token(req.credential, grequests.Request(), GOOGLE_CLIENT_ID)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token.")

    if not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email is not verified.")

    roll = STUDENT_EMAILS.get(info["email"].strip().lower())
    if not roll or roll not in STUDENT_REGISTRY:
        raise HTTPException(
            status_code=403,
            detail="This Google account is not linked to any student. Sign in with your PIN instead.",
        )

    student = get_student_profile(roll)
    return {
        "success": True,
        "message": f"Welcome {student['name']}!",
        "student": student,
        "token": create_session(roll),
    }


@app.post("/api/chat")
def handle_chat(req: ChatRequest, authorization: Optional[str] = Header(default=None)):
    roll = get_current_roll(authorization)
    student = get_student_profile(roll)
    query = req.message.lower().strip()

    # 1. Local Database Lookup
    if "mark" in query or "mid score" in query or "score" in query:
        marks_str = "\n".join([f"• {sub}: {score}" for sub, score in student["marks"].items()])
        return {
            "response": f"📝 Mid Exam Scores for {student['name']} ({roll}):\n\n{marks_str}",
            "file_url": None,
            "is_image": False,
        }

    if "attendance" in query:
        return {
            "response": f"📊 Attendance status for {student['name']} ({roll}): {student['attendance']}",
            "file_url": None,
            "is_image": False,
        }

    if "profile" in query or "who am i" in query:
        return {
            "response": (
                f"👤 Student Record:\n• Name: {student['name']}\n• PIN Number: {roll}\n"
                f"• Department: {student['branch']}\n• Attendance: {student['attendance']}"
            ),
            "file_url": None,
            "is_image": False,
        }

    timetable_reply = answer_timetable(query)
    if timetable_reply:
        return {"response": timetable_reply, "file_url": None, "is_image": False}

    # 2. Document Context Parsing
    uploaded_docs_text = get_uploaded_docs_content()

    full_prompt = f"""
You are Narayana AI ChatBox for ECE-ACT department at Narayana Engineering College, Nellore.
Student: {student['name']} (PIN: {roll})

INTERNAL DATABASE & UPLOADED FILES:
{uploaded_docs_text[:8000] if uploaded_docs_text else "No uploaded class documents."}

COLLEGE KNOWLEDGE BASE:
{COLLEGE_TEXT_CONTEXT[:8000] if COLLEGE_TEXT_CONTEXT else "No college knowledge context."}

INSTRUCTIONS:
1. First, check if the student's question can be directly answered using the INTERNAL DATABASE or UPLOADED FILES provided above.
2. If the answer is present in internal files, answer directly using that information.
3. If NOT found in internal files, perform a web search to provide a clear, detailed, and accurate answer.
4. Do NOT output metadata like "Source: Google Search" or "Here is the answer for...". Provide a direct, professional response.
5. Use plain text only, without markdown symbols such as ** or #.

STUDENT QUESTION:
{req.message}
"""

    # 3. Gemini API with Google Search grounding
    # Set GEMINI_MODELS in .env (comma separated) to change these without editing code
    ACTIVE_MODELS = [
        m.strip()
        for m in os.getenv(
            "GEMINI_MODELS",
            "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest",
        ).split(",")
        if m.strip()
    ]

    if ai_client:
        for model_name in ACTIVE_MODELS:
            try:
                res = ai_client.models.generate_content(
                    model=model_name,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        tools=[types.Tool(google_search=types.GoogleSearch())]
                    ),
                )
                if res and res.text:
                    return {"response": res.text, "file_url": None, "is_image": False}
            except Exception as e:
                print(f"[Gemini] {model_name} with Google Search failed: {e}")
                try:
                    res = ai_client.models.generate_content(model=model_name, contents=full_prompt)
                    if res and res.text:
                        return {"response": res.text, "file_url": None, "is_image": False}
                except Exception as e2:
                    print(f"[Gemini] {model_name} without search failed: {e2}")
                    continue

    return {
        "response": f"Answers for '{req.message}' could not be fetched right now. Please verify that your GEMINI_API_KEY is set in backend/.env.",
        "file_url": None,
        "is_image": False,
    }