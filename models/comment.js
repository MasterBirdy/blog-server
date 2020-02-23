const mongoose = require("mongoose");
const moment = require("moment");

const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    title: { type: String },
    author: { type: String },
    text: { type: String, required: true },
    createdBy: { type: Date, default: Date.now }
});

CommentSchema.set("toJSON", { virtuals: true });

CommentSchema.virtual("created_by_formatted").get(function() {
    return moment(this.createdBy).format("lll");
});

module.exports = mongoose.model("Comment", CommentSchema);
