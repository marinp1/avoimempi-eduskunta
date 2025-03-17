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
  const [groupMemberships, terms] = await Promise.all([
    fetch<DatabaseTables.ParliamentGroupMembership[]>(
      `/api/person/${personId}/group-memberships`
    ).then((data) => data.json()),
    fetch<DatabaseTables.Term[]>(`/api/person/${personId}/terms`).then((data) =>
      data.json()
    ),
  ]);
  return { groupMemberships, terms };
};

export const RepresentativeDetails: React.FC<{
  selectedRepresentative: DatabaseFunctions.GetParliamentComposition | null;
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

  const displayDate = (date: string) => {
    return new Date(date).toLocaleDateString("fi-FI");
  };

  React.useEffect(() => {
    if (!selectedRepresentative) {
      setDetails(undefined);
    } else {
      fetchPersonDetails(selectedRepresentative.person_id).then(setDetails);
    }
  }, [selectedRepresentative]);

  return (
    <div className={styles["representative-details-container"]} style={style}>
      {selectedRepresentative ? (
        <div className={styles["card"]}>
          <h2 className={styles["card-title"]}>
            {selectedRepresentative.first_name}{" "}
            {selectedRepresentative.last_name}
          </h2>
          <div className={styles["card-section"]}>
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
          <div className={styles["card-section"]}>
            <h3>Timeline</h3>
            <div className={styles["timeline"]}>
              <div className={styles["timeline-event"]}>
                <div className={styles["timeline-content"]}>
                  <strong>Birth:</strong>{" "}
                  {displayDate(selectedRepresentative.birth_date)} in{" "}
                  {selectedRepresentative.birth_place}
                </div>
              </div>
              {selectedRepresentative.death_date && (
                <div className={styles["timeline-event"]}>
                  <div className={styles["timeline-content"]}>
                    <strong>Death:</strong>{" "}
                    {displayDate(selectedRepresentative.death_date)} in{" "}
                    {selectedRepresentative.death_place}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className={styles["card-section"]}>
            <h3>Professional Information</h3>
            <div>
              <strong>Profession:</strong> {selectedRepresentative.profession}
            </div>
          </div>
        </div>
      ) : (
        <div>No representative selected</div>
      )}
    </div>
  );
};
