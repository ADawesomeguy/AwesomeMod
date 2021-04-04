#!/usr/bin/env node

const Discord = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const fetch = require(`node-fetch`);

var database, collection;
const DATABASE_NAME = process.env.DATABASE_NAME;
const CONNECTION_URL = "localhost:27017";
const prefix = '$';

MongoClient.connect("mongodb://" + CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
  if (error) {
    throw error;
  }
  database = client.db(DATABASE_NAME);
  collection = database.collection("awesome_mod");
  console.log("Connected to `" + DATABASE_NAME + "`!");
});

client.on("guildCreate", async guild => {
  let awesomeModCatID, botLogID, roleReqID;
  collection.insertOne({ guild_id: guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
  });
});

client.on("guildDelete", async guild => {
  // If the bot is removed from a guild or the guild is deleted, the bot deletes the old data
  collection.deleteOne({ "guild_id": `${guild.id}` }, (error, result) => {
    if (error) {
      console.error;
    }
  });
});

client.on("ready", () => {
  console.log("Logged in as " + client.user.tag + "!");
  client.user.setActivity(`for \`${prefix}help\` | Add me to your own server: adat.link/awesomemod`, { type: "WATCHING" });
});

client.on("message", async message => {
  if (message.author.bot) {
    return;
  }

  switch (message.content.toLowerCase()) {
    case `${prefix}aboutserver`:
      aboutServer(message);
      break;
    case `${prefix}help`:
      helpMessage(message);
      break;
    case `${prefix}startlogs`:
      startLogs(message);
      break;
    case `${prefix}kulboard`:
      kulboardCreate(message)
      break;
    case `${prefix}ping`:
      ping(message);
      break;
    case `${prefix}iss`:
      locateISS(message);
      break;
    case `${prefix}membercountchannel`:
      memberCountChannelCreate(message);
      break;
  }

  if (message.content.toLowerCase().startsWith(`${prefix}bulkdelete`)) {
    bulkDelete(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}rolerequest`)) {
    roleRequest(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}userswith`)) {
    usersWith(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}ban`)) {
    ban(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}kick`)) {
    kick(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}addrole`)) {
    addRole(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}userinfo`)) {
    userInfo(message);
  } else if (message.content.toLowerCase().startsWith(`${prefix}aboutbot`)) {
    aboutBot(message);
  }
});

async function aboutBot(message) {
  const uptimeDays = client.uptime / 86400000;
  const aboutBotEmbed = new Discord.MessageEmbed()
    .setTitle("About me!")
    .setURL(`https://adat.link/awesomemod`)
    .setAuthor(client.user.tag, client.user.avatarURL())
    .addField(`Servers`, client.guilds.cache.size, true)
    .addField(`Uptime`, `${uptimeDays.toFixed(1)} days`, true)
    .addField(`Invite Link`, `Click the title to add this bot to your server!`)
    .setFooter(`Client ID: ${client.user.id}`)
    .setTimestamp()
    .setColor('00c5ff');
  message.channel.send(aboutBotEmbed);
}

async function memberCountChannelUpdate(member) {
  collection.findOne({ guild_id: member.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.member_count_channel_id) {
      memberCountChannel = result.member_count_channel_id;
      if (member.guild.channels.cache.get(memberCountChannel)) {
        member.guild.channels.cache.get(memberCountChannel).edit({ name: `Members: ${member.guild.memberCount}` }).catch(console.error);
      }
    }
  });
}

async function locateISS(message) {
  await fetch("http://api.open-notify.org/iss-now.json")
    .then(request => request.json())
    .then(data => {
      const issEmbed = new Discord.MessageEmbed()
        .setTitle("The current location of the ISS!")
        .setURL('https://spotthestation.nasa.gov/tracking_map.cfm')
        .setImage(`https://api.mapbox.com/styles/v1/mapbox/light-v10/static/pin-s+000(${data.iss_position.longitude},${data.iss_position.latitude})/-87.0186,20,1/1000x1000?access_token=pk.eyJ1IjoiYWRhd2Vzb21lZ3V5IiwiYSI6ImNrbGpuaWdrYzJ0bGYydXBja2xsNmd2YTcifQ.Ude0UFOf9lFcQ-3BANWY5A`)
        .setColor("00c5ff")
        .setFooter(`Client ID: ${client.user.id}`)
        .setTimestamp();
      message.channel.send(issEmbed);
    });
}

