from django.contrib import admin
from .models import *

for model in [User, PlayerProfile, GameAccount, Tournament, TournamentSlot, Team, TeamMember, Registration, Payment, Announcement, Notification, AuditLog]:
    admin.site.register(model)
