from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class ChallengeStatus(StrEnum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class ChallengeItem(BaseModel, extra="forbid"):
    category_id: int
    category: str
    recommendation: str = Field(description="Main-category advice")
    lower_carbon_alternative: str | None = Field(description="Sub-category alternative, when sub-category spend was entered")
    action: str | None = Field(description="Concrete action for the sub-category, when there is one")
    projected_savings_gbp: float | None = Field(ge=0, description="Monthly spend x reduction %")
    projected_carbon_reduction_kg: float | None = Field(ge=0, description="Monthly carbon x reduction %")
    priority: int | None = Field(description="1 = biggest carbon saving this month")
    status: ChallengeStatus
    started_at: datetime | None
    completed_at: datetime | None


class ChallengeStatusUpdate(BaseModel, extra="forbid"):
    status: ChallengeStatus


class ChallengeResponse(BaseModel, extra="forbid"):
    month: date
    challenges: list[ChallengeItem] = Field(description="Sorted by priority, biggest carbon saving first")


class MedalResponse(BaseModel, extra="forbid"):
    completed_challenges: int = Field(ge=0)
    medal: str | None = Field(description="Bronze (1+), Silver (2+), Gold (3+); null before the first completed challenge")
