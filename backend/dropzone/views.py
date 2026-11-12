import hashlib
import hmac
import json
import uuid
from django.core import signing
from django.conf import settings
from django.db import DatabaseError, IntegrityError, OperationalError, transaction
import logging
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import *
from .serializers import *

logger = logging.getLogger(__name__)

class AdminAuthentication(JWTAuthentication):
    def authenticate(self, request):
        if request.headers.get("X-Admin-Token"):
            try:
                signing.loads(request.headers["X-Admin-Token"], max_age=settings.ADMIN_SESSION_MAX_AGE, salt="aag-admin")
                user = User.objects.filter(is_superuser=True).first() or User.objects.filter(is_admin=True).first()
                if user:
                    return (user, None)
            except signing.BadSignature:
                pass
        try:
            return super().authenticate(request)
        except Exception:
            return None

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
    authentication_classes = [AdminAuthentication]
    permission_classes = [IsAdmin]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def perform_create(self, serializer):
        announcement = serializer.save()
        if self.request.user.is_authenticated:
            AuditLog.objects.create(actor=self.request.user, action="create_announcement", entity="Announcement", entity_id=str(announcement.pk))

    def perform_update(self, serializer):
        announcement = serializer.save()
        if self.request.user.is_authenticated:
            AuditLog.objects.create(actor=self.request.user, action="update_announcement", entity="Announcement", entity_id=str(announcement.pk))

    def perform_destroy(self, instance):
        pk = instance.pk
        instance.delete()
        if self.request.user.is_authenticated:
            AuditLog.objects.create(actor=self.request.user, action="delete_announcement", entity="Announcement", entity_id=str(pk))

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
            Payment.objects.create(registration=registration, provider_reference=f"MANUAL-{registration.pk}-{uuid.uuid4().hex[:8]}", amount=data["tournament"].entry_fee)
        invites = registration.invitations.filter(status="pending")
        return Response({
            "registration_id": registration.id,
            "team_id": registration.team_id,
            "payment_status": "pending",
            "pending_invites": invites.count(),
            "invite_tokens": [{"uid": invite.uid, "token": str(invite.token)} for invite in invites],
        }, status=status.HTTP_201_CREATED)
    def list(self, request, *args, **kwargs):
        teams = self.queryset.filter(
            captain=request.user,
            registrations__status__in=["pending", "confirmed"],
        ).prefetch_related("members__user", "registrations__payment", "registrations__invitations")
        tournament_id = request.query_params.get("tournament")
        if tournament_id:
            teams = teams.filter(registrations__tournament_id=tournament_id)
        rows = []
        for team in teams:
            registration = team.registrations.first()
            invitations = registration.invitations.filter(status="pending") if registration else []
            rows.append({
                "id": team.id,
                "name": team.name,
                "members": [member.user.player_id for member in team.members.all()] + [invite.uid for invite in invitations],
                "registration_id": registration.id if registration else None,
                "payment_status": registration.payment.status if registration and hasattr(registration, "payment") else None,
                "registration_status": registration.status if registration else None,
                "cancellation_requested": registration.cancellation_requested if registration else False,
                "slot": registration.slot.number if registration and registration.slot else None,
                "invite_tokens": [{"uid": invite.uid, "token": str(invite.token)} for invite in invitations],
            })
        return Response(rows)
    @action(detail=True, methods=["patch"])
    def roster(self, request, pk=None):
        team = self.get_object()
        if team.captain_id != request.user.id:
            return Response({"detail": "Only the captain can edit this team."}, status=status.HTTP_403_FORBIDDEN)
        registration = team.registrations.select_related("tournament").first()
        if not registration or timezone.now() >= registration.tournament.registration_deadline:
            return Response({"detail": "Team edits are closed for this tournament."}, status=status.HTTP_400_BAD_REQUEST)
        members = [member for member in request.data.get("members", []) if member.get("player_id", "").strip()]
        if not 1 <= len(members) <= 4 or len({member["player_id"].strip().upper() for member in members}) != len(members):
            return Response({"detail": "A team must have between one and four unique players."}, status=status.HTTP_400_BAD_REQUEST)
        identifiers = [member["player_id"].strip().upper() for member in members]
        captain_account = request.user.game_accounts.filter(game="free_fire", uid__in=identifiers).exists()
        if request.user.player_id.upper() not in identifiers and not captain_account:
            return Response({"detail": "The captain must remain on the team."}, status=status.HTTP_400_BAD_REQUEST)
        users_by_identifier = {user.player_id.upper(): user for user in User.objects.filter(player_id__in=identifiers)}
        users_by_identifier.update({account.uid.upper(): account.user for account in GameAccount.objects.select_related("user").filter(game="free_fire", uid__in=identifiers)})
        for identifier in identifiers:
            user = users_by_identifier.get(identifier)
            if user and Registration.objects.filter(
                tournament=registration.tournament,
                team__members__user=user,
                status__in=["pending", "confirmed"],
            ).exclude(team_id=team.pk).exists():
                return Response({"detail": f"{identifier} is already registered for another team in this tournament."}, status=status.HTTP_400_BAD_REQUEST)
            if not user and TeamInvitation.objects.filter(
                registration__tournament=registration.tournament,
                uid__iexact=identifier,
                status__in=["pending", "claimed"],
            ).exclude(registration_id=registration.pk).exists():
                return Response({"detail": f"{identifier} is already invited to another team in this tournament."}, status=status.HTTP_400_BAD_REQUEST)
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

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def retract(self, request, pk=None):
        team = self.get_object()
        if team.captain_id != request.user.id:
            return Response({"detail": "Only the captain can request team cancellation."}, status=status.HTTP_403_FORBIDDEN)
        registration = team.registrations.select_related("payment").first()
        if not registration:
            return Response({"detail": "Registration not found."}, status=status.HTTP_404_NOT_FOUND)
        if registration.status in ("cancelled", "refunded"):
            return Response({"detail": "This team has already been cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        if registration.cancellation_requested:
            return Response({"status": "requested"})
        registration.cancellation_requested = True
        registration.cancellation_requested_at = timezone.now()
        registration.save(update_fields=["cancellation_requested", "cancellation_requested_at"])
        return Response({"status": "requested"})

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
        if not registration.team.members.exists():
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
        return Response({"registration_id": invitation.registration_id, "status": "claimed"})

class AdminPaymentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]
    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        try:
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(pk=pk)
                registration = Registration.objects.select_for_update().get(pk=payment.registration_id)
                if payment.status in ("cancelled", "refunded", "failed"):
                    return Response({"detail": f"This payment cannot be approved because it is {payment.status}."}, status=status.HTTP_400_BAD_REQUEST)
                if registration.cancellation_requested:
                    return Response({"detail": "This registration has a pending cancellation request."}, status=status.HTTP_400_BAD_REQUEST)
                if registration.status == "confirmed" and registration.slot_id:
                    return Response({"status": "verified", "slot": TournamentSlot.objects.get(pk=registration.slot_id).number})
                if not TeamMember.objects.filter(team_id=registration.team_id).exists():
                    return Response({"detail": "At least one confirmed team player is required before approval."}, status=status.HTTP_400_BAD_REQUEST)
                tournament = Tournament.objects.select_for_update().get(pk=registration.tournament_id)
                slots = TournamentSlot.objects.select_for_update().filter(tournament_id=tournament.pk).order_by("number")
                slot = next((candidate for candidate in slots if not Registration.objects.filter(slot_id=candidate.pk).exists()), None)
                if slot is None:
                    return Response({"detail": "No empty slots are available for this tournament."}, status=status.HTTP_409_CONFLICT)
                payment.status = "verified"
                payment.verified_at = timezone.now()
                payment.save(update_fields=["status", "verified_at"])
                registration.slot = slot
                registration.status = "confirmed"
                registration.save(update_fields=["slot", "status"])
                slot_number = slot.number
        except (IntegrityError, OperationalError, DatabaseError):
            logger.exception("Payment approval database failure for payment %s", pk)
            return Response({"detail": "The server could not save this approval. Please refresh the dashboard and try again."}, status=status.HTTP_409_CONFLICT)
        return Response({"status": "verified", "slot": slot_number})
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            payment = Payment.objects.select_for_update().select_related("registration").get(pk=pk)
            registration = Registration.objects.select_for_update().get(pk=payment.registration_id)
            if not registration.cancellation_requested:
                return Response({"detail": "This registration has no cancellation request."}, status=status.HTTP_400_BAD_REQUEST)
            registration.slot = None
            registration.status = "cancelled"
            registration.cancellation_requested = False
            registration.save(update_fields=["slot", "status", "cancellation_requested"])
            payment.status = "cancelled"
            payment.save(update_fields=["status"])
        return Response({"status": "cancelled"})
    def list(self, request):
        payments = Payment.objects.select_related("registration__team", "registration__tournament").order_by("created_at")
        return Response([{
            "id": payment.id,
            "reference": payment.provider_reference,
            "status": payment.status,
            "amount": str(payment.amount),
            "team": payment.registration.team.name,
            "tournament": payment.registration.tournament.title,
            "tournament_id": payment.registration.tournament_id,
            "pending_invites": list(payment.registration.invitations.filter(status="pending").values_list("uid", flat=True)),
            "cancellation_requested": payment.registration.cancellation_requested,
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

@api_view(["DELETE"])
@authentication_classes([AdminAuthentication])
@permission_classes([IsAdmin])
def admin_delete_announcement(request, announcement_id):
    try:
        announcement = Announcement.objects.get(pk=announcement_id)
    except Announcement.DoesNotExist:
        return Response({"detail": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)
    announcement.delete()
    if request.user.is_authenticated:
        AuditLog.objects.create(actor=request.user, action="delete_announcement", entity="Announcement", entity_id=str(announcement_id))
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
        team__members__user=request.user,
        status__in=["pending", "confirmed"],
    ).select_related("tournament", "team", "slot").distinct().order_by("-submitted_at")
    return Response([{
        "tournament_id": registration.tournament_id,
        "title": registration.tournament.title,
        "match_at": registration.tournament.match_at,
        "status": registration.status,
        "team": registration.team.name,
        "slot": registration.slot.number if registration.slot else None,
    } for registration in registrations])

# ----------------- PLAYER SEARCH & FRIEND SYSTEM -----------------

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def search_players(request):
    query = (
        request.query_params.get("uid", "")
        or request.query_params.get("q", "")
        or request.query_params.get("search", "")
    ).strip()
    
    if query:
        users = User.objects.filter(
            models.Q(game_accounts__uid__icontains=query) |
            models.Q(game_accounts__ign__icontains=query) |
            models.Q(username__icontains=query) |
            models.Q(player_id__icontains=query)
        ).distinct().select_related("profile").prefetch_related("game_accounts")[:30]
    else:
        # Default: list registered players in the directory (excluding current user)
        users = User.objects.exclude(id=request.user.id).select_related("profile").prefetch_related("game_accounts").order_by("-date_joined")[:20]
    
    friend_ids = set()
    fships = Friendship.objects.filter(models.Q(user1=request.user) | models.Q(user2=request.user))
    for f in fships:
        friend_ids.add(f.user2_id if f.user1_id == request.user.id else f.user1_id)
        
    sent_reqs = {r.receiver_id: r.id for r in FriendRequest.objects.filter(sender=request.user, status="pending")}
    received_reqs = {r.sender_id: r.id for r in FriendRequest.objects.filter(receiver=request.user, status="pending")}
    
    results = []
    for u in users:
        acc = next((a for a in u.game_accounts.all() if a.game == "free_fire"), None)
        photo_url = None
        if hasattr(u, "profile") and u.profile.photo:
            try:
                photo_url = u.profile.photo.url
            except Exception:
                photo_url = None
        if u.id == request.user.id:
            status_str = "self"
            req_id = None
        elif u.id in friend_ids:
            status_str = "friends"
            req_id = None
        elif u.id in sent_reqs:
            status_str = "pending_sent"
            req_id = sent_reqs[u.id]
        elif u.id in received_reqs:
            status_str = "pending_received"
            req_id = received_reqs[u.id]
        else:
            status_str = "none"
            req_id = None
            
        results.append({
            "id": u.id,
            "player_id": u.player_id,
            "username": u.username,
            "ign": acc.ign if acc else (f"{u.first_name} {u.last_name}".strip() or u.username),
            "uid": acc.uid if acc else u.player_id,
            "photo": photo_url,
            "status": status_str,
            "request_id": req_id,
        })
    return Response(results)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_friends(request):
    fships = Friendship.objects.filter(
        models.Q(user1=request.user) | models.Q(user2=request.user)
    ).select_related("user1", "user2", "user1__profile", "user2__profile").prefetch_related("user1__game_accounts", "user2__game_accounts")
    
    friends = []
    for f in fships:
        other = f.user2 if f.user1_id == request.user.id else f.user1
        account = next((a for a in other.game_accounts.all() if a.game == "free_fire"), None)
        photo_url = None
        if hasattr(other, "profile") and other.profile.photo:
            try: photo_url = other.profile.photo.url
            except Exception: photo_url = None
        friends.append({
            "friendship_id": f.id,
            "id": other.id,
            "player_id": other.player_id,
            "username": other.username,
            "ign": account.ign if account else "",
            "uid": account.uid if account else "",
            "photo": photo_url,
            "created_at": f.created_at,
        })
    return Response(friends)

@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def remove_friend(request, user_id):
    u1, u2 = (request.user.id, user_id) if request.user.id < user_id else (user_id, request.user.id)
    Friendship.objects.filter(user1_id=u1, user2_id=u2).delete()
    FriendRequest.objects.filter(
        (models.Q(sender=request.user, receiver_id=user_id) | models.Q(sender_id=user_id, receiver=request.user))
    ).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_friend_requests_received(request):
    reqs = FriendRequest.objects.filter(
        receiver=request.user, status="pending"
    ).select_related("sender", "sender__profile").prefetch_related("sender__game_accounts")
    
    output = []
    for r in reqs:
        sender = r.sender
        account = next((a for a in sender.game_accounts.all() if a.game == "free_fire"), None)
        photo_url = None
        if hasattr(sender, "profile") and sender.profile.photo:
            try: photo_url = sender.profile.photo.url
            except Exception: photo_url = None
        output.append({
            "id": r.id,
            "sender": {
                "id": sender.id,
                "player_id": sender.player_id,
                "username": sender.username,
                "ign": account.ign if account else "",
                "uid": account.uid if account else "",
                "photo": photo_url,
            },
            "created_at": r.created_at,
        })
    return Response(output)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_friend_requests_sent(request):
    reqs = FriendRequest.objects.filter(
        sender=request.user, status="pending"
    ).select_related("receiver", "receiver__profile").prefetch_related("receiver__game_accounts")
    
    output = []
    for r in reqs:
        rec = r.receiver
        account = next((a for a in rec.game_accounts.all() if a.game == "free_fire"), None)
        photo_url = None
        if hasattr(rec, "profile") and rec.profile.photo:
            try: photo_url = rec.profile.photo.url
            except Exception: photo_url = None
        output.append({
            "id": r.id,
            "receiver": {
                "id": rec.id,
                "player_id": rec.player_id,
                "username": rec.username,
                "ign": account.ign if account else "",
                "uid": account.uid if account else "",
                "photo": photo_url,
            },
            "created_at": r.created_at,
        })
    return Response(output)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def send_friend_request(request):
    target_user_id = request.data.get("user_id")
    target_uid = request.data.get("uid")
    if target_user_id:
        target_user = User.objects.filter(pk=target_user_id).first()
    elif target_uid:
        val = str(target_uid).strip()
        acc = GameAccount.objects.filter(game="free_fire", uid__iexact=val).select_related("user").first()
        target_user = acc.user if acc else User.objects.filter(models.Q(player_id__iexact=val) | models.Q(username__iexact=val)).first()
    else:
        return Response({"detail": "Player user ID, username, or Free Fire UID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
    if not target_user:
        return Response({"detail": "Player not found."}, status=status.HTTP_404_NOT_FOUND)
    if target_user.id == request.user.id:
        return Response({"detail": "You cannot send a friend request to yourself."}, status=status.HTTP_400_BAD_REQUEST)
        
    u1, u2 = (request.user.id, target_user.id) if request.user.id < target_user.id else (target_user.id, request.user.id)
    if Friendship.objects.filter(user1_id=u1, user2_id=u2).exists():
        return Response({"detail": "You are already friends with this player."}, status=status.HTTP_400_BAD_REQUEST)
        
    incoming = FriendRequest.objects.filter(sender=target_user, receiver=request.user, status="pending").first()
    if incoming:
        incoming.status = "accepted"
        incoming.save(update_fields=["status"])
        Friendship.objects.get_or_create(user1_id=u1, user2_id=u2)
        Notification.objects.create(user=target_user, title="Friend Request Accepted", body=f"{request.user.username} accepted your friend request.")
        Notification.objects.create(user=request.user, title="Friend Request Accepted", body=f"You and {target_user.username} are now friends.")
        return Response({"status": "accepted", "detail": f"You and {target_user.username} are now friends!"})
        
    if FriendRequest.objects.filter(sender=request.user, receiver=target_user, status="pending").exists():
        return Response({"detail": "A friend request is already pending for this player."}, status=status.HTTP_400_BAD_REQUEST)
        
    req, _ = FriendRequest.objects.update_or_create(sender=request.user, receiver=target_user, defaults={"status": "pending"})
    Notification.objects.create(user=target_user, title="Friend Request", body=f"{request.user.username} sent you a friend request.")
    return Response({"id": req.id, "status": "pending", "detail": f"Friend request sent to {target_user.username}."})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def accept_friend_request(request, request_id):
    req = get_object_or_404(FriendRequest, pk=request_id, receiver=request.user, status="pending")
    req.status = "accepted"
    req.save(update_fields=["status"])
    u1, u2 = (req.sender_id, request.user.id) if req.sender_id < request.user.id else (request.user.id, req.sender_id)
    Friendship.objects.get_or_create(user1_id=u1, user2_id=u2)
    Notification.objects.create(user=req.sender, title="Friend Request Accepted", body=f"{request.user.username} accepted your friend request.")
    return Response({"status": "accepted", "detail": f"You are now friends with {req.sender.username}."})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def reject_friend_request(request, request_id):
    req = get_object_or_404(FriendRequest, pk=request_id, receiver=request.user, status="pending")
    req.status = "rejected"
    req.save(update_fields=["status"])
    return Response({"status": "rejected", "detail": "Friend request rejected."})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def cancel_friend_request(request, request_id):
    req = get_object_or_404(FriendRequest, pk=request_id, sender=request.user, status="pending")
    req.status = "cancelled"
    req.save(update_fields=["status"])
    return Response({"status": "cancelled", "detail": "Friend request cancelled."})

# ----------------- SQUAD MANAGEMENT -----------------

def serialize_squad(squad, current_user=None):
    members = squad.members.select_related("user", "user__profile").prefetch_related("user__game_accounts").order_by("-role", "joined_at")
    member_data = []
    for m in members:
        u = m.user
        acc = next((a for a in u.game_accounts.all() if a.game == "free_fire"), None)
        photo_url = None
        if hasattr(u, "profile") and u.profile.photo:
            try: photo_url = u.profile.photo.url
            except Exception: photo_url = None
        member_data.append({
            "id": m.id,
            "user_id": u.id,
            "player_id": u.player_id,
            "username": u.username,
            "role": m.role,
            "ign": acc.ign if acc else "",
            "uid": acc.uid if acc else "",
            "photo": photo_url,
            "joined_at": m.joined_at,
        })
    invitations = []
    if current_user and squad.captain_id == current_user.id:
        for inv in squad.squad_invitations.filter(status="pending").select_related("invitee", "invitee__profile").prefetch_related("invitee__game_accounts"):
            inv_acc = next((a for a in inv.invitee.game_accounts.all() if a.game == "free_fire"), None)
            invitations.append({
                "id": inv.id,
                "invitee_id": inv.invitee.id,
                "username": inv.invitee.username,
                "ign": inv_acc.ign if inv_acc else "",
                "uid": inv_acc.uid if inv_acc else "",
                "created_at": inv.created_at,
            })
    return {
        "id": squad.id,
        "squad_id": squad.squad_id,
        "name": squad.name,
        "captain_id": squad.captain_id,
        "captain_username": squad.captain.username,
        "is_captain": current_user.id == squad.captain_id if current_user else False,
        "member_count": len(member_data),
        "members": member_data,
        "pending_invitations": invitations,
        "created_at": squad.created_at,
    }

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_squad(request):
    membership = SquadMember.objects.filter(user=request.user, squad__is_active=True).select_related("squad", "squad__captain").first()
    invitations = []
    for inv in SquadInvitation.objects.filter(invitee=request.user, status="pending", squad__is_active=True).select_related("squad", "inviter"):
        invitations.append({
            "id": inv.id,
            "squad_name": inv.squad.name,
            "squad_id": inv.squad.squad_id,
            "inviter_username": inv.inviter.username,
            "created_at": inv.created_at,
        })
    if not membership:
        return Response({"in_squad": False, "squad": None, "invitations": invitations})
    return Response({
        "in_squad": True,
        "squad": serialize_squad(membership.squad, request.user),
        "invitations": invitations,
    })

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_squad(request):
    if SquadMember.objects.filter(user=request.user, squad__is_active=True).exists():
        return Response({"detail": "You already belong to an active squad. Leave your current squad before creating a new one."}, status=status.HTTP_400_BAD_REQUEST)
    name = request.data.get("name", "").strip()
    if not name:
        return Response({"detail": "Squad name is required."}, status=status.HTTP_400_BAD_REQUEST)
    if Squad.objects.filter(name__iexact=name, is_active=True).exists():
        return Response({"detail": "A squad with this name already exists. Choose a unique name."}, status=status.HTTP_400_BAD_REQUEST)
    import random
    rand_code = f"{random.randint(1000, 9999)}"
    squad_code = f"AAG-SQ-{rand_code}"
    while Squad.objects.filter(squad_id=squad_code).exists():
        squad_code = f"AAG-SQ-{random.randint(1000, 9999)}"
    with transaction.atomic():
        squad = Squad.objects.create(name=name, squad_id=squad_code, captain=request.user, is_active=True)
        SquadMember.objects.create(squad=squad, user=request.user, role="captain")
        Notification.objects.create(user=request.user, title="Squad Created", body=f"Squad '{squad.name}' ({squad.squad_id}) has been created!")
    return Response(serialize_squad(squad, request.user), status=status.HTTP_201_CREATED)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def invite_to_squad(request):
    membership = SquadMember.objects.filter(user=request.user, squad__is_active=True, role="captain").select_related("squad").first()
    if not membership:
        return Response({"detail": "Only squad captains can invite members."}, status=status.HTTP_403_FORBIDDEN)
    squad = membership.squad
    if squad.members.count() >= 4:
        return Response({"detail": "Your squad is already full (maximum 4 players)."}, status=status.HTTP_400_BAD_REQUEST)
        
    target_user_id = request.data.get("user_id")
    target_uid = request.data.get("uid")
    if target_user_id:
        target_user = User.objects.filter(pk=target_user_id).first()
    elif target_uid:
        val = str(target_uid).strip()
        acc = GameAccount.objects.filter(game="free_fire", uid__iexact=val).select_related("user").first()
        target_user = acc.user if acc else User.objects.filter(models.Q(player_id__iexact=val) | models.Q(username__iexact=val)).first()
    else:
        return Response({"detail": "Friend user ID, username, or Free Fire UID required."}, status=status.HTTP_400_BAD_REQUEST)
        
    if not target_user:
        return Response({"detail": "Player not found."}, status=status.HTTP_404_NOT_FOUND)
    if target_user.id == request.user.id:
        return Response({"detail": "You cannot invite yourself to your squad."}, status=status.HTTP_400_BAD_REQUEST)
        
    u1, u2 = (request.user.id, target_user.id) if request.user.id < target_user.id else (target_user.id, request.user.id)
    if not Friendship.objects.filter(user1_id=u1, user2_id=u2).exists():
        return Response({"detail": f"{target_user.username} must be on your Friends list before you can invite them."}, status=status.HTTP_400_BAD_REQUEST)
        
    if SquadMember.objects.filter(user=target_user, squad__is_active=True).exists():
        return Response({"detail": f"{target_user.username} is already a member of an active squad."}, status=status.HTTP_400_BAD_REQUEST)
        
    if SquadInvitation.objects.filter(squad=squad, invitee=target_user, status="pending").exists():
        return Response({"detail": f"An invitation is already pending for {target_user.username}."}, status=status.HTTP_400_BAD_REQUEST)
        
    inv = SquadInvitation.objects.create(squad=squad, inviter=request.user, invitee=target_user, status="pending")
    Notification.objects.create(user=target_user, title="Squad Invitation", body=f"You have been invited to join squad '{squad.name}' by {request.user.username}.")
    return Response({"id": inv.id, "detail": f"Invitation sent to {target_user.username}."})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def accept_squad_invitation(request, invitation_id):
    invitation = get_object_or_404(SquadInvitation, pk=invitation_id, invitee=request.user, status="pending")
    squad = invitation.squad
    if not squad.is_active:
        return Response({"detail": "This squad is no longer active."}, status=status.HTTP_400_BAD_REQUEST)
    if squad.members.count() >= 4:
        return Response({"detail": "This squad is already full (maximum 4 players)."}, status=status.HTTP_400_BAD_REQUEST)
    if SquadMember.objects.filter(user=request.user, squad__is_active=True).exists():
        return Response({"detail": "You are already a member of an active squad. Leave it before accepting this invite."}, status=status.HTTP_400_BAD_REQUEST)
        
    with transaction.atomic():
        SquadMember.objects.create(squad=squad, user=request.user, role="member")
        invitation.status = "accepted"
        invitation.save(update_fields=["status"])
        SquadInvitation.objects.filter(invitee=request.user, status="pending").exclude(pk=invitation.pk).update(status="cancelled")
        Notification.objects.create(user=squad.captain, title="Squad Member Joined", body=f"{request.user.username} has joined your squad '{squad.name}'.")
        Notification.objects.create(user=request.user, title="Squad Joined", body=f"You have joined squad '{squad.name}'.")
    return Response({"status": "accepted", "squad": serialize_squad(squad, request.user)})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def reject_squad_invitation(request, invitation_id):
    invitation = get_object_or_404(SquadInvitation, pk=invitation_id, invitee=request.user, status="pending")
    invitation.status = "rejected"
    invitation.save(update_fields=["status"])
    return Response({"status": "rejected", "detail": "Squad invitation rejected."})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def leave_squad(request):
    membership = SquadMember.objects.filter(user=request.user, squad__is_active=True).select_related("squad").first()
    if not membership:
        return Response({"detail": "You are not currently in an active squad."}, status=status.HTTP_400_BAD_REQUEST)
    squad = membership.squad
    if membership.role == "captain":
        if squad.members.count() > 1:
            return Response({"detail": "As captain, you cannot leave while other members remain. Disband the squad or remove members first."}, status=status.HTTP_400_BAD_REQUEST)
        squad.is_active = False
        squad.save(update_fields=["is_active"])
        membership.delete()
        return Response({"detail": "Squad disbanded successfully."})
    else:
        membership.delete()
        Notification.objects.create(user=squad.captain, title="Squad Member Left", body=f"{request.user.username} has left the squad.")
        return Response({"detail": "You have left the squad."})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def disband_squad(request):
    membership = SquadMember.objects.filter(user=request.user, squad__is_active=True, role="captain").select_related("squad").first()
    if not membership:
        return Response({"detail": "Only the squad captain can disband the squad."}, status=status.HTTP_403_FORBIDDEN)
    squad = membership.squad
    with transaction.atomic():
        for m in squad.members.exclude(user=request.user):
            Notification.objects.create(user=m.user, title="Squad Disbanded", body=f"Squad '{squad.name}' has been disbanded by the captain.")
        squad.is_active = False
        squad.save(update_fields=["is_active"])
        squad.members.all().delete()
    return Response({"detail": "Squad disbanded successfully."})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def remove_squad_member(request, user_id):
    membership = SquadMember.objects.filter(user=request.user, squad__is_active=True, role="captain").select_related("squad").first()
    if not membership:
        return Response({"detail": "Only the squad captain can remove members."}, status=status.HTTP_403_FORBIDDEN)
    if user_id == request.user.id:
        return Response({"detail": "Captain cannot be removed from the squad. Disband the squad if needed."}, status=status.HTTP_400_BAD_REQUEST)
    target_membership = SquadMember.objects.filter(squad=membership.squad, user_id=user_id).first()
    if not target_membership:
        return Response({"detail": "Player is not a member of this squad."}, status=status.HTTP_404_NOT_FOUND)
    target_user = target_membership.user
    target_membership.delete()
    Notification.objects.create(user=target_user, title="Removed from Squad", body=f"You were removed from squad '{membership.squad.name}'.")
    return Response({"detail": f"{target_user.username} was removed from the squad."})

# ----------------- NOTIFICATIONS -----------------

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_notifications(request):
    notifs = Notification.objects.filter(user=request.user).order_by("-created_at")[:50]
    return Response(NotificationSerializer(notifs, many=True).data)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def unread_notifications_count(request):
    count = Notification.objects.filter(user=request.user, read_at__isnull=True).count()
    return Response({"unread_count": count})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_notification_read(request, notif_id):
    notif = get_object_or_404(Notification, pk=notif_id, user=request.user)
    if not notif.read_at:
        notif.read_at = timezone.now()
        notif.save(update_fields=["read_at"])
    return Response({"status": "read"})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timezone.now())
    return Response({"status": "all_read"})

# ----------------- ADMIN CONNECTIONS & SQUADS -----------------

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_connections(request):
    friendships = Friendship.objects.select_related("user1", "user2").prefetch_related("user1__game_accounts", "user2__game_accounts").order_by("-created_at")[:100]
    requests = FriendRequest.objects.filter(status="pending").select_related("sender", "receiver").prefetch_related("sender__game_accounts", "receiver__game_accounts").order_by("-created_at")[:100]
    
    connections_data = []
    for f in friendships:
        acc1 = next((a for a in f.user1.game_accounts.all() if a.game == "free_fire"), None)
        acc2 = next((a for a in f.user2.game_accounts.all() if a.game == "free_fire"), None)
        connections_data.append({
            "id": f.id,
            "type": "friendship",
            "status": "connected",
            "user1": {"id": f.user1.id, "username": f.user1.username, "player_id": f.user1.player_id, "ign": acc1.ign if acc1 else "", "uid": acc1.uid if acc1 else ""},
            "user2": {"id": f.user2.id, "username": f.user2.username, "player_id": f.user2.player_id, "ign": acc2.ign if acc2 else "", "uid": acc2.uid if acc2 else ""},
            "created_at": f.created_at,
        })
    requests_data = []
    for r in requests:
        acc1 = next((a for a in r.sender.game_accounts.all() if a.game == "free_fire"), None)
        acc2 = next((a for a in r.receiver.game_accounts.all() if a.game == "free_fire"), None)
        requests_data.append({
            "id": r.id,
            "type": "request",
            "status": "pending",
            "sender": {"id": r.sender.id, "username": r.sender.username, "player_id": r.sender.player_id, "ign": acc1.ign if acc1 else "", "uid": acc1.uid if acc1 else ""},
            "receiver": {"id": r.receiver.id, "username": r.receiver.username, "player_id": r.receiver.player_id, "ign": acc2.ign if acc2 else "", "uid": acc2.uid if acc2 else ""},
            "created_at": r.created_at,
        })
    return Response({"friendships": connections_data, "pending_requests": requests_data})

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_squads(request):
    squads = Squad.objects.select_related("captain").prefetch_related("members__user__game_accounts").order_by("-created_at")
    results = []
    for squad in squads:
        members_data = []
        for m in squad.members.all():
            acc = next((a for a in m.user.game_accounts.all() if a.game == "free_fire"), None)
            members_data.append({
                "id": m.user.id,
                "username": m.user.username,
                "player_id": m.user.player_id,
                "role": m.role,
                "ign": acc.ign if acc else "",
                "uid": acc.uid if acc else "",
            })
        results.append({
            "id": squad.id,
            "name": squad.name,
            "squad_id": squad.squad_id,
            "is_active": squad.is_active,
            "captain": {
                "id": squad.captain.id,
                "username": squad.captain.username,
                "player_id": squad.captain.player_id,
            },
            "member_count": len(members_data),
            "members": members_data,
            "created_at": squad.created_at,
        })
    return Response(results)

