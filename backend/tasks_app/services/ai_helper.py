import logging

from django.conf import settings

from .scoring import SCORING_RULES, calculate_preview_score
from ..task_fields import TASK_FIELDS

logger = logging.getLogger(__name__)


def _load_prompt_config():
    import json

    return json.loads((settings.PROMPTS_DIR / "task_clarification.json").read_text(encoding="utf-8"))


def _fallback_questions(task, prompt):
    """Provide a Russian, task-aware fallback only when the AI is unavailable."""
    questions = []
    values = {field: getattr(task, field, "").strip() for field in TASK_FIELDS}
    _score, breakdown, _missing = calculate_preview_score(task)
    quality_by_criterion = {item["field"]: item["quality"] for item in breakdown}
    for criterion, (fields, _points, recommendation) in SCORING_RULES.items():
        if quality_by_criterion.get(criterion, 0) >= 70:
            continue
        details = [values[field] for field in fields if values[field]]
        context = f" В описании указано: «{details[0][:120]}»." if details else ""
        questions.append(f"{recommendation}{context} Что именно можно уточнить по этому пункту?")
        if len(questions) == 5:
            break

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

        task_fields = {field: getattr(task, field, "") for field in TASK_FIELDS}
        empty_fields = [field for field, value in task_fields.items() if not value.strip()]
        selection_rules = "\n".join(f"- {rule}" for rule in prompt["question_rules"])
        instructions = f"{prompt['instructions']}\n\nПравила выбора вопросов:\n{selection_rules}"
        response = OpenAI(api_key=settings.API_KEY).responses.create(
            model=settings.OPENAI_MODEL,
            instructions=instructions,
            input=json.dumps(
                {
                    "task_fields": task_fields,
                    "empty_fields": empty_fields,
                    "scoring_criteria": [
                        {"fields": fields, "points": points, "guidance": guidance}
                        for fields, points, guidance in SCORING_RULES.values()
                    ],
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
            and all(any("а" <= char.lower() <= "я" or char.lower() == "ё" for char in question) for question in questions)
        ):
            return [question.strip() for question in questions], "openai"
        logger.warning("OpenAI returned an invalid clarification response; using local fallback.")
    except Exception as exc:
        # Keep analysis available when the key, network, API, or response is unavailable.
        logger.warning("OpenAI clarification failed (%s); using local fallback.", type(exc).__name__)

    return _fallback_questions(task, prompt), "fallback"


def clarification_questions(task):
    return analyze_task(task)[0]
