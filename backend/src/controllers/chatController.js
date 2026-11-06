import { asyncHandler } from "../utils/asyncHandler.js";
import { chatService } from "../services/chatService.js";

export const chatController = {
  list: asyncHandler(async (req, res) => {
    const data = await chatService.listConversations(req.user._id, req.query);
    res.json({ success: true, data });
  }),
  create: asyncHandler(async (req, res) => {
    const data = await chatService.getOrCreate(req.user._id, req.body.participantId);
    res.status(201).json({ success: true, data });
  }),
  messages: asyncHandler(async (req, res) => {
    const data = await chatService.getMessages(req.user._id, req.params.id, req.query);
    res.json({ success: true, data });
  }),
  send: asyncHandler(async (req, res) => {
    const message = await chatService.sendMessage(req.user._id, req.params.id, req.body.text);
    res.status(201).json({ success: true, data: { message } });
  }),
  read: asyncHandler(async (req, res) => {
    const data = await chatService.markRead(req.user._id, req.params.id);
    res.json({ success: true, data });
  }),
  deleteMessage: asyncHandler(async (req, res) => {
    const data = await chatService.deleteMessage(req.user._id, req.params.messageId);
    res.json({ success: true, data });
  }),
  typing: asyncHandler(async (req, res) => {
    const data = await chatService.setTyping(req.user._id, req.params.id, req.body.isTyping);
    res.json({ success: true, data });
  }),
};
