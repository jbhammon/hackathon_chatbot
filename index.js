const SlackBot = require('slackbots');
const sqlite3 = require('sqlite3').verbose();
const bot_token = require('./slack_token');

const game_logic = require('./game_logic');

let db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
});

const bot = new SlackBot({
  token: bot_token.token,
  name: 'rpg_bot'
});

// Error Handler
bot.on('error', err => console.log(err));

// Message Handler
bot.on('message', data => {
  if (data.type !== 'message') {
    return;
  }

  handleMessage(data.text, data.channel, data.user, data.subtype);
});

// Respons to Data
async function handleMessage(message, channel, user, subtype) {



  if (subtype !== 'bot_message') {
    let nextMsg = '';
    var prog = await findProgression(channel);

    // A game hasn't been started in the channel yet
    if (prog < 0){
      if (message.includes(' start')) {
        startGame(channel);
      } else {
        // bot.postMessage(channel, `You need to start a game! Do so by typing "@MUD_Bot start"`)
        nextMsg = nextMsg.concat('You need to start a game! Do so by typing "@MUD_Bot start"');
      }
    } else {
      if (message.includes(' start')) {
        // bot.postMessage(channel, 'You already have a game in progress!');
        nextMsg = nextMsg.concat('You already have a game in progress!');
      }
    }

    // A game is started and players need to register the type of character they want to play with
    if (prog === 0) {

      if (message.includes(' register')){
        if (message.includes(' archer')){
          createCharacter(channel, user, "archer")
        } else if (message.includes(' wizard')){
          createCharacter(channel, user, "wizard")
        } else if (message.includes(' warrior')){
          createCharacter(channel, user, "warrior")
        }
      } else if (message.includes(' ready')){
        updateProgression(channel, prog + 1);
        game_logic.createNextBossInstance(db, channel, prog + 1);
        let numberOfPlayers = await countPlayersInGame(channel);
        updatePlayersInGame(channel, numberOfPlayers);
        // bot.postMessage(channel, 'Welcome to your adventure. Your task is to defeat monsters of increasing difficulty in order to save your office and collect rewards. Your first opponent is JAMMED PRINTER, the fearless. Please begin your battle by typing "@MUD_Bot Attack"! Good Luck!');
        nextMsg = nextMsg.concat('Welcome to your adventure.\nYour task is to defeat monsters of increasing difficulty in order to save your office and collect rewards.\nYour first opponent is *JAMMED PRINTER, the fearless*.\nEach player can choose one action per turn:\n- "@MUD_Bot attack"\n- "@MUD_Bot dodge"\n- "@MUD_Bot heal"\nGood Luck!');
      }
    }

    // They players are in the typical turn-based point of the game
    else if (prog > 0) {

      // is the player unconscious?
      let playerHealth = await game_logic.getPlayerHealth(db, channel, user);
      if (playerHealth <= 0) {
        nextMsg = nextMsg.concat('You\'re unconscious!\n');
      } else {
        // if the player hasn't taken their turn yet
        const takenTurn = await game_logic.hasPlayerTakenTurn(db, channel, user)
        if( !takenTurn ) {
          // determine which action they chose
          if (message.includes(' attack')) {
            // bot.postMessage(channel, 'You chose to attack.');
            nextMsg = nextMsg.concat('You chose to attack.\n')
            // determine if the attack lands
              if (game_logic.doesAttackLand()) {
                let damageDone = game_logic.calculateDamage();
                // apply damage to boss
                await game_logic.damageBoss(db, channel, prog, damageDone);
                // send message about damage done to boss
                nextMsg = nextMsg.concat('Your attack did ' + damageDone + ' damage.\n');
              } else {
                // send message about attack missing
                // bot.postMessage(channel, 'Your attack missed.');
                nextMsg = nextMsg.concat('Your attack missed.\n');
              }
          } else if (message.includes(' dodge')) {
            nextMsg = nextMsg.concat('You chose to dodge.\n');
            // determine if dodge worked
            if (game_logic.doesDodgeWork()) {
              // update player's dodge flag to 1
              await game_logic.setDodgeFlag(db, channel, user, 1);
              // reset all dodge flags at the end of the boss turn
            }
          } else if (message.includes(' heal')) {
            nextMsg = nextMsg.concat('You chose to heal.\n');
            // calculate amount healed
            let healthGained = game_logic.calculateHeal();
            // add it to the player's health
            await game_logic.healPlayer(db, channel, user, healthGained);
            nextMsg = nextMsg.concat('You gained ' + healthGained + ' health.\n');
            let playerHealth = await game_logic.getPlayerHealth(db, channel, user);
            nextMsg = nextMsg.concat('Your health is now ' + playerHealth + ' out of 100.\n');
          }


          // if boss is defeated
          let bossHealthCheck = await game_logic.getBossHealth(db, channel, prog);

          if (bossHealthCheck[0] <= 0) {
            // declare victory
            nextMsg = nextMsg.concat('You defeated the boss!\n');
            // update game progression
            updateProgression(channel, prog + 1);
            // create next boss instance
            await game_logic.createNextBossInstance(db, channel, prog + 1);
            // get boss name
            bossName = await game_logic.getBossName(db, channel, prog + 1)
            // send message about next event
            nextMsg = nextMsg.concat(`Get ready for the next boss, ${bossName} \n`);
            // reset all player turn flags
            await game_logic.resetPlayerTurnFlags(db, channel);
            // reset count of turns taken
            await game_logic.resetCountOfTurns(db, channel);
            // bot.postMessage(channel, nextMsg);
          } else {
            // update player's turn flag
            await game_logic.markTurnTaken(db, channel, user);
            // increment count of turns taken
            await game_logic.incrementTurnCounter(db, channel);
            // if all player turns are taken
            const endOfTurn = await game_logic.checkAllTurnsTaken(db, channel);
            if(endOfTurn) {
              // reset all player turn flags
              game_logic.resetPlayerTurnFlags(db, channel);
              // reset count of turns taken
              game_logic.resetCountOfTurns(db, channel);
              // Send message that it's the boss' turn
              nextMsg = nextMsg.concat('All players have taken their turn. Now it\'s the boss\' turn!\n');
              // Boss takes their turn

              let boss_action = await game_logic.determineBossAction(db, channel, prog);
              if (boss_action === "heal"){
                nextMsg = nextMsg.concat('The boss chose to heal.\n');
                //calculate how much health boss heals
                let bossHealthGain = game_logic.calculateBossHeal();
                //heal the boss
                await game_logic.healBoss(db, channel, prog, bossHealthGain);
                //get boss's health
                let bossHealth = await game_logic.getBossHealth(db, channel, prog);
                nextMsg = nextMsg.concat('The boss healed ' + bossHealthGain + ' health and now has ' + bossHealth[0] + '/' + bossHealth[1] + ' health.\n');
              } else if (boss_action === "attack"){
                //calculate damage done to random player
                let bossDamage = await game_logic.calculateBossDamage(db, prog);
                //determine which player receives damage
                let victim = await game_logic.determineVictim(db, channel);

                //find the user name of the victim
                let userHandle = await game_logic.getPlayerInfo(victim, bot_token.token);
                console.log(userHandle);

                //deal damage to player

                let damageResult = await game_logic.damagePlayer(db, channel, victim, bossDamage)
                if (damageResult === "damaged"){
                  nextMsg = nextMsg.concat(`The boss attacked ${userHandle} and dealt ${bossDamage} damage.`)
                } else if (damageResult === "dodged") {
                  nextMsg = nextMsg.concat(`${userHandle} dodged the boss's attack and took no damage.`)
                } else if (damageResult === 'unconscious') {
                  nextMsg = nextMsg.concat(`The boss attacked ${userHandle}. It dealt ${bossDamage} damage and ${userHandle} is now unconscious.`);
                }
              }

              // apply effects of that action
              await game_logic.resetAllDodgeFlags(db, channel);
              // if all players died
              const playersAlive = await game_logic.checkAllPlayersDead(db, channel);
              if (playersAlive === 0) {
                // send message that the party all died, good luck next time
                nextMsg = nextMsg.concat('Everyone in the party is unconscious, better luck next time!\n');
                // reset progression to 0
                updateProgression(channel, 0);
              }
              // else
                // send message that it's the players' turns again
                // bot.postMessage(channel, 'It\'s your turn again!');
                nextMsg = nextMsg.concat('It\'s the player\'s turn again!\n');
            } else {
              // Send message that players still have turns to take
            }
          }
        } else {
          // send message to remind player they've already taken their turn
          nextMsg = nextMsg.concat('You already took your turn.');
        }
      }
    }
    console.log(nextMsg);
    console.log("============================\n");
    bot.postMessage(channel, nextMsg);

  }
}

