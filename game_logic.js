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
}
