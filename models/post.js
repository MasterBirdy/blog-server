const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PostSchema = new Schema({
    title: { type: String, required: true },
    text: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: Date, default: Date.now },
    status: {
        type: String,
        required: true,
        enum: ["Unpublished", "Published"]
    },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }]
});

module.exports = mongoose.model("Post", PostSchema);