async function ping(message) {
  const pingEmbed = new Discord.MessageEmbed()
    .setAuthor(message.author.tag, message.author.avatarURL())
    .setTitle("Pong!")
    .addField(`🏓`, `${Date.now() - message.createdTimestamp}ms`)
    .addField(`API`, `${Math.round(client.ws.ping)}ms`)
    .setColor("00c5ff")
    .setFooter(`Client ID: ${client.user.id}`)
    .setTimestamp();
  message.channel.send(pingEmbed).catch(console.error);
}

async function startLogs(message) {
  if (!message.member.hasPermission("ADMINISTRATOR")) {
    message.reply("you do not have admin permissions!");
    return;
  }
  collection.findOne({ guild_id: message.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (message.guild.channels.cache.get(botLogsChannel)) {
        message.reply('bot logs channel already exists!');
      } else {
        // Create "#bot-logs" text channel to track message deletes, edits, and channel creations
        message.guild.channels.create('bot-logs', {
          type: 'text',
          // Remove view permissions from "@everyone"
          permissionOverwrites: [{
            id: message.guild.id,
            deny: ['VIEW_CHANNEL'],
          }]
        }).then(channel => {
          // Add the ID of the "#bot-logs" channel to the database
          message.reply(`channel ${channel} created!`)
          collection.updateOne({ guild_id: message.guild.id }, { $set: { "bot_logs_id": `${channel.id}` } });
        }).catch(console.error);
      }
    } else {
      // Create "#bot-logs" text channel to track message deletes, edits, and channel creations
      message.guild.channels.create('bot-logs', {
        type: 'text',
        // Remove view permissions from "@everyone"
        permissionOverwrites: [{
          id: message.guild.id,
          deny: ['VIEW_CHANNEL'],
        }]
      }).then(channel => {
        // Add the ID of the "#bot-logs" channel to the database
        message.reply(`channel ${channel} created!`)
        collection.updateOne({ guild_id: message.guild.id }, { $set: { "bot_logs_id": `${channel.id}` } });
      }).catch(console.error);
    }
  });
}

async function kulboardCreate(message) {
  if (!message.member.hasPermission("ADMINISTRATOR")) {
    message.reply("you do not have admin permissions!");
    return;
  }
  collection.findOne({ guild_id: message.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.kulboard_id) {
      kulboardChannel = result.kulboard_id;
      if (message.guild.channels.cache.get(kulboardChannel)) {
        message.reply('külboard channel already exists!');
      } else {
        // Create "#bot-logs" text channel to track message deletes, edits, and channel creations
        message.guild.channels.create('külboard', {
          type: 'text',
          // Remove view permissions from "@everyone"
          permissionOverwrites: [{
            id: message.guild.id,
            allow: ['VIEW_CHANNEL'],
            deny: ['SEND_MESSAGES'],
          }]
        }).then(channel => {
          // Add the ID of the "#bot-logs" channel to the database
          message.reply(`channel ${channel} created!`)
          collection.updateOne({ guild_id: message.guild.id }, { $set: { "kulboard_id": `${channel.id}` } });
        }).catch(console.error);
      }
    } else {
      // Create "#bot-logs" text channel to track message deletes, edits, and channel creations
      message.guild.channels.create('külboard', {
        type: 'text',
        // Remove view permissions from "@everyone"
        permissionOverwrites: [{
          id: message.guild.id,
          allow: ['VIEW_CHANNEL'],
          deny: ['SEND_MESSAGES'],
        }]
      }).then(channel => {
        // Add the ID of the "#bot-logs" channel to the database
        message.reply(`channel ${channel} created!`)
        collection.updateOne({ guild_id: message.guild.id }, { $set: { "kulboard_id": `${channel.id}` } });
      }).catch(console.error);
    }
  });
}

