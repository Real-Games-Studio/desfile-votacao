// Calculo do ranking agregado a partir da lista de votos.

/**
 * @param {Array<{top3:string[],station:string,ts:number}>} votes
 * @param {Array<{id:string,escola:string,ano:number,enredo:string,foto:string}>} desfiles
 * @param {{mode:string, weights:Record<string,number>}} scoring
 */
export function computeRanking(votes, desfiles, scoring) {
  const points = new Map();
  for (const d of desfiles) points.set(d.id, 0);

  for (const vote of votes) {
    vote.top3.forEach((id, idx) => {
      if (!points.has(id)) return; // ignora ids desconhecidos
      const pos = String(idx + 1); // '1' | '2' | '3'
      const inc = scoring.mode === 'count' ? 1 : scoring.weights[pos] ?? 0;
      points.set(id, points.get(id) + inc);
    });
  }

  const totalPoints = [...points.values()].reduce((a, b) => a + b, 0);

  const entries = desfiles
    .map((d) => ({
      id: d.id,
      escola: d.escola,
      gres: d.gres,
      ano: d.ano,
      enredo: d.enredo,
      still: d.still,
      thumb: d.thumb,
      real: d.real,
      points: points.get(d.id) ?? 0,
      pct: totalPoints > 0 ? Math.round((points.get(d.id) / totalPoints) * 100) : 0,
    }))
    .sort((a, b) => b.points - a.points || a.escola.localeCompare(b.escola))
    .map((e, i) => ({ ...e, position: i + 1 }));

  return {
    entries,
    totalVotes: votes.length,
    updatedAt: votes.length ? votes[votes.length - 1].ts : 0,
  };
}
