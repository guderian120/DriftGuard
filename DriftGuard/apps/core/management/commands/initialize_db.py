from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from apps.organizations.models import Organization
from apps.core.models import User


class Command(BaseCommand):
    help = 'Initialize database with default organization and admin user'

    def handle(self, *args, **options):
        # Create default organization
        org, created = Organization.objects.get_or_create(
            name='Default Organization',
            defaults={'slug': 'default'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created organization: {org.name}'))

        # Create admin user
        user, user_created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@driftguard.com',
                'password': make_password('admin123'),
                'organization': org,
                'role': 'admin',
                'first_name': 'Admin',
                'last_name': 'User'
            }
        )
        if user_created:
            self.stdout.write(self.style.SUCCESS(f'Created admin user: {user.username}'))

        # Create regular test user
        test_user, test_created = User.objects.get_or_create(
            username='user',
            defaults={
                'email': 'user@driftguard.com',
                'password': make_password('user123'),
                'organization': org,
                'role': 'editor',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        if test_created:
            self.stdout.write(self.style.SUCCESS(f'Created test user: {test_user.username}'))

        self.stdout.write(self.style.SUCCESS('Database initialization complete!'))
        self.stdout.write(self.style.SUCCESS(''))
        self.stdout.write(self.style.SUCCESS('Login credentials:'))
        self.stdout.write(self.style.SUCCESS('Admin: admin/admin123'))
        self.stdout.write(self.style.SUCCESS('User:  user/user123'))
