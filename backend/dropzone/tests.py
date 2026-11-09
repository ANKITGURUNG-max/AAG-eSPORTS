from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient
from django.core import signing
from .models import Payment, Registration, Team, TeamInvitation, TeamMember, Tournament, TournamentSlot, GameAccount
from .views import verify_payment

class TournamentTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="captain", password="Password123!")
        GameAccount.objects.create(user=self.user, game="free_fire", ign="Captain", uid="100")
        self.tournament = Tournament.objects.create(title="Test", slug="test", description="x", match_at=timezone.now()+timedelta(days=1), registration_deadline=timezone.now()+timedelta(hours=1), entry_fee=100, prize_pool=1000, status="upcoming")
        for n in range(1, 13): TournamentSlot.objects.create(tournament=self.tournament, number=n)
    def test_exact_slot_count(self): self.assertEqual(self.tournament.slots.count(), 12)

    def test_player_can_login_with_player_id_or_free_fire_uid(self):
        self.user.set_password("TestPassword123")
        self.user.save(update_fields=["password"])
        client = APIClient()
        for identifier in (self.user.player_id, "100"):
            response = client.post("/api/auth/login", {"identifier": identifier, "password": "TestPassword123"}, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertIn("access", response.data)

    def test_player_can_login_with_legacy_username_field(self):
        self.user.set_password("TestPassword123")
        self.user.save(update_fields=["password"])
        response = APIClient().post("/api/auth/login", {"username": "captain", "password": "TestPassword123"}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_first_time_registration_accepts_explicit_username(self):
        response = APIClient().post(
            "/api/auth/register",
            {
                "username": "newplayer",
                "email": "newplayer@example.com",
                "password": "TestPassword123",
                "first_name": "New",
                "last_name": "Player",
                "phone": "",
                "ign": "NewPlayer",
                "uid": "900",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["username"], "newplayer")
        self.assertTrue(GameAccount.objects.filter(uid="900", ign="NewPlayer", user__username="newplayer").exists())

    def test_signup_login_profile_contains_saved_game_account(self):
        client = APIClient()
        client.post(
            "/api/auth/register",
            {
                "username": "profileplayer",
                "email": "profileplayer@example.com",
                "password": "TestPassword123",
                "first_name": "Profile",
                "last_name": "Player",
                "phone": "",
                "ign": "ProfileIGN",
                "uid": "901",
            },
            format="json",
        )
        login = client.post("/api/auth/login", {"identifier": "profileplayer", "password": "TestPassword123"}, format="json")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        profile = client.get("/api/me/")
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data["game_accounts"][0]["ign"], "ProfileIGN")
        self.assertEqual(profile.data["game_accounts"][0]["uid"], "901")

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

    def test_roster_edit_ignores_empty_optional_player_slots(self):
        team = Team.objects.create(name="Solo squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        Registration.objects.create(tournament=self.tournament, team=team)
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.patch(
            f"/api/teams/{team.pk}/roster/",
            {"members": [{"player_id": self.user.player_id}, {"player_id": ""}, {"player_id": "  "}]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(team.members.count(), 1)

    def test_team_list_includes_saved_unregistered_teammate_uids(self):
        team = Team.objects.create(name="Saved squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        registration = Registration.objects.create(tournament=self.tournament, team=team)
        TeamInvitation.objects.create(registration=registration, uid="GUEST-300")
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.get(f"/api/teams/?tournament={self.tournament.pk}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["members"], [self.user.player_id, "GUEST-300"])

    def test_captain_can_request_cancellation(self):
        team = Team.objects.create(name="Cancel squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        registration = Registration.objects.create(tournament=self.tournament, team=team)
        Payment.objects.create(registration=registration, provider_reference="TEST-CANCEL-1", amount=100)
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.post(f"/api/teams/{team.pk}/retract/")

        self.assertEqual(response.status_code, 200)
        registration.refresh_from_db()
        self.assertTrue(registration.cancellation_requested)

    @override_settings(ADMIN_SESSION_MAX_AGE=3600)
    def test_admin_can_approve_cancellation_and_release_slot(self):
        team = Team.objects.create(name="Release squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        registration = Registration.objects.create(tournament=self.tournament, team=team, status="confirmed", slot=self.tournament.slots.get(number=1), cancellation_requested=True)
        payment = Payment.objects.create(registration=registration, provider_reference="TEST-CANCEL-2", amount=100, status="verified")
        client = APIClient()
        client.credentials(HTTP_X_ADMIN_TOKEN=signing.dumps({"role": "organiser"}, salt="aag-admin"))

        response = client.post(f"/api/admin/payments/{payment.pk}/cancel/")

        self.assertEqual(response.status_code, 200)
        registration.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(registration.status, "cancelled")
        self.assertIsNone(registration.slot_id)
        self.assertEqual(payment.status, "cancelled")

    def test_cancelled_team_is_not_returned_as_active_registration(self):
        team = Team.objects.create(name="Cancelled squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        Registration.objects.create(tournament=self.tournament, team=team, status="cancelled")
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.get(f"/api/teams/?tournament={self.tournament.pk}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_cancelled_registration_is_not_returned_in_participation_history(self):
        team = Team.objects.create(name="Cancelled history squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        Registration.objects.create(tournament=self.tournament, team=team, status="cancelled")
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.get("/api/my/participation")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

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

    @override_settings(ADMIN_SESSION_MAX_AGE=3600)
    def test_admin_can_approve_team_with_unregistered_teammate(self):
        team = Team.objects.create(name="Guest teammate squad", captain=self.user)
        TeamMember.objects.create(team=team, user=self.user, role="captain")
        registration = Registration.objects.create(tournament=self.tournament, team=team)
        TeamInvitation.objects.create(registration=registration, uid="GUEST-200")
        payment = Payment.objects.create(registration=registration, provider_reference="TEST-GUEST-1", amount=100)
        client = APIClient()
        client.credentials(HTTP_X_ADMIN_TOKEN=signing.dumps({"role": "organiser"}, salt="aag-admin"))

        response = client.post(f"/api/admin/payments/{payment.pk}/verify/")

        self.assertEqual(response.status_code, 200)
        registration.refresh_from_db()
        self.assertEqual(registration.status, "confirmed")
        self.assertEqual(registration.slot.number, 1)