async function memberCountChannelCreate(message) {
  if (!message.member.hasPermission("ADMINISTRATOR")) {
    message.reply("you do not have admin permissions!");
    return;
  }
  collection.findOne({ guild_id: message.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.member_count_channel_id) {
      memberCountChannel = result.member_count_channel_id;
      if (message.guild.channels.cache.get(memberCountChannel)) {
        message.reply('member count channel already exists!');
      } else {
        // Create "#bot-logs" text channel to track message deletes, edits, and channel creations
        message.guild.channels.create(`Members: ${message.guild.memberCount}`, {
          type: 'voice',
          // Remove view permissions from "@everyone"
          permissionOverwrites: [{
            id: message.guild.id,
            allow: ['VIEW_CHANNEL'],
            deny: ['CONNECT'],
          }]
        }).then(channel => {
          // Add the ID of the "#bot-logs" channel to the database
          message.reply(`channel ${channel} created!`)
          collection.updateOne({ guild_id: message.guild.id }, { $set: { "member_count_channel_id": `${channel.id}` } });
        }).catch(console.error);
      }
    } else {
      // Create "#bot-logs" text channel to track message deletes, edits, and channel creations
      message.guild.channels.create(`Members: ${message.guild.memberCount}`, {
        type: 'voice',
        // Remove view permissions from "@everyone"
        permissionOverwrites: [{
          id: message.guild.id,
          allow: ['VIEW_CHANNEL'],
          deny: ['CONNECT'],
        }]
      }).then(channel => {
        // Add the ID of the "#bot-logs" channel to the database
        message.reply(`channel ${channel} created!`)
        collection.updateOne({ guild_id: message.guild.id }, { $set: { "member_count_channel_id": `${channel.id}` } });
      }).catch(console.error);
    }
  });
}

async function userInfo(message) {
  if (!message.content.split(" ")[1]) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  const members = message.guild.members.cache.filter(member => {
    if (member.nickname) {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase()) || member.nickname.toLowerCase().includes(message.content.split(" ")[1].toLowerCase());
    } else {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase())
    }
  });

  if (members.array().length < 1) {
    message.reply("no members found with that name!");
    return;
  }

  const member = members.array()[0];

  const userInfoEmbed = new Discord.MessageEmbed()
    .setAuthor(member.user.tag, member.user.avatarURL())
    .addField("Roles", member.roles.cache.map(r => `${r}`).join(' • '))
    .addField("Permissions", member.permissions.toArray().map(p => `\`${p}\``.toLowerCase()).join(' • '))
    .addField("Joined at", `${new Date(member.joinedTimestamp).toLocaleString("en-US", {timeZoneName: "short"})}`, true)
    .addField("Account created", `${new Date(member.user.createdTimestamp).toLocaleString("en-US", {timeZoneName: "short"})}`, true)
    .setColor("00c5ff")
    .setFooter(`User ID: ${member.user.id}`)
    .setTimestamp();
  message.channel.send(userInfoEmbed).catch(console.error);
}

