CREATE TABLE voting_sessions (
    voting_session_id SERIAL PRIMARY KEY,
    language_id INT NOT NULL,
    session_year INT NOT NULL,
    session_number INT NOT NULL,
    session_date TIMESTAMP NOT NULL,
    reported_start_time TIMESTAMP NOT NULL,
    actual_start_time TIMESTAMP NOT NULL,
    voting_number INT NOT NULL,
    voting_start_time TIMESTAMP NOT NULL,
    voting_end_time TIMESTAMP NOT NULL,
    voting_title VARCHAR(255) NOT NULL,
    agenda_item_title VARCHAR(255) NOT NULL,
    agenda_item_phase VARCHAR(255) NOT NULL,
    agenda_item_order INT NOT NULL,
    agenda_item_description TEXT NOT NULL,
    voting_result_for INT NOT NULL,
    voting_result_against INT NOT NULL,
    voting_result_abstained INT NOT NULL,
    voting_result_absent INT NOT NULL,
    voting_result_total INT NOT NULL,
    protocol_url VARCHAR(255),
    protocol_reference VARCHAR(255),
    parliamentary_case_url VARCHAR(255),
    parliamentary_case_reference VARCHAR(255),
    import_timestamp TIMESTAMP NOT NULL
);
