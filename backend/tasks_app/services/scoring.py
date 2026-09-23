SCORING_RULES = {
    "context_and_need": (("context", "need"), 20, "Describe the current context and what needs to change."),
    "data_and_materials": (("data_and_materials",), 20, "Add available data, examples, or sources."),
    "expected_result": (("expected_result",), 15, "Describe the concrete expected result."),
    "success_criteria": (("success_criteria",), 15, "Add measurable success criteria."),
    "constraints": (("constraints",), 10, "Add deadlines, technology, access, or other constraints."),
    "users": (("users",), 10, "Specify the users of the solution."),
    "business_connection": (("contact", "collaboration_format"), 10, "Add a business contact and describe consultations and feedback."),
}


def calculate_score(task):
    earned, details, missing = 0, [], []
    for criterion, (fields, points, recommendation) in SCORING_RULES.items():
        filled = all(bool(getattr(task, field, "").strip()) for field in fields)
        confirmed = bool(getattr(task, "is_confirmed", False))
        awarded = points if filled and confirmed else 0
        details.append({"field": criterion, "points": awarded, "max_points": points})
        earned += awarded
        if not filled:
            missing.append(recommendation)
    return earned, details, missing


def readiness_level(score):
    if score < 40:
        return "draft"
    if score < 70:
        return "working"
    if score < 90:
        return "ready"
    return "priority"
