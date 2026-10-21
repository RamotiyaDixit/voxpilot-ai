CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  purpose VARCHAR(500) NOT NULL,
  greeting TEXT NOT NULL,
  instructions TEXT NOT NULL,
  voice_style VARCHAR(80) NOT NULL DEFAULT 'calm',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calls (
  id VARCHAR(36) PRIMARY KEY,
  agent_id VARCHAR(36) NOT NULL,
  caller_label VARCHAR(120) NOT NULL DEFAULT 'Browser demo',
  status ENUM('completed','failed','in_progress') NOT NULL DEFAULT 'completed',
  duration_seconds INT NOT NULL DEFAULT 0,
  sentiment ENUM('positive','neutral','negative') NOT NULL DEFAULT 'neutral',
  summary TEXT NOT NULL,
  transcript JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_calls_agent_created (agent_id, created_at),
  CONSTRAINT fk_calls_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
