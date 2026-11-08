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

    def test_roster_edit_rejects_player_on_another_team(self):
        User = get_user_model()
        other = User.objects.create_user(username="other", password="password123")
        GameAccount.objects.create(user=other, game="free_fire", ign="Other", uid="200")
        first_team = Team.objects.create(name="First squad", captain=self.user)
        TeamMember.objects.create(team=first_team, user=self.user, role="captain")
        first_registration = Registration.objects.create(tournament=self.tournament, team=first_team)
        second_team = Team.objects.create(name="Second squad", captain=other)
        TeamMember.objects.create(team=second_team, user=other, role="captain")
        Registration.objects.create(tournament=self.tournament, team=second_team)
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.patch(
            f"/api/teams/{first_team.pk}/roster/",
            {"members": [{"player_id": self.user.player_id}, {"player_id": other.player_id}]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("already registered", response.data["detail"])

    def test_roster_edit_allows_adding_new_player_to_current_team(self):
        teammate = get_user_model().objects.create_user(username="teammate", password="password123")
        GameAccount.objects.create(user=teammate, game="free_fire", ign="Teammate", uid="200")
        team = Team.objects.create(name="Current squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        Registration.objects.create(tournament=self.tournament, team=team)
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.patch(
            f"/api/teams/{team.pk}/roster/",
            {"members": [{"player_id": self.user.player_id}, {"player_id": teammate.player_id}]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(team.members.count(), 2)

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
