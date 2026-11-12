from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import *
from .serializers import PlayerTokenObtainPairSerializer, RegisterSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

router = DefaultRouter()
router.register("tournaments", TournamentViewSet, basename="tournament")
router.register("announcements", AnnouncementViewSet, basename="announcement")
router.register("teams", TeamViewSet, basename="team")
router.register("me", MeViewSet, basename="me")
router.register("admin/payments", AdminPaymentViewSet, basename="admin-payment")
router.register("admin/stats", AdminStatsViewSet, basename="admin-stats")
router.register("admin/tournaments", AdminTournamentViewSet, basename="admin-tournament")
router.register("admin/announcements", AdminAnnouncementViewSet, basename="admin-announcement")

@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "service": "AAG eSports API"})

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    account = user.game_accounts.filter(game="free_fire").first()
    return Response({
        "player_id": user.player_id,
        "username": user.username,
        "game_account": {"ign": account.ign, "uid": account.uid} if account else None,
    }, status=201)

urlpatterns = [
    path("health", health_check),
    path("admin/announcements/<int:announcement_id>", admin_delete_announcement),
    path("admin/announcements/<int:announcement_id>/", admin_delete_announcement),
    path("announcements/<int:announcement_id>", admin_delete_announcement),
    path("announcements/<int:announcement_id>/", admin_delete_announcement),
    path("", include(router.urls)),
    path("auth/register", register),
    path("auth/login", TokenObtainPairView.as_view(serializer_class=PlayerTokenObtainPairSerializer)),
    path("auth/refresh", TokenRefreshView.as_view()),
    path("payments/webhook", payment_webhook),
    path("payments/demo/<int:registration_id>", demo_payment),
    path("teams/invitations/<str:token>/claim", claim_team_invitation),
    path("admin/login", admin_login),
    path("admin/players", admin_players),
    path("admin/players/<int:player_id>", admin_delete_player),
    path("admin/tournaments/<int:tournament_id>/roster", admin_tournament_roster),
    path("my/slots", my_tournament_slots),
    path("my/slots/", my_tournament_slots),
    path("my/participation", my_participation),
    path("my/participation/", my_participation),

    # Player Search
    path("players/search", search_players),
    path("players/search/", search_players),

    # Friends & Requests
    path("friends", list_friends),
    path("friends/", list_friends),
    path("friends/<int:user_id>", remove_friend),
    path("friends/<int:user_id>/", remove_friend),
    path("friends/request", send_friend_request),
    path("friends/request/", send_friend_request),
    path("friends/requests/received", list_friend_requests_received),
    path("friends/requests/received/", list_friend_requests_received),
    path("friends/requests/sent", list_friend_requests_sent),
    path("friends/requests/sent/", list_friend_requests_sent),
    path("friends/requests/<int:request_id>/accept", accept_friend_request),
    path("friends/requests/<int:request_id>/accept/", accept_friend_request),
    path("friends/requests/<int:request_id>/reject", reject_friend_request),
    path("friends/requests/<int:request_id>/reject/", reject_friend_request),
    path("friends/requests/<int:request_id>/cancel", cancel_friend_request),
    path("friends/requests/<int:request_id>/cancel/", cancel_friend_request),

    # Squads
    path("squads/me", my_squad),
    path("squads/me/", my_squad),
    path("squads", create_squad),
    path("squads/", create_squad),
    path("squads/invite", invite_to_squad),
    path("squads/invite/", invite_to_squad),
    path("squads/invitations/<int:invitation_id>/accept", accept_squad_invitation),
    path("squads/invitations/<int:invitation_id>/accept/", accept_squad_invitation),
    path("squads/invitations/<int:invitation_id>/reject", reject_squad_invitation),
    path("squads/invitations/<int:invitation_id>/reject/", reject_squad_invitation),
    path("squads/leave", leave_squad),
    path("squads/leave/", leave_squad),
    path("squads/disband", disband_squad),
    path("squads/disband/", disband_squad),
    path("squads/members/<int:user_id>/remove", remove_squad_member),
    path("squads/members/<int:user_id>/remove/", remove_squad_member),

    # Notifications
    path("notifications", list_notifications),
    path("notifications/", list_notifications),
    path("notifications/unread-count", unread_notifications_count),
    path("notifications/unread-count/", unread_notifications_count),
    path("notifications/<int:notif_id>/read", mark_notification_read),
    path("notifications/<int:notif_id>/read/", mark_notification_read),
    path("notifications/read-all", mark_all_notifications_read),
    path("notifications/read-all/", mark_all_notifications_read),

    # Admin Management
    path("admin/connections", admin_connections),
    path("admin/connections/", admin_connections),
    path("admin/squads", admin_squads),
    path("admin/squads/", admin_squads),
]
