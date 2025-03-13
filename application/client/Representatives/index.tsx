import React, { useState, useEffect } from "react";
import "./RepresentativesPage.css";
import { RepresentativeAvatar } from "./RepresentativeAvatar";

const SeatingCounts = [1, 16, 22, 26, 32, 30, 29, 26, 18];

const RepresentativesPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [representatives, setRepresentatives] = useState<
    DatabaseFunctions.GetParliamentComposition[]
  >([]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(event.target.value));
  };

  const handlePreviousDate = () => {
    const previousDate = new Date(selectedDate);
    previousDate.setDate(previousDate.getDate() - 1);
    setSelectedDate(previousDate);
  };

  const handleNextDate = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setSelectedDate(nextDate);
  };

  useEffect(() => {
    const fetchRepresentatives = async () => {
      try {
        const sp = new URLSearchParams();
        sp.set("date", selectedDate.toISOString().slice(0, 10));
        const response = await fetch(
          `/api/composition/${selectedDate.toISOString().slice(0, 10)}`
        );
        const data: DatabaseFunctions.GetParliamentComposition[] =
          await response.json();
        setRepresentatives(data);
      } catch (error) {
        console.error("Error fetching representatives:", error);
      }
    };

    fetchRepresentatives();
  }, [selectedDate]);

  const groupedRepresentatives = SeatingCounts.reduce((acc, count, ind) => {
    const start = ind === 0 ? 0 : acc[ind - 1].end;
    const end = start + count;
    return [
      ...acc,
      {
        start,
        end,
      },
    ];
  }, [] as { start: number; end: number }[]).map(({ start, end }) => ({
    count: end - start,
    representatives: representatives.slice(start, end),
  }));

  console.log(
    representatives,
    groupedRepresentatives,
    groupedRepresentatives
      .map((s) => s.representatives.length)
      .reduce((a, b) => a + b, 0)
  );

  const totalCount = 32;
  const radius = totalCount / Math.PI / 3;
  return (
    <div className="representatives-page">
      <div className="date-selector">
        <button onClick={handlePreviousDate}>&lt;</button>
        <input
          type="date"
          value={selectedDate.toISOString().split("T")[0]}
          onChange={handleDateChange}
        />
        <button onClick={handleNextDate}>&gt;</button>
      </div>
      <div className="representatives-layout">
        {groupedRepresentatives.map(
          ({ count: _count, representatives }, rowIndex) => {
            return (
              <div
                key={`row-${_count}-${rowIndex}`}
                className="representative-row"
                data-row={rowIndex}
              >
                {representatives.map((representative, _index) => {
                  const count = rowIndex === 6 ? _count + 1 : _count;
                  const index = rowIndex === 6 ? _index + 1 : _index;
                  const missing = totalCount - count;
                  const start = (totalCount / 2) * -1 + missing / 2;
                  const ind = start + index + 0.5;
                  const y =
                    rowIndex === 0
                      ? 0
                      : Math.floor(
                          radius * Math.cos((ind / totalCount) * Math.PI) * 100
                        );
                  return (
                    <RepresentativeAvatar
                      key={index}
                      {...representative}
                      transform={{ y }}
                    />
                  );
                })}
              </div>
            );
          }
        )}
      </div>
      <div className="representatives-content">
        {/* Content for the selected date goes here */}
      </div>
    </div>
  );
};

export default RepresentativesPage;
