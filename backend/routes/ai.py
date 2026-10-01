"""
/api/ai — Natural language → SQL via LLM.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import get_db
from services import sql_generator, user_service
from services.llm_service import provider_status


router = APIRouter()


class Question(BaseModel):
    q: str


@router.get("/examples")
def examples():
    return {
        "examples": [
            "How many OTPs were generated today?",
            "Which branch has the highest OTP activity?",
            "Which branches have no OTP activity?",
            "What is the ETL success rate?",
            "Show OTP trends for the last 7 days",
            "What purpose generated the most OTPs?",
            "Who are the top 5 operators by volume?",
            "Give me a regional summary",
            "How many employees per region?",
            "Show me the recent ETL failures",
            "Top 10 branches with the most employees",
            "Which purposes are most popular?",
        ]
    }


@router.get("/provider")
def get_provider():
    return provider_status()


@router.post("/ask")
def ask(body: Question, db: Session = Depends(get_db)):
    q = body.q.strip()
    if not q:
        return {"error": "Empty question"}

    result = sql_generator.ask(db, q)

    try:
        user_service.log_action(
            db, None, "AI_QUERY", "ai", None,
            details=f"Q: {q[:200]}",
        )
    except Exception:
        pass

    return result