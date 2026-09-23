from django.contrib import admin

from .models import Proposal, Task, Team

admin.site.register(Task)
admin.site.register(Team)
admin.site.register(Proposal)