async function addRole(message) {
  if (!message.member.hasPermission('ADMINISTRATOR')) {
    message.reply("you do not have adequate permissions!")
  }

  if (!message.content.split(" ")[1]) {
    message.reply("role query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("role query must contain at least 3 characters!")
    return;
  }

  const roles = message.guild.roles.cache.filter(role => role.name.toLowerCase().includes(message.content.split(" ")[1]));
  let roleChannel;

  if (!message.content.split(" ")[2]) {
    message.reply("user query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[2].length < 3) {
    message.reply("user query must contain at least 3 characters!")
    return;
  }

  if (roles.array().length < 1) {
    message.reply("no roles found with that name!");
    return;
  }

  const role = roles.array()[0];

  const members = message.guild.members.cache.filter(member => {
    if (member.nickname) {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[2].toLowerCase()) || member.nickname.toLowerCase().includes(message.content.split(" ")[2].toLowerCase());
    } else {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[2].toLowerCase())
    }
  });

  if (members.array().length < 1) {
    message.reply("no members found with that name!");
    return;
  }

  const member = members.array()[0];

  if (member.roles.cache.has(role.id)) {
    message.reply(`${member.user} already has that role!`);
    return;
  }

  const verificationEmbed = new Discord.MessageEmbed()
    .setTitle(`Are you sure you want to give \`${member.user.tag}\` the **${role.name}** role?`)
    .setDescription("React to this message to verify")
    .setThumbnail(member.user.avatarURL())
    .setColor("fda172")
    .setTimestamp();
  message.channel.send(verificationEmbed)
  .then(verificationEmbed => {
    verificationEmbed.react('<a:anim_check:827985495295655988>');
    verificationEmbed.react('<a:anim_cross:827990162113560576>');
    const filter = (reaction, user) => {
      return ['anim_check', 'anim_cross'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
    };
    verificationEmbed.awaitReactions(filter, { max: 1, time: 600000000, errors: ['time'] })
      .then(userReaction => {
        const reaction = userReaction.first();
        if (reaction.emoji.name === 'anim_check') {
          member.roles.add(role).then(message.reply(`${member.user} has been given the **${role}** role!`)).catch(() => { message.reply("It seems I don't have permissions to give that role, as it's likely above me :(") });
        } else {
          message.reply("I guess you won't be getting that role!");
        }
      }).catch(verificationEmbed => { verificationEmbed.edit("TIMEOUT") });
  }).catch(console.error);
}

async function ban(message) {

  if (!message.content.split(" ")[1]) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  const members = message.guild.members.cache.filter(member => {
    if (member.nickname) {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase()) || member.nickname.toLowerCase().includes(message.content.split(" ")[1].toLowerCase());
    } else {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase())
    }
  });

  if (members.array().length < 1) {
    message.reply("no members found with that name!");
    return;
  }

  const member = members.array()[0];

    let verificationEmbed = new Discord.MessageEmbed()
      .setTitle(`Are you sure you would like to ban \`${member.user.tag}\`?`)
      .setAuthor(member.user.tag, member.user.avatarURL())
      .setDescription("React to this message to verify")
      .setThumbnail("https://emoji.gg/assets/emoji/9156_BanThonking.png")
      .setColor("fda172")
      .setTimestamp();
    message.channel.send(verificationEmbed)
    .then(verificationEmbed => {
      verificationEmbed.react('<a:anim_check:827985495295655988>');
      verificationEmbed.react('<a:anim_cross:827990162113560576>');
      const filter = (reaction, user) => {
        return ['anim_check', 'anim_cross'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
      };
      verificationEmbed.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(userReaction => {
          const reaction = userReaction.first();
          if (reaction.emoji.name === 'anim_check') {
            message.guild.members.ban(member.user).then(user => message.reply(`<@${user.id}> has been banned!`)).catch(() => message.channel.send(`Unfortunately, I don't have the ability to ban ${member.user.username}, likely because their role is higher than mine.`));
          } else {
            message.reply(`phew! ${member}'s safe!`);
          }
        }).catch(verificationEmbed => { verificationEmbed.edit("TIMEOUT") });
      }).catch(console.error);
}

async function kick(message) {

  if (!message.content.split(" ")[1]) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  const members = message.guild.members.cache.filter(member => {
    if (member.nickname) {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase()) || member.nickname.toLowerCase().includes(message.content.split(" ")[1].toLowerCase());
    } else {
      return member.user.username.toLowerCase().includes(message.content.split(" ")[1].toLowerCase())
    }
  });

  if (members.array().length < 1) {
    message.reply("no members found with that name!");
    return;
  }

  const member = members.array()[0];

    const verificationEmbed = new Discord.MessageEmbed()
      .setTitle(`Are you sure you would like to kick \`${member.user.tag}\`?`)
      .setDescription("React to this message to verify")
      .setThumbnail(member.user.avatarURL())
      .setColor("fda172")
      .setTimestamp();
    message.channel.send(verificationEmbed)
    .then( verificationEmbed => {
      verificationEmbed.react('<a:anim_check:827985495295655988>');
      verificationEmbed.react('<a:anim_cross:827990162113560576>');
      const filter = (reaction, user) => {
        return ['anim_check', 'anim_cross'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
      };
      verificationEmbed.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(userReaction => {
          const reaction = userReaction.first();
          if (reaction.emoji.name === 'anim_check') {
            member.kick().then(user => message.reply(`<@${user.id}> has been kicked!`)).catch(() => message.channel.send(`Unfortunately, I don't have the ability to kick ${member.user.username}, likely because their role is higher than mine.`));
          } else {
            message.reply(`phew! ${member}'s safe!`);
          }
        }).catch(verificationEmbed => { verificationEmbed.edit("TIMEOUT") });
      }).catch(console.error);
}

