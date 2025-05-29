import React from 'react';
import { Trophy, Clock } from 'lucide-react';
import { formatTimeDisplay } from '../../utils/helpers';
import './MiniLeaderboard.css';

const MiniLeaderboard = ({ entries, currentUserId }) => {
  const getMedalColor = (rank) => {
    switch (rank) {
      case 1: return 'gold';
      case 2: return 'silver';
      case 3: return 'bronze';
      default: return null;
    }
  };

  return (
    <div className="mini-leaderboard">
      {entries.map((entry) => {
        const isCurrentUser = entry.user_id === currentUserId;
        const medalColor = getMedalColor(entry.rank);

        return (
          <div 
            key={entry.user_id} 
            className={`leaderboard-entry ${isCurrentUser ? 'current-user' : ''}`}
          >
            <div className="entry-rank">
              {medalColor ? (
                <Trophy size={20} className={`medal ${medalColor}`} />
              ) : (
                <span className="rank-number">{entry.rank}</span>
              )}
            </div>

            <div className="entry-user">
              {entry.pfp_url ? (
                <img 
                  src={entry.pfp_url} 
                  alt={entry.username || entry.display_name} 
                  className="user-avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  {(entry.username || entry.display_name)?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <span className="user-name">
                {entry.username || entry.display_name || `User ${entry.fid}`}
                {isCurrentUser && ' (You)'}
              </span>
            </div>

            <div className="entry-stats">
              <div className="stat-item">
                <span className="stat-value">{entry.percentage}%</span>
              </div>
              <div className="stat-item">
                <Clock size={12} />
                <span className="stat-value">{formatTimeDisplay(entry.time_taken)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MiniLeaderboard;