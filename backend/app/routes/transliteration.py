import argparse

import torch
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from functools import lru_cache

# AI4Bharat transliteration
from ai4bharat.transliteration import XlitEngine


router = APIRouter(prefix="/api", tags=["transliteration"])


# Request format from frontend
class TransliterationRequest(BaseModel):
    text: str
    language: str


# Load each language engine only once
@lru_cache(maxsize=2)
def get_engine(language: str):
    # Required workaround for loading the AI4Bharat model
    torch.serialization.add_safe_globals([argparse.Namespace])

    return XlitEngine(
        language,
        beam_width=5,
        rescore=False
    )


@router.post("/transliterate")
def transliterate(request: TransliterationRequest):
    text = request.text.strip()
    language = request.language.lower()

    if language not in ["hindi", "marathi"]:
        raise HTTPException(
            status_code=400,
            detail="Language must be hindi or marathi"
        )

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )

    # AI4Bharat uses language codes
    language_code = {
        "hindi": "hi",
        "marathi": "mr"
    }[language]

    try:
        engine = get_engine(language_code)

        result = engine.translit_word(text)

        # Extract the first transliteration candidate
        if isinstance(result, dict):
            candidates = result.get(language_code, [])

            if isinstance(candidates, list):
                transliterated_text = (
                    candidates[0] if candidates else text
                )
            else:
                transliterated_text = candidates or text

        elif isinstance(result, list):
            transliterated_text = (
                result[0] if result else text
            )

        else:
            transliterated_text = str(result)

        return {
            "original": text,
            "transliterated": transliterated_text,
            "language": language
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transliteration failed: {str(e)}"
        )