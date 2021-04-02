#!/usr/bin/env node

const Discord = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

var database, collection;
const DATABASE_NAME = process.env.DATABASE_NAME;
const CONNECTION_URL = "localhost:27017";
const prefix = '$';

MongoClient.connect("mongodb://" + CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
    if(error) {
        throw error;
    }
    database = client.db(DATABASE_NAME);
    collection = database.collection("awesome_mod");
    console.log("Connected to `" + DATABASE_NAME + "`!");
});

client.on("guildCreate", async guild => {
  let awesomeModCatID, botLogID, roleReqID;
  collection.insertOne({ guild_id: guild.id }, (error, result) => {
      if(error) {
        console.error;
      }
  });
  // Create "Awesome Mod" category for other channels to reside in
  guild.channels.create('Awesome Mod', {
    type: 'category',
    position: 1,
    // Remove view permissions from "@everyone"
    permissionOverwrites: [{
      id: guild.id,
      deny: ['VIEW_CHANNEL'],
    }]
  })
  .then(channel => {
    // Create "#bot-logs" text channel to track message deletes, edits, and channel creations
    guild.channels.create('bot-logs', {
      type: 'text',
      parent: channel.id,
      // Remove view permissions from "@everyone"
      permissionOverwrites: [{
        id: guild.id,
        deny: ['VIEW_CHANNEL'],
      }]
    }).then(channel => {
      // Add the ID of the "#bot-logs" channel to the database
      collection.updateOne({ guild_id: guild.id }, { $set: { "bot_logs_id": `${channel.id}` }});
    });
    // Create "#role-requests" text channel to have people request roles
    guild.channels.create('role-requests', {
      type: 'text',
      parent: channel.id,
      // Remove view permissions from "@everyone"
      permissionOverwrites: [{
        id: guild.id,
        allow: ['VIEW_CHANNEL'],
      }]
    }).then(channel => {
      // Add the ID of the "#bot-logs" channel to the database
      collection.updateOne({ guild_id: guild.id }, { $set: { "role_requests_id": `${channel.id}` }});
      // Add slowmode
      channel.setRateLimitPerUser(60);
    });

  });
});

client.on("guildDelete", async guild => {
  collection.deleteOne({ "guild_id": `${guild.id}` }, (error, result) => {
      if(error) {
        console.error;
      }
  });
});

client.on("ready", () => {
  console.log("Logged in as " + client.user.tag + "!");
  client.user.setActivity(`for \`${prefix}help\` | Add me to your own server: adat.link/awesomemod`, { type: "WATCHING" });
});

client.on("message", async message => {
  switch (message.content.toLowerCase()) {
    case `${prefix}aboutserver`:
      aboutServer(message);
      break;
    case `${prefix}help`:
      helpMessage(message);
      break;
  }

  if (message.content.toLowerCase().startsWith(`${prefix}bulkdelete`)) {
    bulkDelete(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}rolerequest`)) {
    roleRequest(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}userswithrole`)) {
    usersWithRole(message);
  }
});

async function helpMessage(message) {
  const helpEmbed = new Discord.MessageEmbed()
    .setTitle(`Helping \`${message.author.tag}\``)
    .setURL('https://adat.link/awesomemod')
    .addField(`Creator`, `ADawesomeguy#2235`)
    .addField(`Prefix`, prefix)
    .addField(`Using the bot`, "Once <@780562707254083584> joins the server, it will create a category called `Awesome Mod` and two channels within it. One is for regular members to request roles (called `#role-requests`) and the other is for bot logs (`#bot-logs`). These can be renamed and moved around but should not be deleted. <@780562707254083584> also comes with a ton of handy commands to analyze and manage your server.")
    .addField(`Bulk delete command`, `${prefix}bulkDelete`)
    .addField(`Role request command`, `${prefix}roleRequest [role]`)
    .addField(`View users with role`, `${prefix}usersWithRole [role]`)
    .setThumbnail(client.user.avatarURL())
    .setFooter(`Bot ID: ${client.user.id}`)
    .setColor("00c5ff")
    .setTimestamp();
  message.channel.send(helpEmbed).catch(console.error);
}

async function usersWithRole(message) {
  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }
  const roles = message.guild.roles.cache.filter(role => role.name.toLowerCase().includes(message.content.split(" ")[1]));
  const role = roles.array()[0];
  const roleEmbed = new Discord.MessageEmbed()
    .setTitle(`${role.members.array().length} user(s) with the role \`${role.name}\`:`)
    .setDescription(" • " + roles.array()[0].members.map(m => m.user.tag).join('\n\n • '))
    .setFooter(`Role ID: ${role.id}`)
    .setTimestamp();
  message.channel.send(roleEmbed);
}

