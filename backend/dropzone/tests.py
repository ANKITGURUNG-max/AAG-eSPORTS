from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient
from django.core import signing
from .models import Payment, Registration, Team, TeamMember, Tournament, TournamentSlot, GameAccount
from .views import verify_payment

class TournamentTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="captain", password="Password123!")
        GameAccount.objects.create(user=self.user, game="free_fire", ign="Captain", uid="100")
        self.tournament = Tournament.objects.create(title="Test", slug="test", description="x", match_at=timezone.now()+timedelta(days=1), registration_deadline=timezone.now()+timedelta(hours=1), entry_fee=100, prize_pool=1000, status="upcoming")
        for n in range(1, 13): TournamentSlot.objects.create(tournament=self.tournament, number=n)
    def test_exact_slot_count(self): self.assertEqual(self.tournament.slots.count(), 12)

    @override_settings(ADMIN_SESSION_MAX_AGE=3600)
    def test_admin_can_verify_pending_payment(self):
        team = Team.objects.create(name="Test squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        registration = Registration.objects.create(tournament=self.tournament, team=team)
        payment = Payment.objects.create(registration=registration, provider_reference="TEST-VERIFY-1", amount=100)
        client = APIClient()
        client.credentials(HTTP_X_ADMIN_TOKEN=signing.dumps({"role": "organiser"}, salt="aag-admin"))

        response = client.post(f"/api/admin/payments/{payment.pk}/verify/")

        self.assertEqual(response.status_code, 200)
        payment.refresh_from_db()
        registration.refresh_from_db()
        self.assertEqual(payment.status, "verified")
        self.assertEqual(registration.status, "confirmed")
        self.assertEqual(registration.slot.number, 1)

    @override_settings(ADMIN_SESSION_MAX_AGE=3600, PAYMENT_MODE="demo")
    def test_admin_approval_assigns_next_queue_slot(self):
        team = Team.objects.create(name="Demo squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        registration = Registration.objects.create(tournament=self.tournament, team=team)
        payment = Payment.objects.create(registration=registration, provider_reference="TEST-DEMO-1", amount=100)
        client = APIClient()
        client.credentials(HTTP_X_ADMIN_TOKEN=signing.dumps({"role": "organiser"}, salt="aag-admin"))

        response = client.post(f"/api/admin/payments/{payment.pk}/verify/")

        self.assertEqual(response.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, "verified")
        registration.refresh_from_db()
        self.assertEqual(registration.slot.number, 1)
