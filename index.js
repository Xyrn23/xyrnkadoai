const fs = require("fs");
const login = require("fb-chat-api");

const loginCred = {
  appState: JSON.parse(fs.readFileSync("session.json", "utf-8")),
};

let running = false;
let stopListener = null;

function startListener(api, event) {
  try {
    if (running) {
      api.sendMessage(`Already running!`, event.threadID);
      return;
    }

    running = true;
    const randMes = [
      "Hi there! How can I assist you today?",
      "Hey, I'm your friendly chatbot! What can I help you with?",
      "What is your will?",
      "You're Finally awake",
      "Welcome! I'm here to answer any questions you might have. What would you like to know?",
      "Ho Ho Ho, You Found me",
      "Be quick. Time is of the essence. And be careful. The blade is cursed.",
      "What is your will?",
    ];
    const randomIndex = Math.floor(Math.random() * randMes.length);
    const randomMessage = randMes[randomIndex];
    const img = {
      body: randomMessage,
      attachment: fs.createReadStream(__dirname + "/image/dragon.png"),
    };
    api.sendMessage(img, event.threadID, (err) => {
      if (err) {
        console.error(err);
      }
    });

    stopListener = api.listenMqtt((err, event) => {
      if (!running) {
        return;
      }

      if (err) {
        console.log("listenMqtt error", err);
        start();
        return;
      }

      api.markAsRead(event.threadID, (err) => {
        if (err) {
          console.error(err);
          return;
        }
      });

      api.sendTypingIndicator(event.threadID, (err) => {
        if (err) {
          console.log(err);
          return;
        }
      });

      if (event.type === "message") {
        try {
          if (event.body === "/help") {
            api.sendMessage(
              "    'COMMANDS'  ```\n /img 'ANY COMMANDS eg. image of a pug'- Generate an image \n /xi 'YOUR QUESTION'- Ask the AI \n /stop - Stop \n /continue - continue the ai```",
              event.threadID
            );
          }
          if (event.body.includes("/img")) {
            event.body = event.body.replace("img", "");
            if (event.body.includes("hahaha")) {
              api.setMessageReaction(":laughing:", event.messageID, (err) => {
                if (err) {
                  console.error(err);
                  return;
                }
              });
            } else if (event.body.includes("thankyou")) {
              api.setMessageReaction(":love:", event.messageID, (err) => {
                if (err) {
                  console.error(err);
                  return;
                }
              });
            }
            require("./functions/imghandler")(api, event);
          } else if (event.body.includes("/xi")) {
            event.body = event.body.replace("/xi", "");
            if (event.body.includes("hahaha")) {
              api.setMessageReaction(":laughing:", event.messageID, (err) => {
                if (err) {
                  console.error(err);
                  return;
                }
              });
            } else if (event.body.includes("thankyou")) {
              api.setMessageReaction(":love:", event.messageID, (err) => {
                if (err) {
                  console.error(err);
                  return;
                }
              });
            }

            require("./functions/handler.js")(api, event, (err, data) => {
              console.log(err);
              console.log(data);
              if (err) {
                api.sendMessage(`Error: ${err}`, event.threadID);
                return;
              }
            });
          }
        } catch (error) {
          console.log(error);
          api.sendMessage("An error has been occured.", event.threadID);
        }
      }
    });
  } catch (error) {
    console.error(error);
    api.sendMessage("Error: " + error.message, event.threadID);
  }
}

function stopListenerFunc(api, event) {
  if (!running) {
    if (api) {
      api.sendMessage(`Not running!`, event ? event.threadID : null);
    } else {
      console.error("API not available");
    }
    return;
  }
  running = false;
  if (api) {
    api.sendMessage(`Okay`, event.threadID);
  } else {
    console.error("API not available");
  }
  let count = 3;
  const countdown = setInterval(() => {
    if (api) {
      api.sendMessage(`Stopping in ${count}`, event.threadID);
    } else {
      console.error("API not available");
    }
    count--;
    if (count === 0) {
      clearInterval(countdown);
      if (stopListenerFunc) {
        stopListenerFunc();
      }
    }
    api.sendMessage(`AI is stopped.`);
  }, 1000);
}

function start() {
  login(loginCred, (err, api) => {
    if (err) {
      console.error("login cred error", err);
      return;
    }

    api.listen((err, event) => {
      try {
        if (err) {
          console.error("listen error:", err);
          start();
          return;
        }
      } catch (err) {
        console.err(err);
      }

      const actions = {
        "/start": startListener,
        "/pause": () => {
          running = false;
          api.sendMessage(`Paused!`, event.threadID);
        },
        "/continue": () => {
          running = true;
          api.sendMessage(`Continuing!`, event.threadID);
        },
        "/stop": stopListenerFunc,
      };

      const action = actions[event.body];
      if (action) {
        action(api, event);
      }
    });
  });
}
start();
module.exports = { stopListener };