async function aboutServer(message) {
  const textChannelCount = message.guild.channels.cache.filter(c => c.type === 'text').size;
  const voiceChannelCount = message.guild.channels.cache.filter(c => c.type === 'voice').size;
  const categoryChannelCount = message.guild.channels.cache.filter(c => c.type === 'category').size;
  const numHumans = message.guild.members.cache.filter(member => !member.user.bot).size;
  const numBots = message.guild.members.cache.filter(member => member.user.bot).size;
  const numRoles = message.guild.roles.cache.size;
  const numOnline = message.guild.members.cache.filter(member => member.user.presence.status === "online" && !member.user.bot).size;
  const numOffline = message.guild.members.cache.filter(member => member.user.presence.status === "offline" && !member.user.bot).size;
  const numAway = message.guild.members.cache.filter(member => member.user.presence.status === "idle" && !member.user.bot).size;
  const numDND = message.guild.members.cache.filter(member => member.user.presence.status === "dnd" && !member.user.bot).size;
  const aboutServerEmbed = new Discord.MessageEmbed()
    .setTitle(`About \`${message.guild.name}\``)
    .addField("Owner", `<@${message.guild.ownerID}>`)
    .addField("Region", message.guild.region)
    .addField("Verification Level", message.guild.verificationLevel)
    .addField("Channels", `Total: ${message.guild.channels.cache.size} ‖ Text: ${textChannelCount} • Voice: ${voiceChannelCount} • Categories: ${categoryChannelCount}`)
    .addField("Members", `Total: ${numHumans + numBots} ‖ Human: ${numHumans} • Bot: ${numBots}`)
    .addField("Roles", numRoles)
    .addField("Created", message.guild.createdAt)
    .addField("User Statuses", `🟦 • ${numOnline} online\n\n🟧 • ${numAway} away\n\n⬛ • ${numOffline} offline\n\n🟥 • ${numDND} DND`)
    .setThumbnail(message.guild.iconURL())
    .setFooter(`Server ID: ${message.guild.id}`)
    .setColor("00c5ff")
    .setTimestamp();
  message.channel.send(aboutServerEmbed).catch(console.error);
}

