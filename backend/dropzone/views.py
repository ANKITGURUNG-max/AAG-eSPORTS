import hashlib
import hmac
import json
import uuid
from django.core import signing
from django.conf import settings
from django.db import IntegrityError, transaction
import logging
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .models import *
from .serializers import *

logger = logging.getLogger(__name__)

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.headers.get("X-Admin-Token"):
            try:
                signing.loads(request.headers["X-Admin-Token"], max_age=settings.ADMIN_SESSION_MAX_AGE, salt="aag-admin")
                return True
            except signing.BadSignature:
                return False
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_admin))

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def admin_login(request):
    password = request.data.get("password", "")
    if not settings.ADMIN_DASHBOARD_PASSWORD or not hmac.compare_digest(password, settings.ADMIN_DASHBOARD_PASSWORD):
        return Response({"detail": "Invalid organiser password."}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"token": signing.dumps({"role": "organiser"}, salt="aag-admin")})

class TournamentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tournament.objects.prefetch_related("slots").all()
    serializer_class = TournamentSerializer
    filterset_fields = ["status", "game"]

class AdminTournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all()
    serializer_class = AdminTournamentSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        tournament = serializer.save()
        for number in range(1, 13):
            TournamentSlot.objects.get_or_create(tournament=tournament, number=number)
        if self.request.user.is_authenticated:
            AuditLog.objects.create(actor=self.request.user, action="create_tournament", entity="Tournament", entity_id=str(tournament.pk))

    def perform_update(self, serializer):
        tournament = serializer.save()
        if self.request.user.is_authenticated:
            AuditLog.objects.create(actor=self.request.user, action="update_tournament", entity="Tournament", entity_id=str(tournament.pk))

class AdminAnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by("-created_at")
    serializer_class = AdminAnnouncementSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        announcement = serializer.save()
        if self.request.user.is_authenticated:
            AuditLog.objects.create(actor=self.request.user, action="create_announcement", entity="Announcement", entity_id=str(announcement.pk))

    def perform_update(self, serializer):
        announcement = serializer.save()
        if self.request.user.is_authenticated:
            AuditLog.objects.create(actor=self.request.user, action="update_announcement", entity="Announcement", entity_id=str(announcement.pk))

class AnnouncementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Announcement.objects.filter(published=True).order_by("-published_at")
    serializer_class = serializers.ModelSerializer
    def get_serializer_class(self):
        class AnnouncementSerializer(serializers.ModelSerializer):
            class Meta:
                model = Announcement
                fields = ["id", "kind", "title", "body", "image", "published_at"]
        return AnnouncementSerializer

