-- RazorPay Pulse — BigQuery schema
-- Run once against your GCP project after `bq mk --dataset <project>:razorpay_pulse`
-- These mirror app/models/schemas.py exactly so BigQueryStore inserts map 1:1.

CREATE TABLE IF NOT EXISTS `razorpay_pulse.transactions` (
  transaction_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  amount FLOAT64 NOT NULL,
  currency STRING NOT NULL,
  payment_method STRING NOT NULL,   -- upi | card | netbanking | wallet
  gateway STRING NOT NULL,
  region STRING NOT NULL,
  device STRING NOT NULL,           -- android | ios | web
  status STRING NOT NULL,           -- success | failed | pending
  error_code STRING,
  checkout_latency_ms INT64 NOT NULL,
  api_latency_ms INT64 NOT NULL,
  gateway_latency_ms INT64 NOT NULL,
  bank_latency_ms INT64 NOT NULL,
  callback_latency_ms INT64 NOT NULL,
  total_latency_ms INT64 NOT NULL,
  source STRING NOT NULL            -- simulated | razorpay_test
)
PARTITION BY DATE(timestamp)
CLUSTER BY payment_method, region, status;

CREATE TABLE IF NOT EXISTS `razorpay_pulse.incidents` (
  incident_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,
  severity STRING NOT NULL,         -- LOW | MEDIUM | HIGH | CRITICAL
  title STRING NOT NULL,
  description STRING NOT NULL,
  root_cause STRING,
  affected_method STRING,
  affected_region STRING,
  affected_transactions INT64 NOT NULL,
  estimated_value_at_risk FLOAT64 NOT NULL,
  confidence FLOAT64,
  status STRING NOT NULL,           -- OPEN | INVESTIGATING | RESOLVED
  ai_generated BOOL NOT NULL
)
PARTITION BY DATE(created_at)
CLUSTER BY severity, status;

CREATE TABLE IF NOT EXISTS `razorpay_pulse.predictions` (
  prediction_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,
  component STRING NOT NULL,
  metric STRING NOT NULL,
  current_value FLOAT64 NOT NULL,
  predicted_value FLOAT64 NOT NULL,
  probability FLOAT64 NOT NULL,
  time_window STRING NOT NULL,
  reason STRING NOT NULL
)
PARTITION BY DATE(created_at);

CREATE TABLE IF NOT EXISTS `razorpay_pulse.recommendations` (
  recommendation_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,
  incident_id STRING,
  action STRING NOT NULL,
  expected_impact STRING NOT NULL,
  confidence FLOAT64 NOT NULL,
  status STRING NOT NULL            -- PROPOSED | ACCEPTED | DISMISSED
)
PARTITION BY DATE(created_at);
