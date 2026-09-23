import logging

from django.conf import settings

from .scoring import SCORING_RULES

logger = logging.getLogger(__name__)


def _fallback_questions(task):
    questions = []
    for fields, _, recommendation in SCORING_RULES.values():
        if not all(getattr(task, field, "").strip() for field in fields):
            questions.append(recommendation)
    fallback = [
        "Who will use the result?",
        "What result would make this work successful?",
        "What constraints should the team know about?",
    ]
    for question in fallback:
        if len(questions) >= 3:
            break
        if question not in questions:
            questions.append(question)
    return questions[:5]


def analyze_task(task):
    """Ask OpenAI for targeted clarification questions, with an offline fallback."""
    if not settings.API_KEY:
        return _fallback_questions(task), "fallback"

    try:
        import json
        from openai import OpenAI

        prompt = json.loads((settings.PROMPTS_DIR / "task_clarification.json").read_text(encoding="utf-8"))
        response = OpenAI(api_key=settings.API_KEY).responses.create(
            model=settings.OPENAI_MODEL,
            instructions=prompt["instructions"],
            input=json.dumps(
                {
                    "context": task.context,
                    "need": task.need,
                    "users": task.users,
                    "data_and_materials": task.data_and_materials,
                    "constraints": task.constraints,
                    "expected_result": task.expected_result,
                    "success_criteria": task.success_criteria,
                },
                ensure_ascii=False,
            ),
            text=prompt["text"],
        )
        parsed = json.loads(response.output_text)
        questions = parsed.get("questions") if isinstance(parsed, dict) else None
        if (
            isinstance(questions, list)
            and 3 <= len(questions) <= 5
            and all(isinstance(question, str) and question.strip() for question in questions)
        ):
            return [question.strip() for question in questions], "openai"
        logger.warning("OpenAI returned an invalid clarification response; using local fallback.")
    except Exception:
        # Keep analysis available when the key, network, API, or response is unavailable.
        logger.warning("OpenAI clarification failed; using local fallback.")

    return _fallback_questions(task), "fallback"


def clarification_questions(task):
    return analyze_task(task)[0]
