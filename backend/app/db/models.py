from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Text
)

from sqlalchemy.orm import relationship

from datetime import datetime

from .database import Base


# ============================================================
# USER
# ============================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(50),
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True
    )

    # Relationships

    lifecycle_events = relationship(
        "LifecycleEvent",
        back_populates="actor"
    )

    recalls = relationship(
        "Recall",
        back_populates="issued_by_user"
    )


# ============================================================
# MEDICINE
# ============================================================

class Medicine(Base):

    __tablename__ = "medicines"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(255),
        nullable=False
    )

    manufacturer_name = Column(
        String(255),
        nullable=False
    )

    composition = Column(
        Text,
        nullable=True
    )

    description = Column(
        Text,
        nullable=True
    )

    # Relationships

    batches = relationship(
        "Batch",
        back_populates="medicine"
    )


# ============================================================
# BATCH
# ============================================================

class Batch(Base):

    __tablename__ = "batches"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    medicine_id = Column(
        Integer,
        ForeignKey("medicines.id"),
        nullable=False
    )

    batch_number = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    manufacturing_date = Column(
        Date,
        nullable=False
    )

    expiry_date = Column(
        Date,
        nullable=False
    )

    status = Column(
        String(50),
        default="ACTIVE"
    )

    # Relationships

    medicine = relationship(
        "Medicine",
        back_populates="batches"
    )

    serialized_medicines = relationship(
        "SerializedMedicine",
        back_populates="batch"
    )

    recalls = relationship(
        "Recall",
        back_populates="batch"
    )


# ============================================================
# SERIALIZED MEDICINE
# ============================================================

class SerializedMedicine(Base):

    __tablename__ = "serialized_medicines"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    batch_id = Column(
        Integer,
        ForeignKey("batches.id"),
        nullable=False
    )

    serial_number = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    qr_token = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    status = Column(
        String(50),
        default="MANUFACTURED"
    )

    current_owner = Column(
        String(255),
        nullable=True
    )

    # Relationships

    batch = relationship(
        "Batch",
        back_populates="serialized_medicines"
    )

    lifecycle_events = relationship(
        "LifecycleEvent",
        back_populates="serialized_medicine"
    )

    verifications = relationship(
        "Verification",
        back_populates="serialized_medicine"
    )


# ============================================================
# LIFECYCLE EVENT
# ============================================================

class LifecycleEvent(Base):

    __tablename__ = "lifecycle_events"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    serialized_medicine_id = Column(
        Integer,
        ForeignKey("serialized_medicines.id"),
        nullable=False
    )

    actor_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    event_type = Column(
        String(100),
        nullable=False
    )

    location = Column(
        String(255),
        nullable=True
    )

    timestamp = Column(
        DateTime,
        default=datetime.utcnow
    )

    notes = Column(
        Text,
        nullable=True
    )

    # Relationships

    serialized_medicine = relationship(
        "SerializedMedicine",
        back_populates="lifecycle_events"
    )

    actor = relationship(
        "User",
        back_populates="lifecycle_events"
    )


# ============================================================
# VERIFICATION
# ============================================================

class Verification(Base):

    __tablename__ = "verifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    serialized_medicine_id = Column(
        Integer,
        ForeignKey("serialized_medicines.id"),
        nullable=False
    )

    result = Column(
        String(50),
        nullable=False
    )

    location = Column(
        String(255),
        nullable=True
    )

    device_info = Column(
        String(255),
        nullable=True
    )

    timestamp = Column(
        DateTime,
        default=datetime.utcnow
    )

    # Relationships

    serialized_medicine = relationship(
        "SerializedMedicine",
        back_populates="verifications"
    )


# ============================================================
# RECALL
# ============================================================

class Recall(Base):

    __tablename__ = "recalls"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    batch_id = Column(
        Integer,
        ForeignKey("batches.id"),
        nullable=False
    )

    reason = Column(
        Text,
        nullable=False
    )

    issued_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    timestamp = Column(
        DateTime,
        default=datetime.utcnow
    )

    active = Column(
        Boolean,
        default=True
    )

    # Relationships

    batch = relationship(
        "Batch",
        back_populates="recalls"
    )

    issued_by_user = relationship(
        "User",
        back_populates="recalls"
    )