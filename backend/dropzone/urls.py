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

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response({"player_id": user.player_id, "username": user.username}, status=201)

urlpatterns = [path("", include(router.urls)), path("auth/register", register), path("auth/login", TokenObtainPairView.as_view(serializer_class=PlayerTokenObtainPairSerializer)), path("auth/refresh", TokenRefreshView.as_view()), path("payments/webhook", payment_webhook), path("payments/demo/<int:registration_id>", demo_payment), path("teams/invitations/<str:token>/claim", claim_team_invitation), path("admin/login", admin_login), path("admin/players", admin_players), path("admin/players/<int:player_id>", admin_delete_player), path("admin/tournaments/<int:tournament_id>/roster", admin_tournament_roster), path("my/slots", my_tournament_slots), path("my/participation", my_participation)]
