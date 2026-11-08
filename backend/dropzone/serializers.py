from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import *

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "player_id", "username", "email", "phone", "first_name", "last_name", "is_admin"]
        read_only_fields = ["id", "player_id", "is_admin"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    username = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)
    class Meta:
        model = User
        fields = ["username", "email", "password", "phone", "first_name", "last_name"]
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class PlayerTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "identifier"
    identifier = serializers.CharField(required=False, write_only=True)
    username = serializers.CharField(required=False, write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["identifier"].required = False

    def validate(self, attrs):
        identifier = attrs.get("identifier") or attrs.get("username")
        if not identifier:
            raise serializers.ValidationError("Enter your username, Player ID, or Free Fire UID.")
        user = User.objects.filter(username__iexact=identifier).first()
        if not user:
            user = User.objects.filter(player_id__iexact=identifier).first()
        if not user:
            account = GameAccount.objects.filter(game="free_fire", uid__iexact=identifier).select_related("user").first()
            user = account.user if account else None
        if not user or not user.check_password(attrs["password"]):
            raise serializers.ValidationError("Invalid username, Player ID, Free Fire UID, or password.")
        self.user = user
        refresh = self.get_token(user)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}

class GameAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameAccount
        fields = ["id", "game", "ign", "uid"]

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    game_accounts = GameAccountSerializer(many=True, source="user.game_accounts", read_only=True)
    class Meta:
        model = PlayerProfile
        fields = ["user", "photo", "bio", "game_accounts"]

class SlotSerializer(serializers.ModelSerializer):
    occupied = serializers.SerializerMethodField()
    team = serializers.SerializerMethodField()
    def get_occupied(self, obj): return hasattr(obj, "registration") and obj.registration.status == "confirmed"
    def get_team(self, obj):
        if not self.get_occupied(obj): return None
        team = obj.registration.team
        return {"name": team.name, "captain": team.captain.player_id}
    class Meta:
        model = TournamentSlot
        fields = ["number", "occupied", "team"]

class TournamentSerializer(serializers.ModelSerializer):
    slots = SlotSerializer(many=True, read_only=True)
    filled_slots = serializers.SerializerMethodField()
    def get_filled_slots(self, obj): return obj.registrations.filter(status="confirmed").count()
    class Meta:
        model = Tournament
        fields = "__all__"

class AdminTournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = ["id", "game", "title", "slug", "description", "rules", "match_at",
                  "registration_deadline", "entry_fee", "prize_pool", "mode", "status",
                  "live_stream_url"]

class AdminAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ["id", "kind", "title", "body", "published", "published_at"]
        read_only_fields = ["id", "published_at"]

    def update(self, instance, validated_data):
        if validated_data.get("published") and not instance.published:
            validated_data["published_at"] = timezone.now()
        elif validated_data.get("published") is False:
            validated_data["published_at"] = None
        return super().update(instance, validated_data)

    def create(self, validated_data):
        if validated_data.get("published"):
            validated_data["published_at"] = timezone.now()
        return super().create(validated_data)

class TeamMemberInputSerializer(serializers.Serializer):
    player_id = serializers.CharField()

class TeamCreateSerializer(serializers.Serializer):
    tournament = serializers.PrimaryKeyRelatedField(queryset=Tournament.objects.all())
    name = serializers.CharField(max_length=100)
    members = TeamMemberInputSerializer(many=True)
    def validate(self, attrs):
        attrs["members"] = [member for member in attrs["members"] if member["player_id"].strip()]
        identifiers = [member["player_id"].strip().upper() for member in attrs["members"]]
        if not 1 <= len(identifiers) <= 4 or len(set(identifiers)) != len(identifiers):
            raise serializers.ValidationError("A team must have between one and four unique players.")
        if self.context["request"].user.player_id.upper() not in identifiers:
            raise serializers.ValidationError("The captain must be included in the squad.")
        tournament = attrs["tournament"]
        if tournament.status not in ("upcoming",) or timezone.now() >= tournament.registration_deadline:
            raise serializers.ValidationError("Registration is closed for this tournament.")
        identifiers = [m["player_id"].strip() for m in attrs["members"]]
        users = list(User.objects.filter(player_id__in=identifiers))
        accounts = list(GameAccount.objects.filter(game="free_fire", uid__in=identifiers).select_related("user"))
        users_by_identifier = {user.player_id: user for user in users}
        users_by_identifier.update({account.uid: account.user for account in accounts})
        captain = self.context["request"].user
        for identifier in identifiers:
            user = users_by_identifier.get(identifier)
            if not user:
                continue
            if Registration.objects.filter(tournament=tournament, team__members__user=user, status__in=["pending", "confirmed"]).exists():
                raise serializers.ValidationError(f"{identifier} is already registered for this tournament.")
        if captain.player_id.upper() not in identifiers and not captain.game_accounts.filter(game="free_fire", uid__in=identifiers).exists():
            raise serializers.ValidationError("The captain's own Free Fire UID must be included.")
        return attrs
