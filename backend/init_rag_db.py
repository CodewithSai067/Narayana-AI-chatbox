from sqlalchemy import text
from database import engine

def setup_rag_database():
    with engine.begin() as conn:
        # Enable pgvector extension
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        
        # Create table for storing college documents & embeddings
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id SERIAL PRIMARY KEY,
                department VARCHAR(50) NOT NULL,
                category VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                embedding vector(768),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Create HNSW vector index for ultra-fast similarity search
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
            ON document_chunks 
            USING hnsw (embedding vector_cosine_ops);
        """))
        
    print("pgvector extension and document_chunks table initialized successfully!")

if __name__ == "__main__":
    setup_rag_database()