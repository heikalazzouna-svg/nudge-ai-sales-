from .user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserRead,
    UserSettingsBase,
    UserSettingsCreate,
    UserSettingsUpdate,
    UserSettingsRead,
)
from .lead import (
    LeadBase,
    LeadCreate,
    LeadUpdate,
    LeadRead,
    LeadBulkCreate,
)
from .campaign import (
    CampaignBase,
    CampaignCreate,
    CampaignUpdate,
    CampaignRead,
    CampaignStats,
    CampaignWithStats,
)

__all__ = [
    # User schemas
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserRead",
    "UserSettingsBase",
    "UserSettingsCreate",
    "UserSettingsUpdate",
    "UserSettingsRead",
    # Lead schemas
    "LeadBase",
    "LeadCreate",
    "LeadUpdate",
    "LeadRead",
    "LeadBulkCreate",
    # Campaign schemas
    "CampaignBase",
    "CampaignCreate",
    "CampaignUpdate",
    "CampaignRead",
    "CampaignStats",
    "CampaignWithStats",
]
