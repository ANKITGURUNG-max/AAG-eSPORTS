from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from dropzone.models import Tournament, TournamentSlot, Announcement

class Command(BaseCommand):
    help = "Create clearly labelled local development data."
    def handle(self, *args, **options):
        User = get_user_model()
        user, created = User.objects.get_or_create(username="demo-captain", defaults={"email": "demo@example.test", "first_name": "Demo"})
        if created: user.set_password("DemoPass123!"); user.save()
        tournament, _ = Tournament.objects.get_or_create(slug="dropzone-demo-cup", defaults={
            "title": "DROPZONE Demo Cup", "description": "Development/demo tournament. Do not use for live registrations.",
            "rules": "Squad mode. Check-in opens 30 minutes before match time.", "match_at": timezone.now()+timedelta(days=7),
            "registration_deadline": timezone.now()+timedelta(days=5), "entry_fee": 100, "prize_pool": 1000, "status": "upcoming"
        })
        for number in range(1, 13): TournamentSlot.objects.get_or_create(tournament=tournament, number=number)
        Announcement.objects.get_or_create(title="Welcome to DROPZONE", defaults={"kind":"news", "body":"Demo data is enabled for local development.", "published":True, "published_at":timezone.now()})
        self.stdout.write(self.style.SUCCESS("Demo data ready: demo-captain / DemoPass123!"))
