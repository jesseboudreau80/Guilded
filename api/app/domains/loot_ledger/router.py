from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select, func

from app.core.deps import DB, CurrentUser
from app.models.loot_ledger import (
    AccountTypeEnum,
    LedgerAccount,
    LedgerTransaction,
    TransactionCategoryEnum,
)

router = APIRouter(prefix="/api/ledger", tags=["loot-ledger"])

# Apprentice accounts cap — paid tiers are unlimited.
APPRENTICE_ACCOUNT_LIMIT = 3


def _account_out(a: LedgerAccount) -> dict:
    return {
        "id":           a.id,
        "name":         a.name,
        "account_type": a.account_type.value,
        "balance_cents": a.balance_cents,
        "created_at":   a.created_at.isoformat(),
    }


def _tx_out(t: LedgerTransaction) -> dict:
    return {
        "id":           t.id,
        "account_id":   t.account_id,
        "description":  t.description,
        "amount_cents": t.amount_cents,
        "category":     t.category.value,
        "transacted_at": t.transacted_at.isoformat(),
        "created_at":   t.created_at.isoformat(),
    }


# ── Accounts ──────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    name:          str
    account_type:  AccountTypeEnum
    balance_cents: int = 0

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) > 100:
            raise ValueError("Name too long")
        return v


@router.get("/accounts")
async def list_accounts(db: DB, current_user: CurrentUser):
    result = await db.execute(
        select(LedgerAccount)
        .where(LedgerAccount.user_id == current_user.id)
        .order_by(LedgerAccount.created_at)
    )
    accounts = result.scalars().all()
    return {"accounts": [_account_out(a) for a in accounts]}


@router.post("/accounts", status_code=201)
async def create_account(body: AccountCreate, db: DB, current_user: CurrentUser):
    if current_user.tier == "APPRENTICE":
        count_result = await db.execute(
            select(func.count()).where(LedgerAccount.user_id == current_user.id)
        )
        count = count_result.scalar_one()
        if count >= APPRENTICE_ACCOUNT_LIMIT:
            raise HTTPException(
                403,
                detail={
                    "error": f"Apprentice accounts are limited to {APPRENTICE_ACCOUNT_LIMIT}.",
                    "upgradeRequired": True,
                },
            )

    account = LedgerAccount(
        user_id=current_user.id,
        name=body.name,
        account_type=body.account_type,
        balance_cents=body.balance_cents,
    )
    db.add(account)
    await db.flush()
    return _account_out(account)


@router.delete("/accounts/{account_id}", status_code=204)
async def delete_account(account_id: str, db: DB, current_user: CurrentUser):
    result = await db.execute(
        select(LedgerAccount).where(
            LedgerAccount.id == account_id,
            LedgerAccount.user_id == current_user.id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(404, detail="Account not found")
    await db.delete(account)


# ── Transactions ──────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    account_id:    str
    description:   str
    amount_cents:  int
    category:      TransactionCategoryEnum
    transacted_at: datetime

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Description cannot be empty")
        if len(v) > 200:
            raise ValueError("Description too long")
        return v

    @field_validator("amount_cents")
    @classmethod
    def validate_amount(cls, v: int) -> int:
        if v == 0:
            raise ValueError("Amount cannot be zero")
        return v


@router.get("/transactions")
async def list_transactions(account_id: str, db: DB, current_user: CurrentUser):
    # Verify account belongs to user before returning transactions.
    acct_result = await db.execute(
        select(LedgerAccount).where(
            LedgerAccount.id == account_id,
            LedgerAccount.user_id == current_user.id,
        )
    )
    if not acct_result.scalar_one_or_none():
        raise HTTPException(404, detail="Account not found")

    result = await db.execute(
        select(LedgerTransaction)
        .where(LedgerTransaction.account_id == account_id)
        .order_by(LedgerTransaction.transacted_at.desc())
    )
    txns = result.scalars().all()
    return {"transactions": [_tx_out(t) for t in txns]}


@router.post("/transactions", status_code=201)
async def create_transaction(body: TransactionCreate, db: DB, current_user: CurrentUser):
    acct_result = await db.execute(
        select(LedgerAccount).where(
            LedgerAccount.id == body.account_id,
            LedgerAccount.user_id == current_user.id,
        )
    )
    account = acct_result.scalar_one_or_none()
    if not account:
        raise HTTPException(404, detail="Account not found")

    txn = LedgerTransaction(
        account_id=body.account_id,
        user_id=current_user.id,
        description=body.description,
        amount_cents=body.amount_cents,
        category=body.category,
        transacted_at=body.transacted_at,
    )
    db.add(txn)
    account.balance_cents += body.amount_cents
    await db.flush()
    return _tx_out(txn)


@router.delete("/transactions/{txn_id}", status_code=204)
async def delete_transaction(txn_id: str, db: DB, current_user: CurrentUser):
    result = await db.execute(
        select(LedgerTransaction).where(
            LedgerTransaction.id == txn_id,
            LedgerTransaction.user_id == current_user.id,
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(404, detail="Transaction not found")

    # Reverse the balance effect before deleting.
    acct_result = await db.execute(
        select(LedgerAccount).where(LedgerAccount.id == txn.account_id)
    )
    account = acct_result.scalar_one_or_none()
    if account:
        account.balance_cents -= txn.amount_cents

    await db.delete(txn)


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/summary")
async def net_worth_summary(db: DB, current_user: CurrentUser):
    result = await db.execute(
        select(LedgerAccount).where(LedgerAccount.user_id == current_user.id)
    )
    accounts = result.scalars().all()

    # Assets: CHECKING, SAVINGS, INVESTMENT (positive balance side)
    asset_types = {AccountTypeEnum.CHECKING, AccountTypeEnum.SAVINGS, AccountTypeEnum.INVESTMENT}
    debt_types  = {AccountTypeEnum.CREDIT_CARD, AccountTypeEnum.LOAN}

    total_assets_cents = sum(a.balance_cents for a in accounts if a.account_type in asset_types)
    total_debts_cents  = sum(abs(a.balance_cents) for a in accounts if a.account_type in debt_types)
    net_worth_cents    = total_assets_cents - total_debts_cents

    return {
        "total_assets_cents": total_assets_cents,
        "total_debts_cents":  total_debts_cents,
        "net_worth_cents":    net_worth_cents,
        "account_count":      len(accounts),
    }
