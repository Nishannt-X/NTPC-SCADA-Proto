DROP TABLE IF EXISTS shift_handovers;

CREATE TABLE clock_off_logs (
    id UUID PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    clock_off_time TIMESTAMP WITH TIME ZONE NOT NULL,
    shift_number INTEGER NOT NULL,
    is_early BOOLEAN NOT NULL,
    notes TEXT NOT NULL,
    early_reason TEXT
);
