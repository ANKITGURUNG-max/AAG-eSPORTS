from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("dropzone", "0003_tournament_live_stream_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="registration",
            name="cancellation_requested",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="registration",
            name="cancellation_requested_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
