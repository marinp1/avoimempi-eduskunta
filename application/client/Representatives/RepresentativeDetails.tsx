import React from "react";
// @ts-expect-error err
import styles from "./RepresentativeDetails.module.css";

interface TypedResponse<T> extends Omit<Response, "json"> {
  json: () => Promise<T>;
}

declare function fetch<T>(
  input: string | URL | globalThis.Request,
  init?: RequestInit
): Promise<TypedResponse<T>>;

const fetchPersonDetails = async (personId: number) => {
  const [groupMemberships, terms, votes] = await Promise.all([
    fetch<DatabaseTables.ParliamentGroupMembership[]>(
      `/api/person/${personId}/group-memberships`
    ).then((data) => data.json()),
    fetch<DatabaseTables.Term[]>(`/api/person/${personId}/terms`).then((data) =>
      data.json()
    ),
    fetch<DatabaseQueries.VotesByPerson[]>(
      `/api/person/${personId}/votes`
    ).then((data) => data.json()),
  ]);
  return { groupMemberships, terms, votes };
};

export const RepresentativeDetails: React.FC<{
  selectedRepresentative: DatabaseQueries.GetParliamentComposition | null;
}> = ({ selectedRepresentative }) => {
  const [details, setDetails] =
    React.useState<Awaited<ReturnType<typeof fetchPersonDetails>>>();

  const style: React.CSSProperties = {
    opacity: selectedRepresentative === null ? 0 : 1,
  };

  const calculateAge = (
    birthDate: string,
    deathDate?: string | null
  ): string => {
    const birth = new Date(birthDate);
    const death = deathDate ? new Date(deathDate) : new Date();
    const age = death.getFullYear() - birth.getFullYear();
    const m = death.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
      return (age - 1).toString();
    }
    return age.toString();
  };

  const displayDate = (date: string | null) => {
    if (!date) return "ongoing";
    return new Date(date).toLocaleDateString("fi-FI");
  };

  React.useEffect(() => {
    if (!selectedRepresentative) {
      setDetails(undefined);
    } else {
      fetchPersonDetails(selectedRepresentative.person_id).then(setDetails);
    }
  }, [selectedRepresentative]);

  const getTimelineEvents = () => {
    const events = [];

    if (selectedRepresentative) {
      events.push({
        date: selectedRepresentative.birth_date,
        description: `born in ${selectedRepresentative.birth_place}`,
      });

      details?.terms.forEach((term, index) => {
        events.push({
          date: term.start_date,
          description: `joined parliament in group ${details.groupMemberships[index]?.group_name}`,
        });
        if (term.end_date?.trim()) {
          events.push({
            date: term.end_date,
            description: `left parliament`,
          });
        }
      });

      details?.groupMemberships.forEach((membership, index) => {
        if (index > 0) {
          events.push({
            date: membership.start_date,
            description: `changed group to ${membership.group_name}`,
          });
        }
      });

      if (selectedRepresentative.death_date) {
        events.push({
          date: selectedRepresentative.death_date,
          description: `died in ${selectedRepresentative.death_place}`,
        });
      }
    }

    return events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const timelineEvents = getTimelineEvents();

  const groupedVotes = React.useMemo(() => {
    return Object.groupBy(
      details?.votes ?? [],
      (i) => `${i.section_title}: ${i.section_processing_phase}`
    );
  }, [details]);

  return (
    <div className={styles["representative-details-container"]} style={style}>
      {selectedRepresentative ? (
        <div className={styles["card"]}>
          <h2 className={styles["card-title"]}>
            {selectedRepresentative.first_name}{" "}
            {selectedRepresentative.last_name}
          </h2>
          <div className={styles["card-container"]}>
            <div
              className={styles["card-section"]}
              style={{ gridArea: "personal" }}
            >
              <h3>Personal Information</h3>
              <div>
                <strong>Person ID:</strong> {selectedRepresentative.person_id}
              </div>
              <div>
                <strong>Sort Name:</strong> {selectedRepresentative.sort_name}
              </div>
              <div>
                <strong>Gender:</strong> {selectedRepresentative.gender}
              </div>
              <div>
                <strong>Age:</strong>{" "}
                {calculateAge(
                  selectedRepresentative.birth_date,
                  selectedRepresentative.death_date
                )}
                {selectedRepresentative.death_date && " (at the time of death)"}
              </div>
            </div>
            <div
              className={styles["card-section"]}
              style={{ gridArea: "timeline" }}
            >
              <h3>Timeline</h3>
              <div className={styles["timeline"]}>
                {timelineEvents.map((event, index) => (
                  <div key={index} className={styles["timeline-event"]}>
                    <div className={styles["timeline-content"]}>
                      {displayDate(event.date)} {event.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              className={styles["card-section"]}
              style={{ gridArea: "professional" }}
            >
              <h3>Professional Information</h3>
              <div>
                <strong>Profession:</strong> {selectedRepresentative.profession}
              </div>
            </div>
            <div
              className={styles["card-section"]}
              style={{ gridArea: "votings" }}
            >
              <h3>Voting record</h3>
              <div>
                {Object.entries(groupedVotes).map(([date, votes]) => (
                  <details key={date}>
                    <summary>
                      <strong>{date}</strong>
                    </summary>
                    {votes?.map((v) => (
                      <div key={v.id} style={{ marginLeft: "12px" }}>
                        <span
                          style={{ minWidth: "6ch", display: "inline-block" }}
                        >
                          {v.vote}
                        </span>
                        {displayDate(v.start_time)}: {v.title}
                      </div>
                    ))}
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>No representative selected</div>
      )}
    </div>
  );
};