async function helpMessage(message) {
  const helpEmbed = new Discord.MessageEmbed()
    .setTitle(`Helping \`${message.author.tag}\``)
    .setURL('https://adat.link/awesomemod')
    .addField(`Creator`, `ADawesomeguy#2235`, true)
    .addField(`Prefix`, `\`${prefix}\``, true)
    .addField(`Using the bot`, `To use this bot, first make sure it has admin permissions. If it doesn't, you will 😢. To run a command, prefix it with \`${prefix}\`. One of the most useful things this bot brings to the table is the logging. To enable logging, you can run the command \`${prefix}startLogs\`. Another useful feature is the role request feature. Anyone can simply run the command \`${prefix}roleRequest [role]\`, and an admin can approve it or decline it. Additionally, there's now also a külboard, which will allow messages with a sufficient amount of 😎 reactions to be posted in a special read-only channel`)
    .addField(`Meta commands:`, `Help command: \`${prefix}help\`\nAbout your server: \`${prefix}aboutServer\`\nAbout this bot: \`${prefix}aboutBot\``)
    .addField(`Admin commands:`, `Add logs channel: \`${prefix}startLogs\`\nAdd külboard channel: \`${prefix}kulboard\`\nAdd member count channel: \`${prefix}memberCountChannel\`\nBulk delete: \`${prefix}bulkDelete\`\nBan: \`${prefix}ban [user]\`\nKick: \`${prefix}kick [user]\`\nGive user role: \`${prefix}addRole [role]\``)
    .addField(`User commands:`, `Role request: \`${prefix}roleRequest [role]\`\nView users with role: \`${prefix}usersWith [role]\`\nUser info: \`${prefix}userInfo [user]\``)
    .addField(`Fun commands:`, `Show ISS location: \`${prefix}iss\`\nMeasure latency: \`${prefix}ping\``)
    .setThumbnail(client.user.avatarURL())
    .setFooter(`Bot ID: ${client.user.id}`)
    .setColor("00c5ff")
    .setTimestamp();
  message.channel.send(helpEmbed).catch(console.error);
}

async function usersWith(message) {
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
    .addField("Created", `${new Date(message.guild.createdTimestamp).toLocaleString("en-US", {timeZoneName: "short"})}`)
    .addField("User Statuses", `🟦 • ${numOnline} online\n\n🟧 • ${numAway} away\n\n⬛ • ${numOffline} offline\n\n🟥 • ${numDND} DND`)
    .setThumbnail(message.guild.iconURL())
    .setFooter(`Server ID: ${message.guild.id}`)
    .setColor("00c5ff")
    .setTimestamp();
  message.channel.send(aboutServerEmbed).catch(console.error);
}

async function roleRequest(message) {

  if (!message.content.split(" ")[1]) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  if (message.content.split(" ")[1].length < 3) {
    message.reply("query must contain at least 3 characters!")
    return;
  }

  const roles = message.guild.roles.cache.filter(role => role.name.toLowerCase().includes(message.content.split(" ")[1].toLowerCase()));
  let roleChannel;

  if (roles.array().length < 1) {
    message.reply("no roles found with that name!");
    return;
  }

  const role = roles.array()[0];

  if (message.member.roles.cache.has(role.id)) {
    message.reply("you already have that role!");
    return;
  }

  const verificationEmbed = new Discord.MessageEmbed()
    .setTitle(`\`${message.author.tag}\` would like the **${role.name}** role. Are they worthy?`)
    .setDescription("React to this message to verify")
    .setThumbnail(message.author.avatarURL())
    .setColor("fda172")
    .setTimestamp();
  message.channel.send(verificationEmbed)
  .then(verificationEmbed => {
    verificationEmbed.react('<a:anim_check:827985495295655988>');
    verificationEmbed.react('<a:anim_cross:827990162113560576>');
    const filter = (reaction, user) => {
      return ['anim_check', 'anim_cross'].includes(reaction.emoji.name) && message.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') && !user.bot;
    };
    verificationEmbed.awaitReactions(filter, { max: 1, time: 600000000, errors: ['time'] })
      .then(userReaction => {
        const reaction = userReaction.first();
        if (reaction.emoji.name === 'anim_check') {
          message.member.roles.add(role).then(message.reply("wow I guess you ARE worthy! ||mods must be real mistaken||")).catch(() => { message.reply("It seems I don't have permissions to give that role, as it's likely above me :(") });
        } else {
          message.reply("I guess you won't be getting that role!");
        }
      }).catch(verificationEmbed => { verificationEmbed.edit("TIMEOUT") });
  }).catch(console.error);
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

  await message.channel.messages.fetch({ limit: amount + 1 }).then(messages => {
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
    messageAuthor = "Message was not cached";
    messageAvatar = client.user.defaultAvatarURL;
  }
  if (!messageContent) {
    messageContent = "[NONE]";
  }
  const deleteEmbed = new Discord.MessageEmbed()
    .setTitle('Message Deleted')
    .setURL(message.url)
    .addField('Author', messageAuthor)
    .addField('Message', messageContent)
    .setThumbnail(messageAvatar)
    .setFooter("ID: " + messageID)
    .setTimestamp()
    .setColor('e7778b');

  collection.findOne({ guild_id: message.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (message.guild.channels.cache.get(botLogsChannel)) {
        message.guild.channels.cache.get(botLogsChannel).send(deleteEmbed).catch(console.error);
      }
    }
  });
});

