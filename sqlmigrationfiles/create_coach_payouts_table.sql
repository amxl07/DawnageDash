-- ============================================================================
-- COACH PAYOUTS TABLE
-- Tracks monthly payout records for coaches based on commissions earned
-- ============================================================================

CREATE TABLE IF NOT EXISTS coach_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payout_month INTEGER NOT NULL CHECK (payout_month BETWEEN 1 AND 12),
  payout_year INTEGER NOT NULL CHECK (payout_year >= 2020),
  gross_amount DECIMAL(10, 2) NOT NULL,          -- total collected from coach's clients that month
  commission_percentage DECIMAL(5, 2) NOT NULL,   -- snapshot of % at time of payout
  commission_amount DECIMAL(10, 2) NOT NULL,      -- gross_amount * commission_percentage / 100
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'paid'
  payment_method VARCHAR(50),                     -- 'bank_transfer', 'upi', 'cash', 'card'
  payment_date DATE,                              -- actual payout date (NULL if pending)
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(coach_id, payout_month, payout_year)     -- one payout record per coach per month
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Only admins can read/write this table
-- ============================================================================

ALTER TABLE coach_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_coach_payouts"
  ON coach_payouts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_coach_payouts_coach_id ON coach_payouts(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_payouts_period ON coach_payouts(payout_year, payout_month);
CREATE INDEX IF NOT EXISTS idx_coach_payouts_status ON coach_payouts(status);
