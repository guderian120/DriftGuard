def get_queryset(self):
        """Filter repositories by user's organization"""
        user_org_ids = [self.request.user.organization.id]
        return IaCRepository.objects.filter(organization_id__in=user_org_ids).select_related('organization', 'created_by')
