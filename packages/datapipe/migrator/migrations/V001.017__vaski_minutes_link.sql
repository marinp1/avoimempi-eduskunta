ALTER TABLE VaskiMinutesSpeech ADD COLUMN link_key TEXT;

CREATE INDEX idx_vaski_minutes_speech_link_key ON VaskiMinutesSpeech(link_key);
