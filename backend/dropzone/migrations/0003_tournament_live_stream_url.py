from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("dropzone", "0002_teaminvitation"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="live_stream_url",
            field=models.URLField(blank=True),
        ),
    ]
