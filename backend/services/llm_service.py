"""
LLM provider abstraction.
Supports: Anthropic Claude, OpenAI GPT, Ollama (local), or Mock (no API).
Configure via LLM_PROVIDER in .env.
"""

import os
import json
from typing import Optional


LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mock").lower()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "codellama")


# ═══════════════════════════════════════════════════════════════
# MAIN ENTRY
# ═══════════════════════════════════════════════════════════════

def generate_sql(prompt: str, system: str = "") -> dict:
    """
    Send prompt to the configured LLM.
    Returns { sql, raw, provider, error } .
    """
    provider = LLM_PROVIDER

    try:
        if provider == "claude":
            return _call_claude(prompt, system)
        elif provider == "openai":
            return _call_openai(prompt, system)
        elif provider == "ollama":
            return _call_ollama(prompt, system)
        else:
            return _call_mock(prompt, system)
    except Exception as e:
        return {"sql": None, "raw": None, "provider": provider, "error": str(e)}


# ═══════════════════════════════════════════════════════════════
# PROVIDERS
# ═══════════════════════════════════════════════════════════════

def _call_claude(prompt: str, system: str) -> dict:
    """Anthropic Claude 3.5 Sonnet."""
    if not ANTHROPIC_API_KEY:
        return {"sql": None, "error": "ANTHROPIC_API_KEY not set"}

    try:
        from anthropic import Anthropic
    except ImportError:
        return {"sql": None, "error": "Run: pip install anthropic"}

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text
    return {"sql": _extract_sql(raw), "raw": raw, "provider": "claude"}


def _call_openai(prompt: str, system: str) -> dict:
    """OpenAI GPT-4o mini."""
    if not OPENAI_API_KEY:
        return {"sql": None, "error": "OPENAI_API_KEY not set"}

    try:
        from openai import OpenAI
    except ImportError:
        return {"sql": None, "error": "Run: pip install openai"}

    client = OpenAI(api_key=OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=1024,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    raw = resp.choices[0].message.content
    return {"sql": _extract_sql(raw), "raw": raw, "provider": "openai"}


def _call_ollama(prompt: str, system: str) -> dict:
    """Local Ollama (CodeLlama, SQLCoder, etc.)."""
    try:
        import requests
    except ImportError:
        return {"sql": None, "error": "Run: pip install requests"}

    try:
        res = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": f"{system}\n\n{prompt}",
                "stream": False,
                "options": {"temperature": 0.1},
            },
            timeout=60,
        )
        res.raise_for_status()
        data = res.json()
        raw = data.get("response", "")
        return {"sql": _extract_sql(raw), "raw": raw, "provider": "ollama"}
    except Exception as e:
        return {"sql": None, "error": str(e)}


def _call_mock(prompt: str, system: str) -> dict:
    """
    Fallback: rule-based SQL generator.
    Used when no LLM provider is configured.
    """
    q = prompt.lower()

    if "how many otp" in q or "total otp" in q:
        sql = "SELECT COUNT(*) AS total_otp FROM otp_report"
    elif "how many branch" in q or "total branch" in q:
        sql = "SELECT COUNT(*) AS total_branches FROM branch"
    elif "how many employee" in q or "total employee" in q:
        sql = "SELECT COUNT(*) AS total_employees FROM branch_employee"
    elif "top branch" in q or "highest otp" in q:
        sql = """
            SELECT b.BRANCH_NAME, b.REGION, COUNT(*) AS otp_count
            FROM otp_report o
            JOIN branch b ON b.BM_CODE = o.BM_CODE
            GROUP BY b.BM_CODE, b.BRANCH_NAME, b.REGION
            ORDER BY otp_count DESC
            LIMIT 10
        """
    elif "operator" in q:
        sql = """
            SELECT OPERATOR, COUNT(*) AS otp_count
            FROM otp_report
            WHERE OPERATOR IS NOT NULL
            GROUP BY OPERATOR
            ORDER BY otp_count DESC
            LIMIT 20
        """
    elif "purpose" in q:
        sql = """
            SELECT PURPOSE, COUNT(*) AS otp_count
            FROM otp_report
            GROUP BY PURPOSE
            ORDER BY otp_count DESC
        """
    elif "without otp" in q or "no otp" in q:
        sql = """
            SELECT b.BM_CODE, b.BRANCH_NAME, b.REGION
            FROM branch b
            LEFT JOIN otp_report o ON o.BM_CODE = b.BM_CODE
            WHERE o.ID IS NULL
            LIMIT 100
        """
    elif "trend" in q and ("7" in q or "week" in q):
        sql = """
            SELECT OTP_DATE, COUNT(*) AS otp_count
            FROM otp_report
            WHERE OTP_DATE >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY OTP_DATE ORDER BY OTP_DATE
        """
    else:
        sql = "SELECT 'No matching query' AS message"

    return {
        "sql": sql.strip(),
        "raw": sql.strip(),
        "provider": "mock",
    }


def _extract_sql(text: str) -> Optional[str]:
    """Pull SQL out of LLM output (handles ```sql fences)."""
    if not text:
        return None

    text = text.strip()

    # Markdown code fence
    if "```sql" in text:
        start = text.find("```sql") + 6
        end = text.find("```", start)
        return text[start:end].strip()
    if "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        return text[start:end].strip()

    # Already plain SQL
    if text.lower().startswith("select"):
        return text.split(";")[0].strip()

    # Look for SELECT anywhere
    idx = text.lower().find("select")
    if idx >= 0:
        return text[idx:].split(";")[0].strip()

    return None


def provider_status() -> dict:
    """Return current provider config."""
    return {
        "provider": LLM_PROVIDER,
        "configured": {
            "claude": bool(ANTHROPIC_API_KEY),
            "openai": bool(OPENAI_API_KEY),
            "ollama": LLM_PROVIDER == "ollama",
            "mock": LLM_PROVIDER == "mock",
        },
        "model": {
            "claude": "claude-3-5-sonnet-20241022",
            "openai": "gpt-4o-mini",
            "ollama": OLLAMA_MODEL,
            "mock": "rule-based",
        }.get(LLM_PROVIDER, "unknown"),
    }