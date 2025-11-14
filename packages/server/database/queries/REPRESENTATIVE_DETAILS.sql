SELECT
    r.*
FROM
    Representative r
WHERE
    r.person_id = $personId
`;

export const representativeDistricts = sql`
SELECT
    rd.id,
    rd.person_id,
    d.name as district_name,
    rd.start_date,
    rd.end_date
FROM
    RepresentativeDistrict rd
JOIN
    District d ON rd.district_code = d.code
WHERE
    rd.person_id = $personId
ORDER BY rd.start_date DESC
