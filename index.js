const SlackBot = require('slackbots');
const sqlite3 = require('sqlite3').verbose();
const bot_token = require('./slack_token');

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
  console.log(data)
  handleMessage(data.text, data.channel, data.user);
});

// Respons to Data
function handleMessage(message, channel, user) {
  if (message.includes(' start')) {
    startGame(channel);
  }

  // } else if (message.includes(' yomama')) {
  //   yoMamaJoke(channel);
  // } else if (message.includes(' random')) {
  //   randomJoke(channel);
  // } else if (message.includes(' help')) {
  //   runHelp(channel);
  // }
}

function startGame(channel) {
  let value = channel;

  db.run(`INSERT INTO games(Channel, Progression) VALUES (?, ?)`, [value, 1] , function(err) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
  });
  bot.postMessage(channel, `Game created. Please choose your individual classes by typing @MUD_Bot <class name>. You are able to play as a WIZARD, a WARRIOR, or an ARCHER.`);
}

function createCharacter(channel, user) {


}



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
