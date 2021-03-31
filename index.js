#!/usr/bin/env node

const Discord = require('discord.js');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

client.on("ready", () => {
  console.log("Logged in as " + client.user.tag + "!");
});

client.on("guildMemberAdd", member => {
  const compRole = member.guild.roles.cache.get("826846965114339419");
  const botRole = member.guild.roles.cache.get("826871012724441158");
  if (member.bot) {
    member.roles.add(botRole).catch(console.error);
  } else {
    member.roles.add(compRole).catch(console.error);
  }
});

client.on('messageDelete', message => {
  const messageContent;
  const messageAvatar;
  const messageID;
  let messageAuthor;
  if (message) {
    messageAuthor = message.author.tag;
    messageContent = message.content;
    messageAvatar = message.avatarURL();
    messageID = message.id;
  } else {
    messageAuthor = "Someone else deleted this message";
    messageAvatar = "https://64.media.tumblr.com/db1db81cadcf6211524ce9ef1b89bae7/tumblr_inline_olcfuexwZy1se2zq9_500.png";
    messageContent = "Unknown";
    messageID = "Unknown";
  }
  const deleteEmbed = new Discord.MessageEmbed()
    .setTitle('Message Deleted')
    .addField('Author', messageAuthor)
    .addField('Message', messageContent)
    .setThumbnail(messageAvatar)
    .setFooter("ID: " + messageID)
    .setTimestamp()
    .setColor('ff0000');
  client.guilds.cache.get("826506878976000030").channels.cache.get("826876551756513314").send(deleteEmbed).catch(console.error);
});

client.on('messageUpdate', (originalMessage, editedMessage) => {
  if (editedMessage.author.bot) {
    return;
  }
  const editEmbed = new Discord.MessageEmbed()
    .setTitle("Message Edited")
    .addField("Author", editedMessage.author.tag)
    .addField("Message", `<< ${originalMessage}\n>> ${editedMessage}`)
    .setThumbnail(editedMessage.author.avatarURL())
    .setFooter("ID: " + editedMessage.id)
    .setTimestamp()
    .setColor('006699');
  client.guilds.cache.get("826506878976000030").channels.cache.get("826876551756513314").send(editEmbed).catch(console.error);
});

client.on('channelCreate', channel => {
  if (channel.guild.id = "826506878976000030") {
    const channelName = channel.name;
    const channelID = channel.id;
    const channelType = channel.type;
    let channelCategory;
    if (channel.parent) {
      channelCategory = channel.parent.name;
    } else {
      channelCategory = "None";
    }
    const channelCreateEmbed = new Discord.MessageEmbed()
      .setTitle("Channel Created")
      .addField("Name", channelName)
      .addField("Type", channelType)
      .addField("Category", channelCategory)
      .setFooter("ID: " + channelID)
      .setTimestamp()
      .setColor('00aaff');
    client.guilds.cache.get("826506878976000030").channels.cache.get("826876551756513314").send(channelCreateEmbed).catch(console.error);
  }
});

client.login(process.env.BOT_TOKEN);