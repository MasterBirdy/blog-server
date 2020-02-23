require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { body, validationResult, check } = require("express-validator");
const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/check-auth");

router.get("/", function(req, res, next) {
    res.json({ Hello: "Hello" });
});

router.post("/signup", [
    body("username")
        .isLength({ min: 3 })
        .trim()
        .withMessage("Username must be longer than 2 characters")
        .custom(async (value, { req }) => {
            let user = await User.find({ username: value }).limit(1);
            if (user.length > 0) {
                return Promise.reject();
            }
        })
        .withMessage("User already exists"),
    body("password")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must put in a password"),
    body("confirmpassword")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must confirm your password")
        .custom((value, { req }) => value === req.body.password)
        .withMessage("Passwords must match each other"),
    check("username").escape(),
    check("password").escape(),
    check("confirmpassword").escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: "Could not create user",
                errors: errors.array()
            });
        } else
            bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
                if (err) {
                    res.json({ err });
                }
                const user = new User({
                    username: req.body.username,
                    password: hashedPassword
                });
                user.save(err => {
                    if (err) {
                        res.json({ err });
                    }
                    res.status(200).json({
                        user: { ...user._doc },
                        message: "Success!"
                    });
                });
            });
    }
]);

router.post("/login", [
    body("username")
        .isLength({ min: 1 })
        .trim()
        .withMessage("Username must be typed in"),
    body("password")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must type in a password"),
    check("username").escape(),
    check("password").escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                message: "Errors with login",
                errors: errors.array()
            });
        } else {
            User.findOne({ username: req.body.username }, function(
                err,
                results
            ) {
                if (err) {
                    return res.status(400).json({ err });
                } else {
                    if (results == null) {
                        return res
                            .status(400)
                            .json({ message: "User not found" });
                    }
                    const user = results;
                    bcrypt.compare(
                        req.body.password,
                        user.password,
                        (err, response) => {
                            if (err) {
                                return res
                                    .status(400)
                                    .json({ message: "Login failed" });
                            }
                            if (!response) {
                                return res
                                    .status(400)
                                    .json({ message: "Incorrect password" });
                            } else {
                                jwt.sign(
                                    { username: user.username, _id: user._id },
                                    process.env.JWT_KEY,
                                    {
                                        expiresIn: "1hr"
                                    },
                                    (err, token) => {
                                        res.json({
                                            token,
                                            message: "Success!"
                                        });
                                    }
                                );
                            }
                        }
                    );
                }
            });
        }
    }
]);

router.get("/posts", function(req, res, next) {
    Post.find()
        .populate("author", "username")
        .exec(function(err, results) {
            if (err) {
                res.json({ err });
            }
            return res.status(200).json({
                results: { ...results },
                message: "Success!"
            });
        });
});

router.get("/publishedPosts", function(req, res, next) {
    Post.find({ status: "Published" })
        .populate("author", "username")
        .exec(function(err, results) {
            if (err) {
                res.json({ err });
            }
            return res.status(200).json({
                results: { ...results },
                message: "Success!"
            });
        });
});

router.get("/unpublishedPosts", function(req, res, next) {
    Post.find({ status: "Unpublished" })
        .populate("author", "username")
        .exec(function(err, results) {
            if (err) {
                res.json({ err });
            }
            return res.status(200).json({
                results: { ...results },
                message: "Success!"
            });
        });
});

router.get("/post/:id", function(req, res, next) {
    Post.find({ _id: req.params.id })
        .limit(1)
        .populate("author", "username")
        .populate("comments")
        .exec(function(err, result) {
            if (err) {
                return res.json({ err });
            }
            return res.status(200).json({
                results: { ...result },
                message: "Success!"
            });
        });
});

router.post("/post", verifyToken, [
    body("title")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must put in a title"),
    body("text")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must put in some text"),
    check("title").escape(),
    check("text").escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                message: "Errors with posting",
                errors: errors.array()
            });
        } else {
            const post = new Post({
                title: req.body.title,
                text: req.body.text,
                status: req.body.status,
                author: req.userData._id
            });
            post.save(function(err) {
                if (err) {
                    return res
                        .status(400)
                        .json({ message: "Error creating post" });
                } else {
                    return res.status(200).json({ post, message: "Success!" });
                }
            });
        }
    }
]);

router.delete("/post/:id/delete", verifyToken, function(req, res, next) {
    Post.findById(req.params.id)
        .populate("author")
        .exec(function(err, results) {
            if (err) {
                return res.status(400).json({ message: "Error finding post" });
            }
            const post = results;
            if (post.author._id.toString() !== req.userData._id.toString()) {
                return res.status(401).json({
                    message:
                        "Logged in user must match post author to delete a post"
                });
            } else {
                Post.deleteOne({ _id: req.params.id }, function(err, results) {
                    if (err) {
                        return res
                            .status(400)
                            .json({ message: "Error with removal" });
                    } else {
                        return res
                            .status(200)
                            .json({ results, message: "Success" });
                    }
                });
            }
        });
});

router.post("/post/:id/addcomment", [
    check("title")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must put in a title")
        .escape(),
    check("text")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must put in some text")
        .escape(),
    check("author")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must put in an author name")
        .escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                message: "Errors with posting comment",
                errors: errors.array()
            });
        } else {
            const comment = new Comment({
                title: req.body.title,
                text: req.body.text,
                author: req.body.author
            });
            comment
                .save()
                .then(() => {
                    Post.find({ _id: req.params.id })
                        .limit(1)
                        .exec((err, results) => {
                            if (err) {
                                return res.status(400).json({
                                    message: "Error finding post",
                                    err
                                });
                            }
                            if (results == null) {
                                return res.status(400).json({
                                    message: "Post couldn't be found"
                                });
                            } else {
                                results[0].comments.push(comment);
                                results[0].save();
                            }
                        });
                })
                .then(() =>
                    res.status(200).json({ message: "Success!", comment })
                )
                .catch(err => {
                    return res
                        .status(400)
                        .json({ message: "Error with adding comment", err });
                });
        }
    }
]);

router.put("/post/:id/edit", verifyToken, [
    body("title")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must put in a title"),
    body("text")
        .isLength({ min: 1 })
        .trim()
        .withMessage("You must put in some text"),
    check("title").escape(),
    check("text").escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                message: "Errors with editting post",
                errors: errors.array()
            });
        } else {
            Post.find({ _id: req.params.id })
                .limit(1)
                .exec((err, results) => {
                    if (err) {
                        return res
                            .status(400)
                            .json({ message: "Error finding post", err });
                    }
                    if (results == null) {
                        return res
                            .status(400)
                            .json({ message: "Post was not found" });
                    } else {
                        results[0].title = req.body.title;
                        results[0].text = req.body.text;
                        results[0].status = req.body.status;
                        results[0].save();
                        return res.status(200).json({ message: "Success" });
                    }
                });
        }
    }
]);

module.exports = router;