function startGame(channel) {
  let value = channel;

  db.run(`INSERT INTO games(Channel, Progression, Number_players, Turns_taken) VALUES (?, ?, ?, ?)`, [value, 0, 0, 0] , function(err) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
  });
  bot.postMessage(channel, `Game created.\nPlease choose your character type by typing "@MUD_Bot register <character type>".\nYour options are:\n- *WIZARD*\n- *WARRIOR*\n- *ARCHER*`);
}

function updateProgression(channel, prog) {
  db.run(`UPDATE games SET Progression = ? WHERE Channel = ?`, [prog, channel] , function(err) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been updated`);
  });
}

function createCharacter(channel, user, profession) {
  return new Promise(resolve => {
    db.get(`SELECT * FROM players WHERE slack_id = ? AND channel_id = ?`, [user, channel], (err, row) => {
      if (err) {
        return console.error(err.message);
      }
      if (row) {
        db.run(`UPDATE players SET class = ?, health = 100, taken_turn = 0, is_dodging = 0 WHERE slack_id = ? AND channel_id = ?`, [profession, user, channel] , function(err) {
          if (err) {
            return console.log(err.message);
          }
          bot.postMessage(channel, `Updated class to *${profession}*. Please type "@MUD_Bot ready" when all players are ready to begin the adventure!`);
          resolve(`Updated ${user}'s character.'`);
        });
      } else {
        db.run(`INSERT INTO players(slack_id, channel_id, class, level, health, taken_turn, is_dodging) VALUES (?, ?, ?, ?, ?, ?, ?)`, [user, channel, profession, 1, 100, 0, 0] , function(err) {
          if (err) {
            return console.log(err.message);
          }
          bot.postMessage(channel, `*${profession}* chosen. Please type "@MUD_Bot ready" when all players are ready to begin the adventure!`);
          resolve(`Created ${user}'s character.'`);
        });
      }
    });
  });
}

function countPlayersInGame(channel) {
  return new Promise(function (resolve, reject) {
    db.all(`SELECT * FROM players WHERE channel_id = ?`, channel, (err, rows) => {
      if (err) {
        return console.log(err.message);
      }
      resolve(rows.length);
    });
  });
}

function updatePlayersInGame(channel, numberOfPlayers) {
  return new Promise(function (resolve, reject) {
    db.run(`UPDATE games SET Number_players = ? WHERE Channel = ?`, [numberOfPlayers, channel], (err, rows) => {
      if (err) {
        console.log(err.message);
        reject(err.message);
      }
      // The game was successfully updated to contain the number of players being included
      resolve('Success!');
    });
  });
}

function findProgression(channel){
  return new Promise(async function (resolve, reject) {
    db.get(`SELECT * from games WHERE Channel = ?`, channel, (err, row) => {
      if (err) {
        return console.log(err.message);
      }
      if (row !== undefined){
        resolve(row.Progression)
      } else {
        resolve(-1)
      }
    });
  });
}

// createNextBossInstance: function(db, channel, progression) {
//   // return new Promise(resolve => {
//   db.get(`SELECT * FROM boss_info WHERE pk = ?`, [progression], (err, row) => {
//     if (err) {
//       return console.error(err.message);
//     }
//     const health = row.health;
//     const name = row.name;
//     db.run(`INSERT INTO boss_instances(channel_id, boss_id, health, total_health, name) VALUES (?,?,?,?, ?)`, [channel, progression, health, health, name]), function(err) {
//       if (err) {
//         console.error(err.message);
//       }
//       return new Promise(resolve => {
//         resolve('this resolved');
//       })
//     }
//   // })
//   })
// },
