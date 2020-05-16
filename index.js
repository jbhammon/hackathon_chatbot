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

// // Start Handler
// bot.on('start', () => {
//   const params = {
//     icon_emoji: ':smiley:'
//   };

//   bot.postMessageToChannel(
//     'general',
//     'Get Ready To Laugh With @Jokebot!',
//     params
//   );
// });

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
    var prog = await findProgression(channel);

    // A game hasn't been started in the channel yet
    if (prog < 0){
      if (message.includes(' start')) {
        startGame(channel);
      } else {
        bot.postMessage(channel, `You need to start a game! Do so by typing "@MUD_Bot start"`)
      }
    } else {
      if (message.includes(' start')) {
        bot.postMessage(channel, 'You already have a game in progress!')
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
        let numberOfPlayers = await countPlayersInGame(channel);
        updatePlayersInGame(channel, numberOfPlayers);
        bot.postMessage(channel, 'Welcome to your adventure. Your task is to defeat monsters of increasing difficulty in order to save your office and collect rewards. Your first opponent is JAMMED PRINTER, the fearless. Please begin your battle by typing "@MUD_Bot Attack"! Good Luck!');
      }
    }

    // They players are in the typical turn-based point of the game
    else if (prog > 0) {
      // if the player hasn't taken their turn yet
      const takenTurn = await game_logic.hasPlayerTakenTurn(db, channel, user)
      if( !takenTurn ) {
        bot.postMessage(channel, 'You haven\'t taken a turn yet.')
        // determine which action they chose
        // apply effects of that action

        // if boss is defeated
          // declare victory
          // update game progression
          // send message about next event
          // reset all player turn flags and count of turns taken
        // else
          // update player's turn flag, increment count of turns taken
          // if all player turns are taken
            // reset all player turn flags and count of turns taken
            // Send message that it's the boss' turn
            // Boss takes their turn
            // send message describing boss' action
            // apply effects of that action
            // if a player reaches 0 health
              // something happens...?
            // send message that it's the players' turns again
          // else
            // Send message that players still have turns to take
        } else {
          // send message to remind player they've already taken their turn
          bot.postMessage(channel, 'You already took your turn.')
        }
    }



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
  bot.postMessage(channel, `Game created. Please choose your individual classes by typing @MUD_Bot register <class name>. You are able to play as a WIZARD, a WARRIOR, or an ARCHER.`);
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
  db.run(`INSERT INTO players(slack_id, channel_id, class, level, health, taken_turn) VALUES (?, ?, ?, ?, ?, ?)`, [user, channel, profession, 1, 100, 0] , function(err) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
  });
  bot.postMessage(channel, `${profession} chosen. Please type "@MUD_Bot ready" when all players are ready to begin the adventure!`)

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


//   })
//   db.get(`SELECT * from games WHERE Channel = ?`, channel, (err, row) => {
//     if (err) {
//       return console.log(err.message);
//     }
//     // return new Promise( function (resolve, reject) {
//     //   resolve(row.Progression)
//     // });
//     console.log(row.Progression)
//     return row.Progression
//   });
//   // bot.postMessage(channel, 'Yo this game exists')
// }



















// function chuckJoke(channel) {
//   axios.get('http://api.icndb.com/jokes/random').then(res => {
//     const joke = res.data.value.joke;

//     const params = {
//       icon_emoji: ':laughing:'
//     };

//     bot.postMessage(channel, `Chuck Norris: ${joke}`, params);
//   });
// }

// // Tell a Yo Mama Joke
// function yoMamaJoke(channel) {
//   axios.get('http://api.yomomma.info').then(res => {
//     const joke = res.data.joke;

//     const params = {
//       icon_emoji: ':laughing:'
//     };

//     bot.postMessage(channel, `Yo Mama: ${joke}`, params);
//   });
// }

// // Tell a Random Joke
// function randomJoke(channel) {
//   const rand = Math.floor(Math.random() * 2) + 1;
//   if (rand === 1) {
//     chuckJoke(channel);
//   } else if (rand === 2) {
//     yoMamaJoke(channel);
//   }
// }

// // Show Help Text
// function runHelp(channel) {
//   const params = {
//     icon_emoji: ':question:'
//   };

//   bot.postMessage(
//     channel,
//     `Type @jokebot with either 'chucknorris', 'yomama' or 'random' to get a joke`,
//     params
//   );
// }
