import logging

from django.conf import settings

from ..task_fields import TASK_FIELDS

logger = logging.getLogger(__name__)


def _load_prompt_config():
    import json

    return json.loads((settings.PROMPTS_DIR / "task_clarification.json").read_text(encoding="utf-8"))


def _fallback_questions(task, prompt):
    questions = []
    for field in TASK_FIELDS:
        if not getattr(task, field, "").strip():
            question = prompt["fallback_questions_by_field"].get(field)
            if question:
                questions.append(question)
    for question in prompt["fallback_questions_generic"]:
        if len(questions) >= 3:
            break
        if question not in questions:
            questions.append(question)
    return questions[:5]


def analyze_task(task):
    """Ask OpenAI for targeted clarification questions, with an offline fallback."""
    prompt = _load_prompt_config()
    if not settings.API_KEY:
        return _fallback_questions(task, prompt), "fallback"

    try:
        import json
        from openai import OpenAI

        response = OpenAI(api_key=settings.API_KEY).responses.create(
            model=settings.OPENAI_MODEL,
            instructions=prompt["instructions"],
            input=json.dumps(
                {
                    field: getattr(task, field, "") for field in TASK_FIELDS
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

    return _fallback_questions(task, prompt), "fallback"


def clarification_questions(task):
    return analyze_task(task)[0]
