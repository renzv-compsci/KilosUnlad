from pydantic import BaseModel, Field
from typing import List, Annotated
from datetime import datetime

class TerminalMetadata(BaseModel):
    bank_network: str
    location_name: str
    municipality: str
    province: str
    coordinates: Annotated[List[float], Field(min_length=2, max_length=2)]

class Transaction(BaseModel):
    transaction_id: str
    card_masked_pan: str
    household_id: str
    timestamp: datetime
    amount_php: float

class AtmTelemetryRequest(BaseModel):
    terminal_id: str
    terminal_metadata: TerminalMetadata
    window_start_time: datetime
    window_end_time: datetime
    transactions: Annotated[List[Transaction], Field(min_length=3)]

class ClusterMetrics(BaseModel):
    total_transactions_in_window: int
    avg_interval_seconds: float
    nocturnal_window_flag: bool
    spatial_displacement_flag: bool
    historical_cluster_overlap_rate: float

class WindowEvaluation(BaseModel):
    is_anomalous_batch: bool
    sangla_atm_risk_score: float
    cluster_metrics: ClusterMetrics
    identified_cluster_id: str
    flagged_household_ids: List[str]

class AtmTelemetryResponse(BaseModel):
    terminal_id: str
    window_evaluation: WindowEvaluation
    evaluated_at: datetime