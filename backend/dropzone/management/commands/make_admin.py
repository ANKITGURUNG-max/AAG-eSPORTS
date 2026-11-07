from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    help = "Grant the protected AAG eSports admin role to an existing user."

    def add_arguments(self, parser):
        parser.add_argument("username")

    def handle(self, *args, **options):
        User = get_user_model()
        try:
            user = User.objects.get(username=options["username"])
        except User.DoesNotExist as error:
            raise CommandError("No user exists with that username.") from error
        user.is_admin = True
        user.is_staff = True
        user.save(update_fields=["is_admin", "is_staff"])
        self.stdout.write(self.style.SUCCESS(f"Admin access granted to {user.username}."))
