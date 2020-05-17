// Module to store functions that handle individual actions of the game
const axios = require('axios');

module.exports = {
  checkAllPlayersDead: function(db, channel) {
    return new Promise(resolve => {
      db.all(`SELECT * FROM players WHERE channel_id = ? AND health > 0`, [channel], (err, rows) => {
        if (err) {
          return console.error(err.message);
        }
        resolve(rows.length);
      });
    });
  },
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
        const name = row.name;
        db.run(`INSERT INTO boss_instances(channel_id, boss_id, health, total_health, name) VALUES (?,?,?,?, ?)`, [channel, progression, health, health, name]), function(err) {
          if (err) {
            console.error(err.message);
          }
          // resolve("this resolved");
        }
        resolve("this resolved");
      })
    })
  },


  doesAttackLand: function() {
    const roll = Math.random();
    if (roll <= 0.8) {
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
  determineVictim: function(db, channel) {
    return new Promise(resolve => {
      db.all(`SELECT * FROM players WHERE channel_id = ? AND health > 0`, [channel], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        let randomNo = Math.floor(Math.random() * row.length)
        resolve(row[randomNo].slack_id)
      });
    });
  },
  calculateDamage: function() {
    const roll = Math.floor(Math.random() * 15);
    return roll;
  },
  calculateBossDamage: function(db, progression) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM boss_info WHERE pk = ?`, [progression], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        let power = row.attack_power
        const roll = Math.floor(Math.random() * 10 * power)
        resolve(roll)
      });
    });
  },
  calculateHeal: function() {
    const roll = Math.floor(Math.random() * 15);
    return roll
  },
  calculateBossHeal: function () {
    const roll = Math.floor(Math.random() * 10)
    return roll
  },
  determineBossAction: function(db, channel, progression) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM boss_instances WHERE channel_id = ? AND boss_id = ?`, [channel, progression], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        if (row.health < (.5 * row.total_health)){
          const roll = Math.random();
          if (roll <= .4){
            resolve("heal")
          } else {
            resolve("attack")
          }
        } else {
          resolve("attack")
        }
      });
    });
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
  damagePlayer: function(db, channel, user, damage) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM players WHERE channel_id = ? AND slack_id = ?`, [channel, user], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        const didDodge = row.is_dodging;
        const newHealth = row.health - damage;
        if (didDodge === 0) {
          db.run(`UPDATE players SET health = health - ? WHERE channel_id = ? AND slack_id = ?`, [damage, channel, user], err => {
            if (err) {
              return console.error(err.message);
            }
            if (newHealth <= 0) {
              resolve('unconscious');
            } else {
              resolve('damaged');
            }
          });
        } else if (didDodge === 1) {
          resolve(`dodged`)
        }
      })
    });
  },
  healBoss: function(db, channel, progression, heal) {
    return new Promise(resolve => {
      db.run(`UPDATE boss_instances SET health = health + ? WHERE channel_id = ? AND boss_id = ?`, [heal, channel, progression], err => {
        if (err) {
          return console.error(err.message);
        }
        resolve(`${heal} health was restored to the boss.`);
      });
    });
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
  },
  getBossHealth: function(db, channel, progression) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM boss_instances WHERE channel_id = ? AND boss_id = ?`, [channel, progression], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        let healthArray = [row.health, row.total_health]
        resolve(healthArray);
      });
    });
  },
  getBossName: function(db, channel, progression) {
    return new Promise(resolve => {
      db.get(`SELECT * FROM boss_instances WHERE channel_id = ? AND boss_id = ?`, [channel, progression], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        let newName = row.name
        resolve(newName);
      });
    });
  },
  getPlayerInfo: async function(player, token) {
    const data = await axios.get(`https://slack.com/api/users.info?token=${token}&user=${player}`);
    let displayName;
    if (data.data.user.profile.display_name === '') {
      displayName = data.data.user.real_name;
    } else {
      displayName = data.data.user.profile.display_name;
    }
    console.log(displayName);
    return displayName
  },

}
