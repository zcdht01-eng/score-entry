const PLACES = [7, 5, 4, 3, 2, 1];
const TRACKS = ["100米", "200米", "400米", "800米", "4×100米接力"];

function rankScores(source) {
  const rows = source.map(row => ({ ...row, mark: Number(row.result) }));
  const groups = {};
  rows.forEach(row => { const key = `${row.event_name}|${row.division}`; (groups[key] ||= []).push(row); });
  Object.values(groups).forEach(group => {
    group.sort((a, b) => TRACKS.includes(a.event_name) ? a.mark - b.mark : b.mark - a.mark);
    let last = null, place = 0;
    group.forEach((row, index) => {
      if (last === null || row.mark !== last) place = index + 1;
      row.rank = place;
      last = row.mark;
      row.points = (PLACES[place - 1] || 0) * (row.event_name.includes("接力") ? 2 : 1)
        + (row.record_level === "school" ? 7 : 0) + (row.record_level === "grade" ? 5 : 0);
    });
  });
  return rows;
}

function classTotals(rows, level) {
  const totals = {};
  rankScores(rows).filter(row => level === "初中" ? row.division.startsWith("初") : row.division.startsWith("高")).forEach(row => {
    const total = totals[row.class_name] ||= { points: 0, firsts: 0 };
    total.points += row.points;
    if (row.rank === 1) total.firsts++;
  });
  return Object.entries(totals).sort((a,b) => b[1].points-a[1].points || b[1].firsts-a[1].firsts);
}

module.exports = { rankScores, classTotals };
