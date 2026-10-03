import random
from sqlalchemy import text
from database import engine

def generate_embedding(text_content: str) -> list[float]:
    """Generates a deterministic mock 768-dimensional vector for testing."""
    random.seed(hash(text_content))
    return [random.uniform(-1.0, 1.0) for _ in range(768)]

def add_document_chunk(department: str, category: str, content: str):
    """Generates embedding and inserts a document chunk into PostgreSQL."""
    embedding = generate_embedding(content)
    embedding_str = "[" + ",".join(map(str, embedding)) + "]"
    
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO document_chunks (department, category, content, embedding)
                VALUES (:department, :category, :content, CAST(:embedding AS vector))
            """),
            {
                "department": department,
                "category": category,
                "content": content,
                "embedding": embedding_str
            }
        )
    return True

def search_similar_chunks(query: str, department: str = None, top_k: int = 3):
    """Performs cosine distance vector similarity search on document_chunks."""
    query_embedding = generate_embedding(query)
    query_embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
    
    sql_query = """
        SELECT department, category, content, 1 - (embedding <=> CAST(:query_vec AS vector)) AS similarity
        FROM document_chunks
    """
    
    params = {"query_vec": query_embedding_str, "top_k": top_k}
    
    if department:
        sql_query += " WHERE department = :dept OR department = 'ALL'"
        params["dept"] = department
        
    sql_query += " ORDER BY embedding <=> CAST(:query_vec AS vector) LIMIT :top_k;"
    
    with engine.begin() as conn:
        results = conn.execute(text(sql_query), params).mappings().all()
        
    return [dict(row) for row in results]