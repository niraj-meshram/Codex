from sqlalchemy import Column, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from .database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(String(64), index=True, nullable=False)
    student_id = Column(String(128), index=True, nullable=True)
    task_type = Column(String(32), nullable=False)
    user_text = Column(Text, nullable=False)
    scores_json = Column(Text, nullable=False)
    prompt_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SentenceSetCache(Base):
    __tablename__ = "sentence_set_cache"

    id = Column(Integer, primary_key=True, index=True)
    set_id = Column(String(64), unique=True, index=True, nullable=False)
    payload_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PromptUsage(Base):
    __tablename__ = "prompt_usage"
    __table_args__ = (UniqueConstraint("task_type", "source_prompt_id", name="uq_prompt_usage_task_source"),)

    id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String(32), nullable=False, index=True)
    source_prompt_id = Column(String(64), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StudentPromptHistory(Base):
    __tablename__ = "student_prompt_history"
    __table_args__ = (UniqueConstraint("student_id", "task_type", "source_prompt_id", name="uq_student_task_source"),)

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(128), nullable=False, index=True)
    task_type = Column(String(32), nullable=False, index=True)
    prompt_id = Column(String(64), nullable=False, index=True)
    source_prompt_id = Column(String(64), nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
