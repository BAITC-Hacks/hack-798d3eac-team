import re


# The rubric scores the usefulness of the supplied content, not just whether a
# field contains characters. Each criterion keeps the weights from the task brief.
SCORING_RULES = {
    "context_and_need": (("context", "need"), 20, "Опишите текущую ситуацию и конкретное изменение, которое требуется."),
    "data_and_materials": (("data_and_materials",), 20, "Уточните, какие данные, примеры или источники доступны команде."),
    "expected_result": (("expected_result",), 15, "Опишите конкретный результат, который должна подготовить команда."),
    "success_criteria": (("success_criteria",), 15, "Добавьте проверяемые признаки успешного результата."),
    "constraints": (("constraints",), 10, "Укажите сроки, технологические требования, доступы и другие ограничения."),
    "users": (("users",), 10, "Уточните, кто будет пользоваться решением и в каком контексте."),
    "business_connection": (("contact", "collaboration_format"), 10, "Укажите ответственную роль, формат консультаций и обратной связи."),
}

_VAGUE_VALUES = {
    "не знаю", "неизвестно", "нет данных", "нет информации", "пока нет",
    "не определено", "любой", "все", "разное", "другое", "прочее",
    "уточнить позже", "будет позже", "-", "n/a", "нет", "todo", "тест",
}
_SPECIFICITY_RE = re.compile(
    r"\d|%|₸|\$|€|\b(?:до|после|за|в течение|ежедневно|еженедельно|"
    r"срок|дедлайн|например|метрик|показател|критери|источник|файл|"
    r"таблиц|систем|пользовател|клиент|сотрудник|прототип|отч[её]т|"
    r"встреч|созвон|обратн(?:ая|ой) связ|канал|доступ|ограничен)\w*",
    re.IGNORECASE,
)


def _field_quality(value, field):
    """Estimate how actionable a field is on a 0..1 scale using its content."""
    text = (value or "").strip()
    if not text:
        return 0.0

    normalized = re.sub(r"[.!?…,:;\s]+", " ", text.lower()).strip()
    if normalized in _VAGUE_VALUES:
        return 0.0

    words = re.findall(r"[\w%₸$€-]+", text, flags=re.UNICODE)
    word_count = len(words)
    if word_count <= 2:
        quality = 0.15
    elif word_count <= 5:
        quality = 0.35
    elif word_count <= 10:
        quality = 0.55
    else:
        quality = 0.68

    # Specific details make an answer more useful than length by itself.
    if _SPECIFICITY_RE.search(text):
        quality += 0.18
    if len(re.findall(r"[.!?;]", text)) >= 2:
        quality += 0.08
    if re.search(r"\b(?:не знаю|нет данных|не определено|уточним позже|пока не решили)\b", text, re.I):
        quality = min(quality, 0.2)

    if field == "success_criteria" and not re.search(r"\d|%|измер|метрик|показател|критери|срок|сократ|увелич|уменьш|дол[яи]|количеств", text, re.I):
        quality = min(quality, 0.55)
    if field == "data_and_materials" and not re.search(r"данн|источник|пример|файл|таблиц|систем|API|баз|доступ|нет", text, re.I):
        quality = min(quality, 0.55)
    if field == "expected_result" and not re.search(r"прототип|отч[её]т|модел|сервис|систем|документ|план|дашборд|инструмент|результат|список|макет|внедр", text, re.I):
        quality = min(quality, 0.6)
    if field == "users" and not re.search(r"клиент|пользовател|сотрудник|менеджер|оператор|врач|студент|покупател|специалист|команд|заказчик|посетител|для ", text, re.I):
        quality = min(quality, 0.6)

    return min(1.0, quality)


def _calculate_score(task, include_unconfirmed=False):
    earned, details, missing = 0, [], []
    confirmed = bool(getattr(task, "is_confirmed", False)) or include_unconfirmed

    for criterion, (fields, points, recommendation) in SCORING_RULES.items():
        qualities = [_field_quality(getattr(task, field, ""), field) for field in fields]
        quality = sum(qualities) / len(qualities)
        raw_points = round(points * quality)
        awarded = raw_points if confirmed else 0
        details.append({
            "field": criterion,
            "points": awarded,
            "max_points": points,
            "quality": round(quality * 100),
        })
        earned += awarded
        if quality < 0.7:
            missing.append(f"{recommendation} (критерий заполнен на {round(quality * 100)}%).")

    return earned, details, missing


def calculate_score(task):
    """Return the official content-quality score for confirmed task fields."""
    return _calculate_score(task)


def calculate_preview_score(task):
    """Return a draft score preview without changing confirmation or saved score."""
    return _calculate_score(task, include_unconfirmed=True)


def readiness_level(score):
    if score < 40:
        return "draft"
    if score < 70:
        return "working"
    if score < 90:
        return "ready"
    return "priority"
