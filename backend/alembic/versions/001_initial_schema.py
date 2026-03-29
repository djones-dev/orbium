"""Initial schema: presets and bodies tables

Revision ID: 001
Revises:
Create Date: 2026-03-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "presets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String()),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("parameters", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False, server_default="anonymous"),
        sa.Column("is_default", sa.Boolean(), server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_presets_user_id", "presets", ["user_id"])
    op.create_index("ix_presets_type", "presets", ["type"])
    op.create_index("ix_presets_category", "presets", ["category"])

    op.create_table(
        "bodies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("preset_id", sa.String(), nullable=True),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("position", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("velocity", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("audio_params", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "attributes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
        ),
        sa.Column("parent_id", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=False, server_default="anonymous"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_bodies_user_id", "bodies", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_bodies_user_id", table_name="bodies")
    op.drop_table("bodies")
    op.drop_index("ix_presets_category", table_name="presets")
    op.drop_index("ix_presets_type", table_name="presets")
    op.drop_index("ix_presets_user_id", table_name="presets")
    op.drop_table("presets")
