const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
  },
  comment: {
    type: String,
    required: true,
  },
  reply: {
    type: String,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "Users",
  },
  commenter: {
    type: Schema.Types.ObjectId,
    ref: "Users",
  },
  created: {
    type: Date,
    default: Date.now(),
  },
  updated: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Comment", CommentSchema);