class MeViewSet(viewsets.ViewSet):
    def list(self, request):
        profile, _ = PlayerProfile.objects.get_or_create(user=request.user)
        return Response(ProfileSerializer(profile).data)
    def update(self, request, pk=None):
        user = request.user
        for field in ["email", "phone", "first_name", "last_name"]:
            if field in request.data: setattr(user, field, request.data[field])
        user.save(update_fields=["email", "phone", "first_name", "last_name"])
        uid = request.data.get("uid", "").strip()
        if uid:
            duplicate = GameAccount.objects.filter(game="free_fire", uid=uid).exclude(user=user).exists()
            if duplicate:
                return Response({"detail": "That Free Fire UID is already linked to another player."}, status=status.HTTP_400_BAD_REQUEST)
        account, _ = GameAccount.objects.update_or_create(user=user, game="free_fire", defaults={"ign": request.data.get("ign", "").strip(), "uid": uid})
        user.save(update_fields=["email", "phone", "first_name", "last_name"])
        return Response(ProfileSerializer(PlayerProfile.objects.get(user=user)).data)

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.prefetch_related("members__user", "registrations")
    permission_classes = [permissions.IsAuthenticated]
    def get_serializer_class(self): return TeamCreateSerializer if self.action == "create" else UserSerializer
    def create(self, request, *args, **kwargs):
        serializer = TeamCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            team = Team.objects.create(name=data["name"], captain=request.user)
            registration = Registration.objects.create(tournament=data["tournament"], team=team)
            identifiers = [member["player_id"] for member in data["members"]]
            users_by_identifier = {user.player_id: user for user in User.objects.select_for_update().filter(player_id__in=identifiers)}
            users_by_identifier.update({account.uid: account.user for account in GameAccount.objects.select_related("user").filter(game="free_fire", uid__in=identifiers)})
            for identifier in identifiers:
                user = users_by_identifier.get(identifier)
                if user:
                    TeamMember.objects.create(team=team, user=user, role="captain" if user == request.user else "member")
                else:
                    TeamInvitation.objects.create(registration=registration, uid=identifier)
            payment = Payment.objects.create(registration=registration, provider_reference=f"MANUAL-{registration.pk}-{uuid.uuid4().hex[:8]}", amount=data["tournament"].entry_fee)
        if settings.PAYMENT_MODE == "demo" and not registration.invitations.filter(status="pending").exists():
            verify_payment(payment)
        invites = registration.invitations.filter(status="pending")
        return Response({
            "registration_id": registration.id,
            "team_id": registration.team_id,
            "payment_status": "pending",
            "pending_invites": invites.count(),
            "invite_tokens": [{"uid": invite.uid, "token": str(invite.token)} for invite in invites],
        }, status=status.HTTP_201_CREATED)
    def list(self, request, *args, **kwargs):
        teams = self.queryset.filter(captain=request.user)
        return Response([{"id": t.id, "name": t.name, "members": [m.user.player_id for m in t.members.all()]} for t in teams])
    @action(detail=True, methods=["patch"])
    def roster(self, request, pk=None):
        team = self.get_object()
        if team.captain_id != request.user.id:
            return Response({"detail": "Only the captain can edit this team."}, status=status.HTTP_403_FORBIDDEN)
        registration = team.registrations.select_related("tournament").first()
        if not registration or timezone.now() >= registration.tournament.registration_deadline:
            return Response({"detail": "Team edits are closed for this tournament."}, status=status.HTTP_400_BAD_REQUEST)
        members = request.data.get("members", [])
        if not 1 <= len(members) <= 4 or len({member.get("player_id", "").upper() for member in members}) != len(members):
            return Response({"detail": "A team must have between one and four unique players."}, status=status.HTTP_400_BAD_REQUEST)
        identifiers = [member["player_id"].strip().upper() for member in members]
        captain_account = request.user.game_accounts.filter(game="free_fire", uid__in=identifiers).exists()
        if request.user.player_id.upper() not in identifiers and not captain_account:
            return Response({"detail": "The captain must remain on the team."}, status=status.HTTP_400_BAD_REQUEST)
        users_by_identifier = {user.player_id.upper(): user for user in User.objects.filter(player_id__in=identifiers)}
        users_by_identifier.update({account.uid.upper(): account.user for account in GameAccount.objects.select_related("user").filter(game="free_fire", uid__in=identifiers)})
        with transaction.atomic():
            team.name = request.data.get("name", team.name).strip() or team.name
            team.save(update_fields=["name"])
            TeamMember.objects.filter(team=team).delete()
            TeamInvitation.objects.filter(registration=registration, status="pending").delete()
            for identifier in identifiers:
                user = users_by_identifier.get(identifier)
                if user:
                    TeamMember.objects.create(team=team, user=user, role="captain" if user == request.user else "member")
                else:
                    TeamInvitation.objects.create(registration=registration, uid=identifier)
        return Response({"team_id": team.id, "members": identifiers, "pending_invites": registration.invitations.filter(status="pending").count()})

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def payment_webhook(request):
    signature = request.headers.get("X-DROPZONE-SIGNATURE", "")
    expected = hmac.new(settings.PAYMENT_WEBHOOK_SECRET.encode(), request.body, hashlib.sha256).hexdigest()
    if not settings.PAYMENT_WEBHOOK_SECRET or not hmac.compare_digest(signature, expected):
        return Response({"detail": "Invalid webhook signature."}, status=401)
    payload = json.loads(request.body)
    payment = Payment.objects.get(provider_reference=payload["reference"])
    if payload.get("status") != "verified": return Response({"received": True})
    verify_payment(payment)
    return Response({"received": True})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def demo_payment(request, registration_id):
    if settings.PAYMENT_MODE != "demo":
        return Response({"detail": "Demo payments are disabled."}, status=404)
    payment = Payment.objects.select_related("registration__team").filter(registration_id=registration_id).first()
    if not payment or payment.registration.team.captain_id != request.user.id:
        return Response({"detail": "Payment not found."}, status=404)
    verified = verify_payment(payment)
    return Response({
        "status": verified.status,
        "registration_status": verified.registration.status,
        "slot": verified.registration.slot.number if verified.registration.slot else None,
        "demo": True,
    })

