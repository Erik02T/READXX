CREATE UNIQUE INDEX IF NOT EXISTS uq_history_user_url_visited_at
    ON history (user_id, url, visited_at);