async function roleRequest(message) {
  const roles = message.guild.roles.cache.filter(role => role.name.toLowerCase().includes(message.content.split(" ")[1]));
  let roleChannel;

  if (!message.content.split(" ")[1]) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (roles.array().length < 1) {
    message.reply("no roles found with that name!");
    return;
  }

  const role = roles.array()[0];

  if (message.member.roles.cache.has(role.id)) {
    message.reply("you already have that role!");
    return;
  }

  collection.findOne({ guild_id: message.guild.id}, (error, result) => {
      if(error) {
        console.error;
      }
      roleChannel = result.role_requests_id;
      if (message.channel.id !== roleChannel) {
        message.reply(`wrong channel! Roles can only be requested in <#${roleChannel}>.`);
        return;
      }

      const verificationMessage = message.channel.send(`<@${message.author.id}> would like the **${role}** role. Are they worthy?`);
      message.react('👍');
      message.react('👎');
      const filter = (reaction, user) => {
        return ['👍', '👎'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
      };
      message.awaitReactions(filter, { max: 1, time: 600000000, errors: ['time'] })
        .then(userReaction => {
          const reaction = userReaction.first();
          if (reaction.emoji.name === '👍') {
            message.reply("wow I guess you ARE worthy! ||mods must be real mistaken||");
            message.member.roles.add(role).catch(() => { message.reply("It seems I don't have permissions to give that role, as it's likely above me :(") });
          } else {
            message.reply("I guess you won't be getting that role!");
          }
        }).catch("Role reaction timeout, I guess the mods don't really care about you and forgot.");
  });
}

async function bulkDelete(message) {
  if (!message.member.hasPermission('ADMINISTRATOR')) {
    message.reply("you do not have high enough permissions!");
    return;
  }
  const amount = parseInt(message.content.substring(12));

  if (!amount) {
    message.reply('please add the number of messages to be deleted!');
    return;
  }

  if (!Number.isInteger(amount)) {
    message.reply('the number is not an integer!');
    return;
  }

  if (amount > 100 || amount < 1) {
    message.reply('the number is invalid! It must be between 1 and 99 inclusive.');
    return;
  }

  await message.channel.messages.fetch( { limit: amount + 1 } ).then(messages => {
    message.channel.bulkDelete(messages).catch(console.error);
  }).catch(console.error);
}

client.on('messageDelete', message => {
  let messageContent = message.content;
  let messageAvatar;
  const messageID = message.id;
  let messageAuthor;
  if (message.author) {
    messageAuthor = message.author.tag;
    messageAvatar = message.author.avatarURL();
  } else {
    messageAuthor = "Someone else deleted this message";
    messageAvatar = "https://www.myhowtoonline.com/wp-content/uploads/2020/10/discord-512x474.png";
  }
  if (!messageContent) {
    messageContent = "[NONE]";
  }
  const deleteEmbed = new Discord.MessageEmbed()
    .setTitle('Message Deleted')
    .addField('Author', messageAuthor)
    .addField('Message', messageContent)
    .setThumbnail(messageAvatar)
    .setFooter("ID: " + messageID)
    .setTimestamp()
    .setColor('e7778b');

  collection.findOne({ guild_id: message.guild.id}, (error, result) => {
    if(error) {
      console.error;
    }
    botLogsChannel = result.bot_logs_id;
    if (message.guild.channels.cache.get(botLogsChannel)) {
      message.guild.channels.cache.get(botLogsChannel).send(deleteEmbed).catch(console.error);
    }
  });
});

client.on('messageDeleteBulk', messages => {
  const numMessages = messages.array().length;
  const messagesChannel = messages.array()[0].channel;
  const bulkDeleteEmbed = new Discord.MessageEmbed()
    .setTitle(`${numMessages} Messages Bulk Deleted`)
    .addField(`Channel`, messagesChannel.name)
    .setFooter("Channel ID: " + messagesChannel.id)
    .setTimestamp()
    .setColor('e7778b');

  collection.findOne({ guild_id: messagesChannel.guild.id}, (error, result) => {
    if(error) {
      console.error;
    }
    botLogsChannel = result.bot_logs_id;
    if (messagesChannel.guild.channels.cache.get(botLogsChannel)) {
      messagesChannel.guild.channels.cache.get(botLogsChannel).send(bulkDeleteEmbed).catch(console.error);
    }
  });
});

client.on('messageUpdate', (originalMessage, editedMessage) => {
  if (editedMessage.author) {
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
      .setColor('c9ff00');
    collection.findOne({ guild_id: message.guild.id}, (error, result) => {
      if(error) {
        console.error;
      }
      botLogsChannel = result.bot_logs_id;
      if (editedMessage.guild.channels.cache.get(botLogsChannel)) {
        editedMessage.guild.channels.cache.get(botLogsChannel).send(editEmbed).catch(console.error);
      }
    });
  }
});

client.on('channelCreate', channel => {
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
    collection.findOne({ guild_id: channel.guild.id}, (error, result) => {
      if(error) {
        console.error;
      }
      botLogsChannel = result.bot_logs_id;
      if (channel.guild.channels.cache.get(botLogsChannel)) {
        channel.guild.channels.cache.get(botLogsChannel).send(channelCreateEmbed).catch(console.error);
      }
    });
});

client.on('messageReactionAdd', (messageReaction, user) => {
    const userTag = user.tag;
    const emoji = messageReaction.emoji.name;
    const numEmoji = messageReaction.count;
    const messageContent = messageReaction.message.content;
    let channelCategory;
    const channelCreateEmbed = new Discord.MessageEmbed()
      .setTitle("Reaction Added")
      .addField("Message", messageContent)
      .addField("Reactions", `${userTag} reacted with ${emoji}, along with ${numEmoji - 1} other people in #${messageReaction.message.channel.name}.`)
      .setFooter("Emoji ID: " + messageReaction.emoji.id)
      .setTimestamp()
      .setColor('00aaff');
    collection.findOne({ guild_id: messageReaction.message.guild.id}, (error, result) => {
      if(error) {
        console.error;
      }
      botLogsChannel = result.bot_logs_id;
      if (messageReaction.message.guild.channels.cache.get(botLogsChannel)) {
        messageReaction.message.guild.channels.cache.get(botLogsChannel).send(channelCreateEmbed).catch(console.error);
      }
    });
});

/*client.on('userUpdate', (oldUser, newUser) => {
  if (oldUser.bot) {
    return;
  }
    const oldUserTag = oldUser.tag;
    const newUserTag = newUser.tag;
    const oldUserStatus = oldUser.presence.status;
    const newUserStatus = newUser.presence.status;
    const oldAvatarURL = oldUser.avatarURL();
    const newAvatarURL = newUser.avatarURL();

    const userUpdateEmbed = new Discord.MessageEmbed()
      .setTitle("Channel Created")
      .addField("Tag", `${oldUserTag} >> ${newUserTag}`)
      .addField("Status", `${oldUserStatus} >> ${newUserStatus}`)
      .setThumbnail(oldAvatarURL)
      .setImage(newAvatarURL)
      .setTimestamp()
      .setColor('00aaff');
    collection.findOne({ guild_id: channel.guild.id}, (error, result) => {
      if(error) {
        console.error;
      }
      botLogsChannel = result.bot_logs_id;
      if (client.channels.cache.get(botLogsChannel)) {
        client.channels.cache.get(botLogsChannel).send(userUpdateEmbed).catch(console.error);
      }
    });
});*/

client.login(process.env.BOT_TOKEN);
