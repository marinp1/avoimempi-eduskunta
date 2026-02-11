SELECT
  person_id,
  last_name,
  first_name,
  sort_name,
  marticle_name,
  party,
  minister,
  phone,
  email,
  current_municipality,
  profession,
  website,
  additional_info,
  birth_date,
  birth_year,
  birth_place,
  death_date,
  death_place,
  gender,
  term_end_date
FROM Representative
ORDER BY sort_name ASC, person_id ASC
LIMIT $limit OFFSET $offset;
