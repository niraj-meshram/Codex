from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from .database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(String(64), index=True, nullable=False)
    task_type = Column(String(32), nullable=False)
    user_text = Column(Text, nullable=False)
    scores_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
