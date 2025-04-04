import React from "react";

let cache = new Map<string, ReturnType<typeof getVotings>>();

const getVotings = async (
  query: string
): Promise<
  Partial<{
    [x: string]: DatabaseTables.Voting[];
  }>
> => {
  if (!query.trim() || query.trim().length < 3) return {};
  const qp = new URLSearchParams({ q: query.trim() });
  return await fetch<DatabaseTables.Voting[]>(
    `/api/votings/search?${qp.toString()}`
  )
    .then((val) => {
      if (val.status !== 200) {
        throw new Error(`${val.status}: ${val.statusText}`);
      }
      return val.json();
    })
    .then((data) => Object.groupBy(data, (d) => d.section_title));
};

export function fetchData(query: string) {
  if (!cache.has(query)) {
    cache.set(query, getVotings(query));
  }
  return (
    cache.get(query) ??
    Promise.resolve({} as Record<string, DatabaseTables.Voting[]>)
  );
}

const eduskuntaLink = (href: string) => {
  if (!href.startsWith("/")) href = "/" + href;
  return `https://www.eduskunta.fi${href}`;
};

export const VoteResults: React.FC<{
  query: string;
}> = ({ query }) => {
  const results = React.use(fetchData(query?.trim()));
  return (
    <div>
      {Object.entries(results).map(([k, v]) => {
        return (
          <React.Fragment key={k}>
            <details>
              <summary>
                <strong>{k}</strong>
              </summary>
              <table>
                <thead>
                  <tr>
                    <td>Aika</td>
                    <td>Vaihe</td>
                    <td>Otsikko</td>
                    <td>Jaa</td>
                    <td>Ei</td>
                    <td>Tyhjää</td>
                    <td>Poissa</td>
                    <td>Yht</td>
                    <td>Viralliset linkit</td>
                  </tr>
                </thead>
                <tbody>
                  {(v ?? []).map((res) => (
                    <tr key={res.id}>
                      <td>{res.start_time}</td>
                      <td>{res.section_processing_phase}</td>
                      <td>{res.title}</td>
                      <td>{res.n_yes}</td>
                      <td>{res.n_no}</td>
                      <td>{res.n_abstain}</td>
                      <td>{res.n_absent}</td>
                      <td>{res.n_total}</td>
                      <td className="votings-links">
                        <a target="_blank" href={eduskuntaLink(res.result_url)}>
                          Tulokset
                        </a>
                        <a
                          target="_blank"
                          href={eduskuntaLink(res.proceedings_url)}
                        >
                          Pöytäkirja
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </React.Fragment>
        );
      })}
    </div>
  );
};
