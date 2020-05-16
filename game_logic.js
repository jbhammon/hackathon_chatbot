// Module to store functions that handle individual actions of the game

module.exports = {
  hasPlayerTakenTurn: function(db, channel, user) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM players WHERE slack_id = ? AND channel_id = ?`, [user, channel], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        console.log("Was turn taken?");
        console.log(row.taken_turn);
        resolve(row.taken_turn);
      });
    });
  },
  markTurnTaken: function(db, channel, user) {
    return new Promise(resolve => {
      db.run(`UPDATE players SET taken_turn = 1 WHERE slack_id = ? AND channel_id = ?`, [user, channel], err => {
        if (err) {
          return console.error(err.message);
        }
        resolve(`Player ${user} has taken their turn.`);
      });
    });
  },
  incrementTurnCounter: function(db, channel) {
    return new Promise(resolve => {
      db.run(`UPDATE games SET Turns_taken = Turns_taken + 1 WHERE Channel = ?`, [channel], err => {
        if (err) {
          return console.error(err.message);
        }
        resolve(`Game ${channel} has incremented the count of turns taken this round.`);
      });
    });
  },
  checkAllTurnsTaken: function(db, channel) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM games WHERE Channel = ?`, [channel], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        if (row.Number_players === row.Turns_taken) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }
}
