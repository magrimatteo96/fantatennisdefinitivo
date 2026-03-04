import { Calendar } from 'lucide-react';

interface TournamentCalendarProps {
  tournaments: Array<{
    round_number: number;
    name: string;
    type: string;
    opponents_count: number;
  }>;
}

const CALENDAR_DATA = [
  { round: 1, start: '05/01/2026', end: '25/01/2026', type: 'SLAM (3 Sett)' },
  { round: 2, start: '26/01/2026', end: '01/02/2026', type: '250' },
  { round: 3, start: '02/02/2026', end: '08/02/2026', type: 'Misto 500/250' },
  { round: 4, start: '09/02/2026', end: '15/02/2026', type: 'Master 1000' },
  { round: 5, start: '16/02/2026', end: '22/02/2026', type: 'Master 1000' },
  { round: 6, start: '23/02/2026', end: '01/03/2026', type: 'Misto 500/250' },
  { round: 7, start: '04/03/2026', end: '15/03/2026', type: 'MASTER 1000 (12 Giorni)' },
  { round: 8, start: '18/03/2026', end: '29/03/2026', type: 'MASTER 1000 (12 Giorni)' },
  { round: 9, start: '30/03/2026', end: '05/04/2026', type: '250' },
  { round: 10, start: '06/04/2026', end: '12/04/2026', type: 'ATP 1000 solo maschi' },
  { round: 11, start: '13/04/2026', end: '19/04/2026', type: 'Misto 500/250' },
  { round: 12, start: '22/04/2026', end: '03/05/2026', type: 'MASTER 1000 (12 Giorni)' },
  { round: 13, start: '06/05/2026', end: '17/05/2026', type: 'MASTER 1000 (12 Giorni)' },
  { round: 14, start: '18/05/2026', end: '07/06/2026', type: 'SLAM + Lead-up (3 Sett)' },
  { round: 15, start: '08/06/2026', end: '14/06/2026', type: '250' },
  { round: 16, start: '15/06/2026', end: '21/06/2026', type: '500' },
  { round: 17, start: '22/06/2026', end: '12/07/2026', type: 'SLAM (3 Sett)' },
  { round: 18, start: '13/07/2026', end: '19/07/2026', type: '250' },
  { round: 19, start: '20/07/2026', end: '26/07/2026', type: '250' },
  { round: 20, start: '27/07/2026', end: '02/08/2026', type: '500' },
  { round: 21, start: '06/08/2026', end: '17/08/2026', type: 'MASTER 1000 (12 Giorni)' },
  { round: 22, start: '19/08/2026', end: '30/08/2026', type: 'MASTER 1000 (12 Giorni)' },
  { round: 23, start: '31/08/2026', end: '13/09/2026', type: 'SLAM (2 Sett)' },
  { round: 24, start: '14/09/2026', end: '20/09/2026', type: '250 solo donne' },
  { round: 25, start: '21/09/2026', end: '27/09/2026', type: '250' },
  { round: 26, start: '28/09/2026', end: '04/10/2026', type: 'MASTER 1000' },
  { round: 27, start: '07/10/2026', end: '18/10/2026', type: 'MASTER 1000 (12 Giorni)' },
  { round: 28, start: '19/10/2026', end: '25/10/2026', type: '250' },
  { round: 29, start: '26/10/2026', end: '01/11/2026', type: '500' },
  { round: 30, start: '02/11/2026', end: '08/11/2026', type: 'MASTER 1000' },
];

function getTournamentColor(opponentsCount: number): string {
  switch (opponentsCount) {
    case 3:
      return 'bg-green-100 border-green-400 text-green-900';
    case 2:
      return 'bg-yellow-100 border-yellow-400 text-yellow-900';
    case 1:
      return 'bg-red-100 border-red-400 text-red-900';
    default:
      return 'bg-gray-100 border-gray-400 text-gray-900';
  }
}

function getMatchupInfo(opponentsCount: number): string {
  switch (opponentsCount) {
    case 3:
      return '3 opponents (12 matchups)';
    case 2:
      return '2 opponents (8 matchups)';
    case 1:
      return '1 opponent (4 matchups)';
    default:
      return '';
  }
}

export default function TournamentCalendar({ tournaments }: TournamentCalendarProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Calendar className="w-6 h-6" />
        2026 Season Calendar
      </h2>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-400 rounded-lg">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <div>
            <div className="font-bold text-green-900">SLAM (Verde)</div>
            <div className="text-sm text-green-700">3 opponents • 12 matchups</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
          <div>
            <div className="font-bold text-yellow-900">Master 1000 (Giallo)</div>
            <div className="text-sm text-yellow-700">2 opponents • 8 matchups</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-red-50 border-2 border-red-400 rounded-lg">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <div>
            <div className="font-bold text-red-900">250/500 (Rosso)</div>
            <div className="text-sm text-red-700">1 opponent • 4 matchups</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {tournaments.map((tournament) => {
          const calendarInfo = CALENDAR_DATA.find(c => c.round === tournament.round_number);
          const colorClass = getTournamentColor(tournament.opponents_count);
          const matchupInfo = getMatchupInfo(tournament.opponents_count);

          return (
            <div
              key={tournament.round_number}
              className={`p-4 rounded-lg border-2 ${colorClass}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-lg">Round {tournament.round_number}</span>
                    <span className="font-bold text-lg">{tournament.name}</span>
                  </div>
                  <div className="text-sm opacity-80">
                    {calendarInfo && (
                      <span>{calendarInfo.start} - {calendarInfo.end}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{tournament.type}</div>
                  <div className="text-xs opacity-80 mt-1">{matchupInfo}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
