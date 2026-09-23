from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health),
    path("tasks/", views.tasks),
    path("tasks/<int:task_id>/", views.task_detail),
    path("tasks/<int:task_id>/analysis/", views.task_analysis),
    path("tasks/<int:task_id>/publish/", views.publish_task),
    path("teams/", views.teams),
    path("proposals/", views.proposals),
    path("proposals/<int:proposal_id>/decision/", views.proposal_decision),
]
