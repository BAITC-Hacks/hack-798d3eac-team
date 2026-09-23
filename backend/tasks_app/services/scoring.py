SCORING_RULES = {
    "context": (10, "Describe the current business context."),
    "need": (10, "State the problem or change you need."),
    "data_and_materials": (20, "Add available data, examples, or sources."),
    "expected_result": (15, "Describe the concrete expected result."),
    "success_criteria": (15, "Add measurable success criteria."),
    "constraints": (10, "Add deadlines, technology, access, or other constraints."),
    "users": (10, "Specify the users of the solution."),
    "contact": (5, "Add a business contact."),
    "collaboration_format": (5, "Describe consultations and feedback format."),
}


def calculate_score(task):
    earned, details, missing = 0, [], []
    for field, (points, recommendation) in SCORING_RULES.items():
        filled = bool(getattr(task, field, "").strip())
        details.append({"field": field, "points": points if filled else 0, "max_points": points})
        if filled:
            earned += points
        else:
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
