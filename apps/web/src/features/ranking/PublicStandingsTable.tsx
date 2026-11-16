import type { PublicStandingRow } from "@lucarne/shared";
import { Link } from "react-router";
import PublicLeagueLogo from "../league/components/PublicLeagueLogo";
import { publicNavigation } from "../../components/public/publicRoutes";
import { publicMatchLink } from "../match/publicMatchNavigation";
import { formatDate } from "../../lib/dateFormat";

const resultLabels = { WIN: "Victoire", DRAW: "Match nul", LOSS: "Défaite" };
export default function PublicStandingsTable({ rows, caption, compact = false }: { rows: PublicStandingRow[]; caption: string; compact?: boolean }) {
  return <div className="public-table-scroll"><table className={`public-standings ${compact ? "public-standings--compact" : ""}`}>
    <caption className="sr-only">{caption}</caption><thead><tr><th scope="col"><span className="sr-only">Rang</span>#</th><th scope="col">Équipe</th>
      {[["J", "Matchs joués"], ["G", "Victoires"], ["N", "Matchs nuls"], ["P", "Défaites"], ["BP", "Buts marqués"], ["BC", "Buts encaissés"]].map(([label, title]) => <th className={`public-standings__stat ${["BP", "BC"].includes(label) ? "public-standings__goals" : ""}`} scope="col" key={label}><abbr title={title}>{label}</abbr></th>)}
      <th scope="col"><abbr title="Différence de buts">Diff.</abbr></th><th scope="col"><abbr title="Points">Pts</abbr></th>{!compact ? <th scope="col" className="public-standings__form">Forme</th> : null}
    </tr></thead><tbody>{rows.map((row) => <tr key={row.team.id}><td>{row.rank}</td><th scope="row"><Link to={publicNavigation.team(row.team.id)}><PublicLeagueLogo name={row.team.name} logoUrl={row.team.logoUrl} /><span>{row.team.name}</span></Link></th>
      {[row.played, row.wins, row.draws, row.losses, row.goalsFor, row.goalsAgainst].map((value, index) => <td className={`public-standings__stat ${index > 3 ? "public-standings__goals" : ""}`} key={index}>{value}</td>)}
      <td>{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</td><td><strong>{row.points}</strong></td>
      {!compact ? <td className="public-standings__form"><div className="public-form-results">{row.form.map((result) => <Link key={result.matchPublicId} className={`public-form-result public-form-result--${result.result}`} to={publicMatchLink(result.matchPublicId)} aria-label={`${resultLabels[result.result]} du ${formatDate(result.date)}`} title={`${resultLabels[result.result]} du ${formatDate(result.date)}`}>{result.result === "WIN" ? "V" : result.result === "DRAW" ? "N" : "D"}</Link>)}</div></td> : null}
    </tr>)}</tbody>
  </table></div>;
}
