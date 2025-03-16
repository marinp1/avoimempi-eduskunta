CREATE TABLE Agenda (
  key TEXT PRIMARY KEY,
  title TEXT,
  state TEXT
);

CREATE TABLE Session (
  id INTEGER PRIMARY KEY,
  number INTEGER UNIQUE,
  key TEXT UNIQUE,
  date TEXT,
  year INTEGER,
  type TEXT,
  state TEXT,
  description TEXT,
  start_time_actual TEXT,
  start_time_reported TEXT,
  article_key TEXT,
  speaker_id INTEGER,
  agenda_key TEXT,
  modified_datetime TEXT,
  FOREIGN KEY (agenda_key) REFERENCES Agenda(key),
  FOREIGN KEY (speaker_id) REFERENCES Representative(person_id)
);