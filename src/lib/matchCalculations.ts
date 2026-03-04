interface MatchupSlot {
  homePlayerId: string;
  awayPlayerId: string;
  homePoints: number;
  awayPoints: number;
}

interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeMatchPoints: number;
  awayMatchPoints: number;
  homeFantasyPoints: number;
  awayFantasyPoints: number;
  slots: MatchupSlot[];
  homeBonusATP: boolean;
  homeBonusWTA: boolean;
  awayBonusATP: boolean;
  awayBonusWTA: boolean;
}

export const calculateSlotPoints = (homePoints: number, awayPoints: number): { home: number; away: number } => {
  if (homePoints > awayPoints) return { home: 3, away: 0 };
  if (awayPoints > homePoints) return { home: 0, away: 3 };
  return { home: 1, away: 1 };
};

export const calculateHeadToHeadMatch = (
  homeLineup: any,
  awayLineup: any,
  playerPoints: Map<string, number>,
  homeCaptain: string | null,
  awayCaptain: string | null
): MatchResult => {
  const slots: MatchupSlot[] = [];
  let homeMatchPoints = 0;
  let awayMatchPoints = 0;
  let homeFantasyPoints = 0;
  let awayFantasyPoints = 0;
  let homeATPPoints = 0;
  let awayATPPoints = 0;
  let homeWTAPoints = 0;
  let awayWTAPoints = 0;

  const getPlayerPoints = (playerId: string, isCaptain: boolean): number => {
    const basePoints = playerPoints.get(playerId) || 0;
    return isCaptain ? basePoints * 2 : basePoints;
  };

  const homeFormation = homeLineup.formation;
  const awayFormation = awayLineup.formation;

  if (homeFormation.atpSingles && awayFormation.atpSingles) {
    for (let i = 0; i < Math.min(homeFormation.atpSingles.length, awayFormation.atpSingles.length); i++) {
      const homePlayer = homeFormation.atpSingles[i];
      const awayPlayer = awayFormation.atpSingles[i];

      if (homePlayer && awayPlayer) {
        const homePoints = getPlayerPoints(homePlayer, homePlayer === homeCaptain);
        const awayPoints = getPlayerPoints(awayPlayer, awayPlayer === awayCaptain);

        const slotResult = calculateSlotPoints(homePoints, awayPoints);
        homeMatchPoints += slotResult.home;
        awayMatchPoints += slotResult.away;

        homeFantasyPoints += homePoints;
        awayFantasyPoints += awayPoints;
        homeATPPoints += homePoints;
        awayATPPoints += awayPoints;

        slots.push({
          homePlayerId: homePlayer,
          awayPlayerId: awayPlayer,
          homePoints,
          awayPoints,
        });
      }
    }
  }

  if (homeFormation.wtaSingles && awayFormation.wtaSingles) {
    for (let i = 0; i < Math.min(homeFormation.wtaSingles.length, awayFormation.wtaSingles.length); i++) {
      const homePlayer = homeFormation.wtaSingles[i];
      const awayPlayer = awayFormation.wtaSingles[i];

      if (homePlayer && awayPlayer) {
        const homePoints = getPlayerPoints(homePlayer, homePlayer === homeCaptain);
        const awayPoints = getPlayerPoints(awayPlayer, awayPlayer === awayCaptain);

        const slotResult = calculateSlotPoints(homePoints, awayPoints);
        homeMatchPoints += slotResult.home;
        awayMatchPoints += slotResult.away;

        homeFantasyPoints += homePoints;
        awayFantasyPoints += awayPoints;
        homeWTAPoints += homePoints;
        awayWTAPoints += awayPoints;

        slots.push({
          homePlayerId: homePlayer,
          awayPlayerId: awayPlayer,
          homePoints,
          awayPoints,
        });
      }
    }
  }

  if (homeFormation.mixedDoubles && awayFormation.mixedDoubles) {
    for (let i = 0; i < Math.min(homeFormation.mixedDoubles.length, awayFormation.mixedDoubles.length); i++) {
      const homePair = homeFormation.mixedDoubles[i];
      const awayPair = awayFormation.mixedDoubles[i];

      if (homePair?.atp && homePair?.wta && awayPair?.atp && awayPair?.wta) {
        const homeATPPoints = getPlayerPoints(homePair.atp, homePair.atp === homeCaptain);
        const homeWTAPoints = getPlayerPoints(homePair.wta, homePair.wta === homeCaptain);
        const awayATPPoints = getPlayerPoints(awayPair.atp, awayPair.atp === awayCaptain);
        const awayWTAPoints = getPlayerPoints(awayPair.wta, awayPair.wta === awayCaptain);

        const homePairTotal = homeATPPoints + homeWTAPoints;
        const awayPairTotal = awayATPPoints + awayWTAPoints;

        const slotResult = calculateSlotPoints(homePairTotal, awayPairTotal);
        homeMatchPoints += slotResult.home;
        awayMatchPoints += slotResult.away;

        homeFantasyPoints += homePairTotal;
        awayFantasyPoints += awayPairTotal;

        slots.push({
          homePlayerId: `${homePair.atp}+${homePair.wta}`,
          awayPlayerId: `${awayPair.atp}+${awayPair.wta}`,
          homePoints: homePairTotal,
          awayPoints: awayPairTotal,
        });
      }
    }
  }

  const homeBonusATP = homeATPPoints > awayATPPoints;
  const awayBonusATP = awayATPPoints > homeATPPoints;
  const homeBonusWTA = homeWTAPoints > awayWTAPoints;
  const awayBonusWTA = awayWTAPoints > homeWTAPoints;

  if (homeBonusATP) homeMatchPoints += 3;
  if (awayBonusATP) awayMatchPoints += 3;
  if (homeBonusWTA) homeMatchPoints += 3;
  if (awayBonusWTA) awayMatchPoints += 3;

  return {
    homeTeamId: homeLineup.user_id,
    awayTeamId: awayLineup.user_id,
    homeMatchPoints,
    awayMatchPoints,
    homeFantasyPoints,
    awayFantasyPoints,
    slots,
    homeBonusATP,
    homeBonusWTA,
    awayBonusATP,
    awayBonusWTA,
  };
};

export const generateRoundRobinMatches = (lineups: any[]): Array<[any, any]> => {
  const matches: Array<[any, any]> = [];

  for (let i = 0; i < lineups.length; i++) {
    for (let j = i + 1; j < lineups.length; j++) {
      matches.push([lineups[i], lineups[j]]);
    }
  }

  return matches;
};