client.on('message', message => {
  const filter = reaction => {
  	return reaction.emoji.name === '😎';
  };

  const collector = message.createReactionCollector(filter);

  collector.on('collect', (reaction, user) => {
    if (reaction.count === 1) {
      const kulboardEmbed = new Discord.MessageEmbed()
        .setTitle("Very kül message")
        .setURL(message.url)
        .setAuthor(message.author ? message.author.tag : "Unknown: click on the link to find out", message.author ? message.author.avatarURL() : client.user.defaultAvatarURL)
        .addField("Message", message.content)
        .addField("Channel", message.channel)
        .setFooter("Message ID: " + message.id)
        .setColor("00c5ff")
        .setTimestamp();
      collection.findOne({ guild_id: message.guild.id }, (error, result) => {
        if (error) {
          console.error;
        }
        if (result.kulboard_id) {
          kulboardChannel = result.kulboard_id;
          if (message.guild.channels.cache.get(kulboardChannel)) {
            message.guild.channels.cache.get(kulboardChannel).send(kulboardEmbed).catch(console.error);
          }
        }
      });
    }
  });
});

client.on('messageDeleteBulk', messages => {
  const numMessages = messages.array().length;
  const messagesChannel = messages.array()[0].channel;
  const bulkDeleteEmbed = new Discord.MessageEmbed()
    .setTitle(`${numMessages} Messages Bulk Deleted`)
    .addField(`Channel`, messagesChannel)
    .setFooter("Channel ID: " + messagesChannel.id)
    .setTimestamp()
    .setColor('e7778b');

  collection.findOne({ guild_id: messagesChannel.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (messagesChannel.guild.channels.cache.get(botLogsChannel)) {
        messagesChannel.guild.channels.cache.get(botLogsChannel).send(bulkDeleteEmbed).catch(console.error);
      }
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
      .setURL(editedMessage.url)
      .addField("Author", editedMessage.author.tag)
      .addField("Message", `<< ${originalMessage}\n>> ${editedMessage}`)
      .setThumbnail(editedMessage.author.avatarURL())
      .setFooter("ID: " + editedMessage.id)
      .setTimestamp()
      .setColor('c9ff00');
    collection.findOne({ guild_id: editedMessage.guild.id }, (error, result) => {
      if (error) {
        console.error;
      }
      if (result.bot_logs_id) {
        botLogsChannel = result.bot_logs_id;
        if (editedMessage.guild.channels.cache.get(botLogsChannel)) {
          editedMessage.guild.channels.cache.get(botLogsChannel).send(editEmbed).catch(console.error);
        }
      }
    });
  }
});

client.on('channelCreate', channel => {
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
    .addField("Name", channel)
    .addField("Type", channelType)
    .addField("Category", channelCategory)
    .setFooter("ID: " + channelID)
    .setTimestamp()
    .setColor('00aaff');
  collection.findOne({ guild_id: channel.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (channel.guild.channels.cache.get(botLogsChannel)) {
        channel.guild.channels.cache.get(botLogsChannel).send(channelCreateEmbed).catch(console.error);
      }
    }
  });
});

