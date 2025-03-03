CREATE TABLE representative_votes (
    representative_vote_id SERIAL PRIMARY KEY,
    person_id INT NOT NULL,
    voting_session_id INT NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    party_abbreviation VARCHAR(50) NOT NULL,
    vote VARCHAR(50) NOT NULL, -- For example: "For", "Against", "Abstained", "Absent"
    import_timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (person_id) REFERENCES representatives(person_id),
    FOREIGN KEY (voting_session_id) REFERENCES voting_sessions(voting_session_id)
);
