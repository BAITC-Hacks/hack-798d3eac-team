from .scoring import SCORING_RULES


def clarification_questions(task):
    """Deterministic MVP fallback: asks only about fields the business left blank."""
    questions = []
    for field, (_, recommendation) in SCORING_RULES.items():
        if not getattr(task, field, "").strip():
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
