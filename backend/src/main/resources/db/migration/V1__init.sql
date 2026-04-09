CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    plan VARCHAR(20) DEFAULT 'free',
    google_sub TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_active TIMESTAMPTZ
);

CREATE TABLE words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(200) NOT NULL,
    context TEXT,
    source_url TEXT,
    lang CHAR(5),
    srs_ease FLOAT DEFAULT 2.5,
    srs_interval INT DEFAULT 1,
    srs_repetitions INT DEFAULT 0,
    next_review DATE,
    saved_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE history (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    url TEXT,
    title TEXT,
    domain VARCHAR(255),
    chars_read INT DEFAULT 0,
    time_spent_s INT DEFAULT 0,
    visited_at DATE
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE,
    expires_at TIMESTAMPTZ,
    revoked BOOLEAN DEFAULT false,
    device_info JSONB
);

CREATE TABLE usage_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(20),
    units INT,
    logged_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_words_user_id ON words(user_id);
CREATE INDEX idx_words_next_review ON words(next_review);
CREATE INDEX idx_words_user_id_lang ON words(user_id, lang);
CREATE INDEX idx_history_user_id_visited_at ON history(user_id, visited_at);
CREATE INDEX idx_usage_logs_user_id_logged_at ON usage_logs(user_id, logged_at);
