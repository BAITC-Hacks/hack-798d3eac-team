from django.db import models


class Task(models.Model):
    title = models.CharField(max_length=200, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    context = models.TextField(blank=True)
    need = models.TextField(blank=True)
    users = models.TextField(blank=True)
    data_and_materials = models.TextField(blank=True)
    constraints = models.TextField(blank=True)
    expected_result = models.TextField(blank=True)
    success_criteria = models.TextField(blank=True)
    contact = models.CharField(max_length=255, blank=True)
    collaboration_format = models.TextField(blank=True)
    readiness_score = models.PositiveSmallIntegerField(default=0)
    is_confirmed = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title or f"Task #{self.pk}"


class Team(models.Model):
    name = models.CharField(max_length=150)
    interests = models.TextField(blank=True)
    skills = models.TextField(blank=True)
    technologies = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Proposal(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="proposals")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="proposals")
    idea = models.TextField()
    plan = models.TextField()
    duration = models.CharField(max_length=100)
    prototype_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.team} → {self.task}"
