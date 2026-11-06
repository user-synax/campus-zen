import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { blockService } from "./blockService.js";
import { AppError } from "../utils/AppError.js";
import {
  isUserOnline,
  pushChatMessage,
  pushChatRead,
  pushChatTyping,
} from "../routes/sseRoutes.js";

function participantKey(a, b) {
  return [String(a), String(b)].sort().join(":");
}

function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    avatarUrl: user.avatarUrl || null,
  };
}

function conversationForViewer(conversation, viewerId, otherUser, lastMessage) {
  const unreadValue = conversation.unreadCounts?.get?.(String(viewerId))
    ?? conversation.unreadCounts?.[String(viewerId)]
    ?? 0;
  const unread = Number(unreadValue);
  return {
    _id: conversation._id,
    participant: { ...publicUser(otherUser), online: isUserOnline(otherUser?._id) },
    lastMessage: lastMessage
      ? {
          _id: lastMessage._id,
          text: lastMessage.deletedAt ? "Message deleted" : lastMessage.text,
          sender: lastMessage.sender,
          createdAt: lastMessage.createdAt,
        }
      : null,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: unread,
  };
}

export const chatService = {
  async listConversations(viewerId, { page = 1, limit = 30 } = {}) {
    const pg = Math.max(1, Number(page));
    const lim = Math.min(50, Math.max(1, Number(limit)));
    const query = { participants: viewerId, lastMessageAt: { $ne: null } };
    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ lastMessageAt: -1 })
        .skip((pg - 1) * lim)
        .limit(lim)
        .populate("participants", "fullName username avatarUrl")
        .populate("lastMessage", "text sender createdAt deletedAt")
        .lean(),
      Conversation.countDocuments(query),
    ]);
    return {
      conversations: conversations.map((conversation) => {
        const other = conversation.participants.find((user) => String(user._id) !== String(viewerId));
        return conversationForViewer(conversation, viewerId, other, conversation.lastMessage);
      }),
      page: pg,
      limit: lim,
      total,
      hasMore: pg * lim < total,
    };
  },

  async getOrCreate(viewerId, participantId) {
    if (String(viewerId) === String(participantId)) {
      throw new AppError("You cannot message yourself.", 400, "SELF_MESSAGE");
    }
    const participant = await User.findById(participantId).select("fullName username avatarUrl isBanned isDeactivated");
    if (!participant || participant.isBanned || participant.isDeactivated) {
      throw new AppError("This user is unavailable.", 404, "USER_NOT_FOUND");
    }
    await blockService.assertNoBlock(viewerId, participantId, "You can't message this account.");
    const key = participantKey(viewerId, participantId);
    let conversation = await Conversation.findOne({ participantKey: key });
    if (!conversation) {
      try {
        conversation = await Conversation.create({
          participants: [viewerId, participantId],
          participantKey: key,
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        conversation = await Conversation.findOne({ participantKey: key });
      }
    }
    return { conversation, participant: publicUser(participant) };
  },

  async getMessages(viewerId, conversationId, { page = 1, limit = 50 } = {}) {
    const conversation = await Conversation.findOne({ _id: conversationId, participants: viewerId })
      .populate("participants", "fullName username avatarUrl")
      .lean();
    if (!conversation) throw new AppError("Conversation not found.", 404, "CONVERSATION_NOT_FOUND");
    const pg = Math.max(1, Number(page));
    const lim = Math.min(50, Math.max(1, Number(limit)));
    const [messages, total] = await Promise.all([
      Message.find({ conversation: conversationId })
        .sort({ createdAt: -1 })
        .skip((pg - 1) * lim)
        .limit(lim)
        .populate("sender", "fullName username avatarUrl")
        .lean(),
      Message.countDocuments({ conversation: conversationId }),
    ]);
    const other = conversation.participants.find((user) => String(user._id) !== String(viewerId));
    return {
      conversation: {
        _id: conversation._id,
        participant: { ...publicUser(other), online: isUserOnline(other?._id) },
      },
      messages: messages.reverse().map((message) => ({
        ...message,
        text: message.deletedAt ? "Message deleted" : message.text,
        sender: publicUser(message.sender),
        isOwn: String(message.sender?._id || message.sender) === String(viewerId),
      })),
      page: pg,
      limit: lim,
      total,
      hasMore: pg * lim < total,
    };
  },

  async sendMessage(viewerId, conversationId, text) {
    const conversation = await Conversation.findOne({ _id: conversationId, participants: viewerId });
    if (!conversation) throw new AppError("Conversation not found.", 404, "CONVERSATION_NOT_FOUND");
    const recipientId = conversation.participants.find((id) => String(id) !== String(viewerId));
    await blockService.assertNoBlock(viewerId, recipientId, "You can't message this account.");
    const recipient = await User.findById(recipientId).select("_id isBanned isDeactivated");
    if (!recipient || recipient.isBanned || recipient.isDeactivated) {
      throw new AppError("This user is unavailable.", 404, "USER_NOT_FOUND");
    }
    const message = await Message.create({
      conversation: conversationId,
      sender: viewerId,
      recipient: recipientId,
      text: String(text).trim(),
    });
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    const unreadKey = String(recipientId);
    conversation.unreadCounts.set(unreadKey, Number(conversation.unreadCounts.get(unreadKey) || 0) + 1);
    await conversation.save();
    const payload = {
      _id: message._id,
      conversationId: conversation._id,
      text: message.text,
      sender: { _id: viewerId },
      recipient: recipientId,
      createdAt: message.createdAt,
    };
    pushChatMessage(recipientId, payload);
    return { ...payload, isOwn: true };
  },

  async markRead(viewerId, conversationId) {
    const conversation = await Conversation.findOne({ _id: conversationId, participants: viewerId });
    if (!conversation) throw new AppError("Conversation not found.", 404, "CONVERSATION_NOT_FOUND");
    const changed = await Message.updateMany(
      { conversation: conversationId, recipient: viewerId, readAt: null },
      { $set: { readAt: new Date() } },
    );
    conversation.unreadCounts.set(String(viewerId), 0);
    await conversation.save();
    if (changed.modifiedCount > 0) {
      const otherId = conversation.participants.find((id) => String(id) !== String(viewerId));
      pushChatRead(otherId, { conversationId, readerId: viewerId });
    }
    return { marked: changed.modifiedCount };
  },

  async deleteMessage(viewerId, messageId) {
    const message = await Message.findOne({ _id: messageId, sender: viewerId });
    if (!message) throw new AppError("Message not found.", 404, "MESSAGE_NOT_FOUND");
    if (!message.deletedAt) {
      message.deletedAt = new Date();
      message.text = "Message deleted";
      await message.save();
    }
    return { _id: message._id, conversationId: message.conversation, deletedAt: message.deletedAt };
  },

  async setTyping(viewerId, conversationId, isTyping) {
    const conversation = await Conversation.findOne({ _id: conversationId, participants: viewerId }).select("participants");
    if (!conversation) throw new AppError("Conversation not found.", 404, "CONVERSATION_NOT_FOUND");
    const recipientId = conversation.participants.find((id) => String(id) !== String(viewerId));
    pushChatTyping(recipientId, { conversationId, userId: viewerId, isTyping: Boolean(isTyping) });
    return { isTyping: Boolean(isTyping) };
  },
};
