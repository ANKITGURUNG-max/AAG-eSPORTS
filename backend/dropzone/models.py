import uuid
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.db import models

class User(AbstractUser):
    player_id = models.CharField(max_length=16, unique=True, editable=False)
    phone = models.CharField(max_length=20, blank=True)
    is_admin = models.BooleanField(default=False)
    def save(self, *args, **kwargs):
        if not self.player_id:
            self.player_id = f"DZ-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

class PlayerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    photo = models.ImageField(upload_to="profiles/", blank=True, null=True)
    bio = models.CharField(max_length=160, blank=True)

class GameAccount(models.Model):
    GAME_CHOICES = [("free_fire", "Free Fire")]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="game_accounts")
    game = models.CharField(max_length=30, choices=GAME_CHOICES)
    ign = models.CharField(max_length=40)
    uid = models.CharField(max_length=30)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "game"], name="one_game_account_per_user")]
        indexes = [models.Index(fields=["game", "uid"])]

class Tournament(models.Model):
    STATUS = [("draft", "Draft"), ("upcoming", "Upcoming"), ("ongoing", "Ongoing"), ("completed", "Completed"), ("closed", "Closed")]
    MODE = [("squad", "Squad")]
    game = models.CharField(max_length=30, default="free_fire")
    title = models.CharField(max_length=160)
    slug = models.SlugField(unique=True)
    banner = models.ImageField(upload_to="tournaments/", blank=True, null=True)
    description = models.TextField()
    rules = models.TextField(blank=True)
    match_at = models.DateTimeField()
    registration_deadline = models.DateTimeField()
    entry_fee = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    prize_pool = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    mode = models.CharField(max_length=20, choices=MODE, default="squad")
    status = models.CharField(max_length=20, choices=STATUS, default="draft")
    live_stream_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class TournamentSlot(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="slots")
    number = models.PositiveSmallIntegerField()
    class Meta:
        constraints = [models.UniqueConstraint(fields=["tournament", "number"], name="unique_tournament_slot")]
        ordering = ["number"]

class Team(models.Model):
    name = models.CharField(max_length=100)
    captain = models.ForeignKey(User, on_delete=models.PROTECT, related_name="captained_teams")
    created_at = models.DateTimeField(auto_now_add=True)

class TeamMember(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="team_memberships")
    role = models.CharField(max_length=10, choices=[("captain", "Captain"), ("member", "Member")])
    class Meta:
        constraints = [models.UniqueConstraint(fields=["team", "user"], name="unique_team_member")]

class TeamInvitation(models.Model):
    STATUS = [("pending", "Pending"), ("claimed", "Claimed"), ("cancelled", "Cancelled")]
    registration = models.ForeignKey("Registration", on_delete=models.CASCADE, related_name="invitations")
    uid = models.CharField(max_length=30)
    token = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="team_invitations")
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    claimed_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["registration", "uid"], name="unique_registration_invite_uid")]

class Registration(models.Model):
    STATUS = [("pending", "Pending"), ("confirmed", "Confirmed"), ("cancelled", "Cancelled"), ("refunded", "Refunded")]
    tournament = models.ForeignKey(Tournament, on_delete=models.PROTECT, related_name="registrations")
    team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name="registrations")
    slot = models.OneToOneField(TournamentSlot, on_delete=models.PROTECT, related_name="registration", null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    cancellation_requested = models.BooleanField(default=False)
    cancellation_requested_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["tournament", "team"], name="unique_team_tournament")]

class Payment(models.Model):
    STATUS = [("pending", "Pending"), ("verified", "Verified"), ("failed", "Failed"), ("cancelled", "Cancelled"), ("refunded", "Refunded")]
    registration = models.OneToOneField(Registration, on_delete=models.PROTECT, related_name="payment")
    provider = models.CharField(max_length=30, default="manual")
    provider_reference = models.CharField(max_length=120, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Announcement(models.Model):
    KIND = [("news", "News"), ("patch", "Patch"), ("maintenance", "Maintenance"), ("tournament", "Tournament"), ("schedule", "Schedule")]
    kind = models.CharField(max_length=20, choices=KIND)
    title = models.CharField(max_length=160)
    body = models.TextField()
    image = models.ImageField(upload_to="announcements/", blank=True, null=True)
    published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=160)
    body = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class AuditLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.PROTECT, related_name="audit_logs")
    action = models.CharField(max_length=80)
    entity = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

class FriendRequest(models.Model):
    STATUS = [("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected"), ("cancelled", "Cancelled")]
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_requests")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_requests")
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["sender", "receiver"], name="unique_friend_request")]

class Friendship(models.Model):
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friendships_as_user1")
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friendships_as_user2")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user1", "user2"], name="unique_friendship")]

class Squad(models.Model):
    name = models.CharField(max_length=100, unique=True)
    squad_id = models.CharField(max_length=20, unique=True, editable=False)
    captain = models.ForeignKey(User, on_delete=models.PROTECT, related_name="captained_squads")
    logo = models.ImageField(upload_to="squads/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.squad_id:
            import random
            rand_code = f"{random.randint(1000, 9999)}"
            self.squad_id = f"AAG-SQ-{rand_code}"
        super().save(*args, **kwargs)

class SquadMember(models.Model):
    squad = models.ForeignKey(Squad, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="squad_memberships")
    role = models.CharField(max_length=10, choices=[("captain", "Captain"), ("member", "Member")])
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["squad", "user"], name="unique_squad_member")]

class SquadInvitation(models.Model):
    STATUS = [("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected"), ("cancelled", "Cancelled")]
    squad = models.ForeignKey(Squad, on_delete=models.CASCADE, related_name="squad_invitations")
    inviter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_squad_invitations")
    invitee = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_squad_invitations")
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["squad", "invitee"], name="unique_squad_invitation")]

