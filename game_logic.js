// Module to store functions that handle individual actions of the game

module.exports = {
  hasPlayerTakenTurn: function(db, channel, user) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM players WHERE slack_id = ? AND channel_id = ?`, [user, channel], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
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
  },
  resetPlayerTurnFlags: function(db, channel) {
    return new Promise(resolve => {
      db.run(`UPDATE players SET taken_turn = 0 WHERE channel_id = ?`, [channel], err => {
        if (err) {
          return console.error(err.message);
        }
        resolve(`Game ${channel} reset all the player turn flags.`);
      });
    });
  },
  resetCountOfTurns: function(db, channel) {
    return new Promise(resolve => {
      db.run(`UPDATE games SET Turns_taken = 0 WHERE Channel = ?`, [channel], err => {
        if (err) {
          return console.error(err.message);
        }
        resolve(`Game ${channel} reset the number of turns taken.`);
      })
    })
  },


  createNextBossInstance: function(db, channel, progression) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM boss_info WHERE pk = ?`, [progression], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        const health = row.health;
        db.run(`INSERT INTO boss_instances(channel_id, boss_id, health) VALUES (?,?,?)`, [channel, progression, health]), err => {
          if (err) {
            return console.error(err.message);
          }
          resolve(`New boss instance for channel ${channel} at progression ${progression} created.`);
        }
      })
    })
  },


  doesAttackLand: function() {
    const roll = Math.random();
    if (roll <= 0.75) {
      return true;
    }
    return false;
  },
  doesDodgeWork: function() {
    const roll = Math.random();
    if (roll <= 0.6) {
      return true;
    }
    return false;
  },
  setDodgeFlag: function(db, channel, user, value) {
    return new Promise(resolve => {
      db.run(`UPDATE players SET is_dodging = ? WHERE channel_id = ? AND slack_id = ?`, [value, channel, user], err => {
        if (err) {
          return console.error(err.message);
        }
        resolve(`${user} is ready to dodge an attack.`);
      });
    });
  },
  resetAllDodgeFlags: function(db, channel) {
    return new Promise(resolve => {
      db.run(`UPDATE players SET is_dodging = 0 WHERE channel_id = ?`, [channel], err => {
        if (err) {
          return console.error(err.message);
        }
        resolve(`Players are no longer ready to dodge attacks.`);
      });
    });
  },
  calculateDamage: function() {
    const roll = Math.floor(Math.random() * 15);
    return roll;
  },
  calculateHeal: function() {
    const roll = Math.floor(Math.random() * 15);
    return roll
  },
  damageBoss: function(db, channel, progression, damage) {
    return new Promise(resolve => {
      db.run(`UPDATE boss_instances SET health = health - ? WHERE channel_id = ? AND boss_id = ?`, [damage, channel, progression], err => {
        if (err) {
          return console.error(err.message);
        }
        resolve(`${damage} damage done to the boss.`);
      });
    });
  },
  damagePlayer: function() {
    return true;
  },
  healPlayer: function(db, channel, user, heal) {
    return new Promise(resolve => {
      db.run(`UPDATE players SET health = health + ? WHERE channel_id = ? AND slack_id = ?`, [heal, channel, user], err => {
        if (err) {
          return console.error(err.message);
        }
        resolve(`${heal} health was restored to ${user}.`);
      });
    });
  },
  getPlayerHealth: function(db, channel, user) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM players WHERE channel_id = ? AND slack_id = ?`, [channel, user], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        resolve(row.health);
      });
    });
  }
}