client.on('messageReactionAdd', (messageReaction, user) => {
  const userTag = user.tag;
  const emoji = messageReaction.emoji.name;
  const numEmoji = messageReaction.count;
  let messageContent = messageReaction.message.content;
  if (!messageContent) {
    messageContent = "[NONE]";
  }
  let channelCategory;
  const messageReactionAddEmbed = new Discord.MessageEmbed()
    .setTitle("Reaction Added")
    .setURL(messageReaction.message.url)
    .addField("Message", messageContent)
    .addField("Reactions", `${userTag} reacted with ${emoji}, along with ${numEmoji - 1} other people in ${messageReaction.message.channel}.`)
    .setFooter("Message ID: " + messageReaction.message.id)
    .setTimestamp()
    .setColor('00aaff');
    collection.findOne({ guild_id: messageReaction.message.guild.id }, (error, result) => {
      if (error) {
        console.error;
      }
      if (result.bot_logs_id) {
        botLogsChannel = result.bot_logs_id;
        if (messageReaction.message.guild.channels.cache.get(botLogsChannel)) {
          messageReaction.message.guild.channels.cache.get(botLogsChannel).send(messageReactionAddEmbed).catch(console.error);
        }
      }
    });
});

client.on('messageReactionRemove', (messageReaction, user) => {
  const userTag = user.tag;
  const emoji = messageReaction.emoji.name;
  let messageContent = messageReaction.message.content;
  if (!messageContent) {
    messageContent = "[NONE]";
  }
  let channelCategory;
  const messageReactionRemoveEmbed = new Discord.MessageEmbed()
    .setTitle("Reaction Removed")
    .setURL(messageReaction.message.url)
    .addField("Message", messageContent)
    .addField("Reactions", `${userTag} removed their reaction ${emoji} in ${messageReaction.message.channel}.`)
    .setFooter("Message ID: " + messageReaction.message.id)
    .setTimestamp()
    .setColor('e7778b');
  collection.findOne({ guild_id: messageReaction.message.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (messageReaction.message.guild.channels.cache.get(botLogsChannel)) {
        messageReaction.message.guild.channels.cache.get(botLogsChannel).send(messageReactionRemoveEmbed).catch(console.error);
      }
    }
  });
});

client.on('roleCreate', role => {
  const roleCreateEmbed = new Discord.MessageEmbed()
    .setTitle("Role Added")
    .addField("Name", role.name)
    .addField("Permissions", role.permissions.toArray().map(p => `\`${p}\``.toLowerCase()).join(' • '))
    .addField("Mentionable", role.mentionable)
    .setFooter("Role ID: " + role.id)
    .setTimestamp()
    .setColor('00aaff');
  collection.findOne({ guild_id: role.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (role.guild.channels.cache.get(botLogsChannel)) {
        role.guild.channels.cache.get(botLogsChannel).send(roleCreateEmbed).catch(console.error);
      }
    }
  });
});

client.on('roleDelete', role => {
  const roleDeleteEmbed = new Discord.MessageEmbed()
    .setTitle("Role Removed")
    .addField("Name", role.name)
    .addField("Permissions", role.permissions.toArray().map(p => `\`${p}\``.toLowerCase()).join(' • '))
    .addField("Mentionable", role.mentionable)
    .setFooter("Role ID: " + role.id)
    .setTimestamp()
    .setColor('e7778b');
  collection.findOne({ guild_id: role.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.botLogsChannel) {
      botLogsChannel = result.bot_logs_id;
      if (role.guild.channels.cache.get(botLogsChannel)) {
        role.guild.channels.cache.get(botLogsChannel).send(roleDeleteEmbed).catch(console.error);
      }
    }
  });
});

