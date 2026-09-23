import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Proposal, Task, Team
from .services.ai_helper import analyze_task
from .services.scoring import calculate_score, readiness_level
from .task_fields import TASK_FIELDS


def body(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def task_payload(task, include_proposals=False):
    score, breakdown, missing = calculate_score(task)
    if task.readiness_score != score:
        Task.objects.filter(pk=task.pk).update(readiness_score=score)
        task.readiness_score = score
    data = {field: getattr(task, field) for field in TASK_FIELDS}
    data.update({
        "id": task.id,
        "score": score,
        "readiness_level": readiness_level(score),
        "is_confirmed": task.is_confirmed,
        "is_published": task.is_published,
        "score_breakdown": breakdown,
        "missing_information": missing,
    })
    if include_proposals:
        data["proposals"] = [proposal_payload(item) for item in task.proposals.select_related("team")]
    return data


def proposal_payload(proposal):
    return {
        "id": proposal.id,
        "task_id": proposal.task_id,
        "team": {"id": proposal.team_id, "name": proposal.team.name},
        "idea": proposal.idea,
        "plan": proposal.plan,
        "duration": proposal.duration,
        "prototype_url": proposal.prototype_url,
        "status": proposal.status,
    }


@require_http_methods(["GET"])
def health(request):
    return JsonResponse({"status": "ok"})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def tasks(request):
    if request.method == "GET":
        queryset = Task.objects.filter(is_published=True).order_by("-readiness_score", "-updated_at")
        industry = request.GET.get("industry")
        if industry:
            queryset = queryset.filter(industry__iexact=industry)
        level = request.GET.get("readiness_level")
        level_ranges = {"draft": (0, 39), "working": (40, 69), "ready": (70, 89), "priority": (90, 100)}
        if level:
            if level not in level_ranges:
                return JsonResponse({"error": "readiness_level must be draft, working, ready, or priority."}, status=400)
            low, high = level_ranges[level]
            queryset = queryset.filter(readiness_score__gte=low, readiness_score__lte=high)
        return JsonResponse({"results": [task_payload(item) for item in queryset]})

    data = body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    if any(field in data and not isinstance(data[field], str) for field in TASK_FIELDS):
        return JsonResponse({"error": "Task fields must be strings."}, status=400)
    task = Task.objects.create(**{field: data.get(field, "") for field in TASK_FIELDS})
    return JsonResponse(task_payload(task), status=201)


@csrf_exempt
@require_http_methods(["GET", "PATCH"])
def task_detail(request, task_id):
    task = get_object_or_404(Task, pk=task_id)
    if request.method == "GET":
        return JsonResponse(task_payload(task, include_proposals=True))

    data = body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    if any(field in data and not isinstance(data[field], str) for field in TASK_FIELDS):
        return JsonResponse({"error": "Task fields must be strings."}, status=400)
    fields_changed = any(field in data and getattr(task, field) != data[field] for field in TASK_FIELDS)
    for field in TASK_FIELDS:
        if field in data:
            setattr(task, field, data[field])
    if fields_changed:
        task.is_confirmed = False
    if "is_confirmed" in data:
        task.is_confirmed = bool(data["is_confirmed"])
    score, _, _ = calculate_score(task)
    task.readiness_score = score
    task.save()
    return JsonResponse(task_payload(task))


@require_http_methods(["GET"])
def task_analysis(request, task_id):
    task = get_object_or_404(Task, pk=task_id)
    score, breakdown, missing = calculate_score(task)
    questions, ai_provider = analyze_task(task)
    return JsonResponse({
        "score": score,
        "readiness_level": readiness_level(score),
        "score_breakdown": breakdown,
        "missing_information": missing,
        "questions": questions,
        "ai_provider": ai_provider,
    })


@csrf_exempt
@require_http_methods(["POST"])
def publish_task(request, task_id):
    task = get_object_or_404(Task, pk=task_id)
    if not task.is_confirmed:
        return JsonResponse({"error": "Confirm the task before publishing."}, status=400)
    score, _, _ = calculate_score(task)
    task.readiness_score, task.is_published = score, True
    task.save(update_fields=["readiness_score", "is_published", "updated_at"])
    return JsonResponse(task_payload(task))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def teams(request):
    if request.method == "GET":
        return JsonResponse({"results": list(Team.objects.values("id", "name", "interests", "skills", "technologies"))})
    data = body(request)
    if data is None or not data.get("name", "").strip():
        return JsonResponse({"error": "Team name is required."}, status=400)
    team = Team.objects.create(**{key: data.get(key, "") for key in ("name", "interests", "skills", "technologies")})
    return JsonResponse({"id": team.id, "name": team.name}, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def proposals(request):
    if request.method == "GET":
        return JsonResponse({"results": [proposal_payload(item) for item in Proposal.objects.select_related("team")]})
    data = body(request)
    required = ("task_id", "team_id", "idea", "plan", "duration")
    if data is None or any(not str(data.get(field, "")).strip() for field in required):
        return JsonResponse({"error": "task_id, team_id, idea, plan, and duration are required."}, status=400)
    task = get_object_or_404(Task, pk=data["task_id"])
    if not task.is_published:
        return JsonResponse({"error": "Only published tasks can receive proposals."}, status=400)
    team = get_object_or_404(Team, pk=data["team_id"])
    proposal = Proposal.objects.create(task=task, team=team, idea=data["idea"], plan=data["plan"], duration=data["duration"], prototype_url=data.get("prototype_url", ""))
    return JsonResponse(proposal_payload(proposal), status=201)


@csrf_exempt
@require_http_methods(["POST"])
def proposal_decision(request, proposal_id):
    proposal = get_object_or_404(Proposal, pk=proposal_id)
    data = body(request)
    status = data.get("status") if data else None
    if status not in (Proposal.Status.ACCEPTED, Proposal.Status.REJECTED):
        return JsonResponse({"error": "status must be accepted or rejected."}, status=400)
    proposal.status = status
    proposal.save(update_fields=["status"])
    return JsonResponse(proposal_payload(proposal))
