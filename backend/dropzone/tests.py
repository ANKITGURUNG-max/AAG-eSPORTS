from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Tournament, TournamentSlot, GameAccount
from .views import verify_payment

class TournamentTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="captain", password="Password123!")
        GameAccount.objects.create(user=self.user, game="free_fire", ign="Captain", uid="100")
        self.tournament = Tournament.objects.create(title="Test", slug="test", description="x", match_at=timezone.now()+timedelta(days=1), registration_deadline=timezone.now()+timedelta(hours=1), entry_fee=100, prize_pool=1000, status="upcoming")
        for n in range(1, 13): TournamentSlot.objects.create(tournament=self.tournament, number=n)
    def test_exact_slot_count(self): self.assertEqual(self.tournament.slots.count(), 12)
