SELECT
    tp.*
FROM
    TrustPosition tp
WHERE
    tp.person_id = $personId
ORDER BY tp.period ASC
