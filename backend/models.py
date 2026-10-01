"""
SQLAlchemy models — mirror the MySQL tables in gentech_db.
Used by the API for type-safe queries.
"""

from sqlalchemy import (
    Column, Integer, String, Date, Time, DateTime, Numeric, Text,
    ForeignKey, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from db import Base


class Branch(Base):
    __tablename__ = "branch"

    BM_CODE = Column(String(50), primary_key=True)
    BRANCH_NAME = Column(String(150), nullable=True)
    REGION = Column(String(50), nullable=False, default="Unknown")
    CREATED_AT = Column(DateTime, server_default=func.now())

    employees = relationship("BranchEmployee", back_populates="branch")
    otps = relationship("OtpReport", back_populates="branch")


class BranchEmployee(Base):
    __tablename__ = "branch_employee"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    BM_CODE = Column(String(50), ForeignKey("branch.BM_CODE"), nullable=False)
    EMPLOYEE_NAME = Column(String(150), nullable=False)
    EMPLOYEE_NUMBER = Column(String(20), nullable=False)
    CREATED_AT = Column(DateTime, server_default=func.now())

    branch = relationship("Branch", back_populates="employees")


class OtpReport(Base):
    __tablename__ = "otp_report"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    BM_CODE = Column(String(50), ForeignKey("branch.BM_CODE"), nullable=False)
    PURPOSE = Column(String(100), nullable=False)
    OPERATOR = Column(String(150), nullable=True)
    OTP_DATE = Column(Date, nullable=False)
    OTP_TIME = Column(Time, nullable=False)
    MOBILE_NUMBER = Column(String(20), nullable=True)
    CREATED_AT = Column(DateTime, server_default=func.now())

    branch = relationship("Branch", back_populates="otps")


class EtlRun(Base):
    __tablename__ = "etl_runs"

    ID = Column(Integer, primary_key=True, autoincrement=True)
    RUN_DATE = Column(Date, nullable=False)
    FILE_NAME = Column(String(255), nullable=False)
    STARTED_AT = Column(DateTime, server_default=func.now())
    FINISHED_AT = Column(DateTime, nullable=True)
    DURATION_SEC = Column(Integer, nullable=True)
    ROWS_IN = Column(Integer, nullable=True, default=0)
    ROWS_LOADED = Column(Integer, nullable=True, default=0)
    ROWS_DROPPED = Column(Integer, nullable=True, default=0)
    DROP_PCT = Column(Numeric(5, 2), nullable=True, default=0)
    STATUS = Column(String(20), nullable=True, default="RUNNING")
    ERROR_MSG = Column(Text, nullable=True)