def verify_payment(payment):
    with transaction.atomic():
        locked = Payment.objects.select_for_update().select_related("registration__tournament").get(pk=payment.pk)
        registration = Registration.objects.select_for_update().get(pk=locked.registration_id)
        if locked.status == "verified" and registration.status == "confirmed": return locked
        if registration.invitations.filter(status="pending").exists() or not registration.team.members.exists():
            return locked
        tournament = Tournament.objects.select_for_update().get(pk=registration.tournament_id)
        slot = TournamentSlot.objects.select_for_update().filter(tournament=tournament, registration__isnull=True).order_by("number").first()
        if not slot or tournament.registrations.filter(status="confirmed").count() >= 12:
            locked.status = "failed"; locked.save(update_fields=["status"]); return locked
        locked.status = "verified"; locked.verified_at = timezone.now(); locked.save(update_fields=["status", "verified_at"])
        registration.slot = slot; registration.status = "confirmed"; registration.save(update_fields=["slot", "status"])
        return locked

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def claim_team_invitation(request, token):
    with transaction.atomic():
        invitation = TeamInvitation.objects.select_for_update().select_related("registration__team").filter(token=token, status="pending").first()
        if not invitation:
            return Response({"detail": "Invitation is invalid or already claimed."}, status=404)
        account = request.user.game_accounts.filter(game="free_fire", uid=invitation.uid, ign__gt="").first()
        if not account:
            return Response({"detail": f"Add Free Fire UID {invitation.uid} to your profile before claiming this invite."}, status=400)
        if TeamMember.objects.filter(team=invitation.registration.team, user=request.user).exists():
            return Response({"detail": "You are already on this team."}, status=400)
        TeamMember.objects.create(team=invitation.registration.team, user=request.user, role="member")
        invitation.user = request.user
        invitation.status = "claimed"
        invitation.claimed_at = timezone.now()
        invitation.save(update_fields=["user", "status", "claimed_at"])
        payment = Payment.objects.filter(registration=invitation.registration).first()
        if payment and settings.PAYMENT_MODE == "demo" and not invitation.registration.invitations.filter(status="pending").exists():
            verify_payment(payment)
        elif payment and payment.status == "verified":
            verify_payment(payment)
        return Response({"registration_id": invitation.registration_id, "status": "claimed"})

class AdminPaymentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]
    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        payment = get_object_or_404(Payment, pk=pk)
        registration = payment.registration
        if payment.status in ("cancelled", "refunded", "failed"):
            return Response({"detail": f"This payment cannot be verified because it is {payment.status}."}, status=status.HTTP_400_BAD_REQUEST)
        if payment.status == "verified" and registration.status == "confirmed":
            return Response({"status": payment.status, "slot": registration.slot.number if registration.slot else None})
        if registration.invitations.filter(status="pending").exists():
            return Response({"detail": "Verification is waiting for all invited players to claim their team invitations."}, status=status.HTTP_400_BAD_REQUEST)
        if not registration.team.members.exists():
            return Response({"detail": "Verification is waiting for at least one confirmed team player."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            verified = verify_payment(payment)
        except IntegrityError:
            logger.exception("Payment verification constraint failure for payment %s", payment.pk)
            return Response({"detail": "This payment could not be verified because the registration changed. Refresh the dashboard and try again."}, status=status.HTTP_409_CONFLICT)
        if request.user.is_authenticated:
            AuditLog.objects.create(actor=request.user, action="verify_payment", entity="Payment", entity_id=str(pk))
        if verified.status == "failed":
            return Response({"detail": "No tournament slots are available. The payment was not activated.", "status": verified.status}, status=status.HTTP_409_CONFLICT)
        registration = Registration.objects.select_related("slot").get(pk=registration.pk)
        return Response({"status": verified.status, "slot": registration.slot.number if registration.slot else None})
    def list(self, request):
        payments = Payment.objects.select_related("registration__team", "registration__tournament").order_by("-created_at")
        if settings.PAYMENT_MODE == "demo":
            for payment in payments:
                if payment.status == "pending" and not payment.registration.invitations.filter(status="pending").exists() and payment.registration.team.members.exists():
                    verify_payment(payment)
            payments = Payment.objects.select_related("registration__team", "registration__tournament").order_by("-created_at")
        return Response([{
            "id": payment.id,
            "reference": payment.provider_reference,
            "status": payment.status,
            "amount": str(payment.amount),
            "team": payment.registration.team.name,
            "tournament": payment.registration.tournament.title,
            "registration_id": payment.registration_id,
            "created_at": payment.created_at,
        } for payment in payments])

class AdminStatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]
    def list(self, request):
        return Response({"users": User.objects.count(), "active_tournaments": Tournament.objects.filter(status__in=["upcoming", "ongoing"]).count(), "registrations": Registration.objects.count(), "pending_payments": Payment.objects.filter(status="pending").count()})

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_players(request):
    players = User.objects.prefetch_related("game_accounts").order_by("-date_joined")
    return Response([{
        "id": player.id,
        "player_id": player.player_id,
        "username": player.username,
        "name": f"{player.first_name} {player.last_name}".strip(),
        "email": player.email,
        "phone": player.phone,
        "is_active": player.is_active,
        "date_joined": player.date_joined,
        "game_account": next(({
            "ign": account.ign,
            "uid": account.uid,
            "game": account.game,
        } for account in player.game_accounts.all() if account.game == "free_fire"), None),
    } for player in players])

@api_view(["DELETE"])
@permission_classes([IsAdmin])
def admin_delete_player(request, player_id):
    try:
        player = User.objects.get(pk=player_id)
    except User.DoesNotExist:
        return Response({"detail": "Player not found."}, status=status.HTTP_404_NOT_FOUND)
    if Team.objects.filter(captain=player).exists() or TeamMember.objects.filter(user=player).exists():
        return Response({"detail": "This player is linked to a team or registration and cannot be deleted until those records are resolved."}, status=status.HTTP_409_CONFLICT)
    player.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_tournament_roster(request, tournament_id):
    tournament = Tournament.objects.get(pk=tournament_id)
    registrations = Registration.objects.filter(tournament=tournament).select_related(
        "team", "team__captain", "slot", "payment"
    ).prefetch_related("team__members__user__game_accounts")
    by_slot = {registration.slot.number: registration for registration in registrations if registration.slot}
    rows = []
    for number in range(1, 13):
        registration = by_slot.get(number)
        if not registration:
            rows.append({"slot": number, "status": "available", "team": None, "players": []})
            continue
        players = []
        for member in registration.team.members.all():
            account = member.user.game_accounts.filter(game="free_fire").first()
            players.append({
                "player_id": member.user.player_id,
                "username": member.user.username,
                "role": member.role,
                "ign": account.ign if account else "",
                "uid": account.uid if account else "",
            })
        for invitation in registration.invitations.filter(status="pending"):
            players.append({"player_id": invitation.uid, "username": "", "role": "invited", "ign": "", "uid": invitation.uid})
        rows.append({
            "slot": number,
            "status": registration.status,
            "team": registration.team.name,
            "captain": registration.team.captain.player_id,
            "payment_status": registration.payment.status,
            "registration_id": registration.id,
            "players": players,
        })
    return Response({
        "tournament": {"id": tournament.id, "title": tournament.title, "match_at": tournament.match_at, "status": tournament.status},
        "slots": rows,
    })

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_tournament_slots(request):
    registrations = Registration.objects.filter(
        team__members__user=request.user, status="confirmed"
    ).select_related("tournament", "slot", "team").distinct()
    return Response([{
        "tournament_id": registration.tournament_id,
        "tournament": registration.tournament.title,
        "match_at": registration.tournament.match_at,
        "team": registration.team.name,
        "slot": registration.slot.number if registration.slot else None,
        "status": registration.status,
    } for registration in registrations])

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_participation(request):
    registrations = Registration.objects.filter(
        team__members__user=request.user
    ).select_related("tournament", "team", "slot").distinct().order_by("-submitted_at")
    return Response([{
        "tournament_id": registration.tournament_id,
        "title": registration.tournament.title,
        "match_at": registration.tournament.match_at,
        "status": registration.status,
        "team": registration.team.name,
        "slot": registration.slot.number if registration.slot else None,
    } for registration in registrations])
