const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const loadApiKey = async () => {
  const filepath = path.join(__dirname, "..", "api_key.json");
  const apikey = await fs.readFile(filepath, "utf8");
  return JSON.parse(apikey);
};

const configuration = async () => {
  const apikey = await loadApiKey();
  return new Configuration({
    apiKey: apikey.openai,
    username: apikey.username,
  });
};

const openai = async () => {
  const config = await configuration();
  return new OpenAIApi(config);
};

const createImage = async (event) => {
  const ai = await openai();
  return ai.createImage({
    prompt: event.body,
    n: 1,
    size: "1024x1024",
  });
};

const downloadImage = async (url) => {
  const { data } = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(data, "binary");
};
module.exports = async (api, event) => {
  try {
    const response = await createImage(event);
    const imageDataUrl = response.data.data[0].url;
    const imageData = await downloadImage(imageDataUrl);
    const uuid = uuidv4();
    const filePath = `/home/xkado/Downloads/Messenger/image/${uuid}.png`;

    await fs.writeFile(filePath, imageData);

    console.log("Image saved successfully!");
    api.getThreadInfo(event.threadID, (err, info) => {
      if (err) {
        console.error(err);
        return;
      }
      const fsSend = require("fs");
      const sender = info.userInfo.find((p) => p.id === event.senderID);
      const senderName = sender.firstName;
      const img = {
        body: `Here's the image @${senderName}`,
        attachment: fsSend.createReadStream(filePath),
        mentions: [{ tag: `@${senderName}`, id: event.senderID }],
      };
      try {
        api.sendMessage(img, event.threadID, (err) => {
          if (err) {
            console.error(err);
            api.sendMessage("Error Processing Image.", event.threadID);
          } else {
            console.log("Image sent successfully!");
          }
        });
      } catch (err) {
        console.error(err);
        api.sendMessage("Error Processing Image.", event.threadID);
      } finally {
        if (fsSend.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(err);
            }
          });
        }
      }
    });
  } catch (error) {
    console.error(error);

    if (error.message === "Request failed with status code 400") {
      api.sendMessage(
        "Please send an appropriate request of an image you want to generate...",
        event.threadID
      );
    }
  }
};
