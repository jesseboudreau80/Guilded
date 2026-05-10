import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AccountTypeEnum(str, enum.Enum):
    CHECKING     = "CHECKING"
    SAVINGS      = "SAVINGS"
    CREDIT_CARD  = "CREDIT_CARD"
    LOAN         = "LOAN"
    INVESTMENT   = "INVESTMENT"
    OTHER        = "OTHER"


class TransactionCategoryEnum(str, enum.Enum):
    INCOME       = "INCOME"
    HOUSING      = "HOUSING"
    FOOD         = "FOOD"
    TRANSPORT    = "TRANSPORT"
    UTILITIES    = "UTILITIES"
    ENTERTAINMENT = "ENTERTAINMENT"
    DEBT_PAYMENT = "DEBT_PAYMENT"
    TRANSFER     = "TRANSFER"
    OTHER        = "OTHER"


class LedgerAccount(Base):
    __tablename__ = "ledger_accounts"

    id:           Mapped[str]             = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:      Mapped[str]             = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name:         Mapped[str]             = mapped_column(String, nullable=False)
    account_type: Mapped[AccountTypeEnum] = mapped_column(SAEnum(AccountTypeEnum), nullable=False)
    # Balance stored in cents to avoid float precision issues. Negative = owed (debt).
    balance_cents: Mapped[int]            = mapped_column(Integer, default=0, nullable=False)
    created_at:   Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at:   Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user:         Mapped["User"]                  = relationship("User")  # noqa: F821
    transactions: Mapped[list["LedgerTransaction"]] = relationship(
        "LedgerTransaction", back_populates="account", cascade="all, delete-orphan"
    )


class LedgerTransaction(Base):
    __tablename__ = "ledger_transactions"

    id:           Mapped[str]                      = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    account_id:   Mapped[str]                      = mapped_column(String, ForeignKey("ledger_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id:      Mapped[str]                      = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    description:  Mapped[str]                      = mapped_column(String, nullable=False)
    # Positive = deposit/income. Negative = withdrawal/expense. Stored in cents.
    amount_cents: Mapped[int]                      = mapped_column(Integer, nullable=False)
    category:     Mapped[TransactionCategoryEnum]  = mapped_column(SAEnum(TransactionCategoryEnum), nullable=False)
    transacted_at: Mapped[datetime]                = mapped_column(DateTime(timezone=True), nullable=False)
    created_at:   Mapped[datetime]                 = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    account: Mapped[LedgerAccount] = relationship("LedgerAccount", back_populates="transactions")
