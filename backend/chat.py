import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from google import genai
from jwt_auth import verify_token
from rag_db import search_similar_chunks

router = APIRouter(tags=["Chat System"])

# Initialize Gemini client
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class ChatRequest(BaseModel):
    query: str
    department: str = None

@router.post("/chat/query")
def process_chat_query(request: ChatRequest, payload: dict = Depends(verify_token)):
    user_dept = request.department or payload.get("department") or "ECE"
    
    # 1. Retrieve top matching vector chunks from PostgreSQL
    matched_chunks = search_similar_chunks(request.query, department=user_dept, top_k=3)
    
    if not matched_chunks:
        context_str = "No specific college documentation found."
    else:
        context_str = "\n".join([f"- [{c['category']}]: {c['content']}" for c in matched_chunks])

    # 2. Build system prompt for Narayana College AI Assistant
    prompt = f"""You are the official Narayana Engineering College AI ChatBot Assistant.
Answer the user's question accurately using ONLY the context provided below.
If the answer is not contained in the context, politely inform the user to check with the department coordinator or official notice board.

Retrieved College Context:
{context_str}

User Query: {request.query}
User Role: {payload.get('role')}
User Department: {user_dept}

Answer:"""

    # 3. Call Gemini model to generate response
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return {
        "user_id": payload.get("sub"),
        "query": request.query,
        "retrieved_context": matched_chunks,
        "response": response.text
    }