client.on('roleUpdate', (oldRole, newRole) => {
  /*const removedPerms = oldRole.permissions.filter(perm => !newRole.hasPermission(perm));
  const addedPerms = newRole.permissions.filter(perm => !oldRole.hasPermission(perm));*/
  const roleUpdateEmbed = new Discord.MessageEmbed()
    .setTitle("Role Updated")
    .addField("Name", `${oldRole.name} >> ${newRole.name}`)
    .addField("Permissions", `${oldRole.permissions.bitfield} >> ${newRole.permissions.bitfield}`)
    .addField("Mentionable", `${oldRole.mentionable} >> ${newRole.mentionable}`)
    .setFooter("Role ID: " + newRole.id)
    .setTimestamp()
    .setColor('c9ff00');
  /*if (removedPerms.array().length > 0) {
    roleUpdateEmbed.addField("Permissions Removed", removedPerms.map(p => `${p}`).join(' • '));
  }
  if (addedPerms.array().length > 0) {
    roleUpdateEmbed.addField("Permissions Added", addedPerms.map(p => `${p}`).join(' • '));
  }*/
  collection.findOne({ guild_id: newRole.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (newRole.guild.channels.cache.get(botLogsChannel)) {
        newRole.guild.channels.cache.get(botLogsChannel).send(roleUpdateEmbed).catch(console.error);
      }
    }
  });
});

client.on('guildMemberAdd', member => {
  memberCountChannelUpdate(member);
  const memberAddEmbed = new Discord.MessageEmbed()
    .setTitle("New Member")
    .setAuthor(member.user.tag, member.user.avatarURL())
    .addField("Tag", `${member.user.tag}`)
    .addField("Joined At", `${new Date(member.joinedTimestamp).toLocaleString("en-US", {timeZoneName: "short"})}`)
    .addField("Account Created", `${new Date(member.user.createdTimestamp).toLocaleString("en-US", {timeZoneName: "short"})}`)
    .setFooter("Member ID: " + member.id)
    .setThumbnail(member.user.avatarURL())
    .setTimestamp()
    .setColor('c9ff00');
  collection.findOne({ guild_id: member.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (member.guild.channels.cache.get(botLogsChannel)) {
        member.guild.channels.cache.get(botLogsChannel).send(memberAddEmbed).catch(console.error);
      }
    }
  });
});

client.on('guildMemberRemove', member => {
  memberCountChannelUpdate(member);
  const memberRemoveEmbed = new Discord.MessageEmbed()
    .setTitle("Member Removed")
    .setAuthor(member.user.tag, member.user.avatarURL())
    .addField("Tag", `${member.user.tag}`)
    .addField("Joined At", `${new Date(member.joinedTimestamp).toLocaleString("en-US", {timeZoneName: "short"})}`)
    .addField("Account Created", `${new Date(member.user.createdTimestamp).toLocaleString("en-US", {timeZoneName: "short"})}`)
    .setFooter("Member ID: " + member.id)
    .setThumbnail(member.user.avatarURL())
    .setTimestamp()
    .setColor('e7778b');
  collection.findOne({ guild_id: member.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (member.guild.channels.cache.get(botLogsChannel)) {
        member.guild.channels.cache.get(botLogsChannel).send(memberRemoveEmbed).catch(console.error);
      }
    }
  });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
  const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
  const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  const memberUpdateEmbed = new Discord.MessageEmbed()
    .setTitle("Member Updated")
    .setAuthor(newMember.user.tag, newMember.user.avatarURL())
    .setFooter("Member ID: " + newMember.id)
    .setThumbnail(newMember.user.avatarURL())
    .setTimestamp()
    .setColor('c9ff00');
  if (removedRoles.array().length > 0) {
    memberUpdateEmbed.addField("Roles Removed", removedRoles.map(r => `${r}`).join(' • '));
  }
  if (addedRoles.array().length > 0) {
    memberUpdateEmbed.addField("Roles Added", addedRoles.map(r => `${r}`).join(' • '));
  }
  if (newMember.nickname !== oldMember.nickname) {
    memberUpdateEmbed.addField("Nickname Changed", `\`${oldMember.nickname}\` >> \`${newMember.nickname}\``)
  }
  if (newMember.user.tag !== oldMember.user.tag) {
    memberUpdateEmbed.addField("User Tag Changed", `\`${oldMember.user.tag}\` >> \`${newMember.user.tag}\``)
  }
  collection.findOne({ guild_id: newMember.guild.id }, (error, result) => {
    if (error) {
      console.error;
    }
    if (result.bot_logs_id) {
      botLogsChannel = result.bot_logs_id;
      if (newMember.guild.channels.cache.get(botLogsChannel)) {
        newMember.guild.channels.cache.get(botLogsChannel).send(memberUpdateEmbed).catch(console.error);
      }
    }
  });
});

client.login(process.env.BOT_TOKEN);
