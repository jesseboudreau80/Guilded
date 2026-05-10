from app.models.user import TierEnum

AI_LIMITS: dict[TierEnum, dict[str, int]] = {
    TierEnum.APPRENTICE: {"messages": 5, "max_tokens": 400},
    TierEnum.JOURNEYMAN: {"messages": 20, "max_tokens": 600},
    TierEnum.MASTER:     {"messages": 100, "max_tokens": 1200},
    TierEnum.HERO:       {"messages": 300, "max_tokens": 2000},
}

TIER_LEVEL: dict[TierEnum, int] = {
    TierEnum.APPRENTICE: 0,
    TierEnum.JOURNEYMAN: 1,
    TierEnum.MASTER:     2,
    TierEnum.HERO:       3,
}


def can_access(user_tier: TierEnum, required_tier: TierEnum) -> bool:
    return TIER_LEVEL[user_tier] >= TIER_LEVEL[required_tier]


EDUCATIONAL_DISCLAIMER = (
    "This content is provided for educational purposes only "
    "and does not constitute legal or financial advice."
)
