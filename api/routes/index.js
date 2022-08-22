const router = require("express").Router();
const Post = require("../../models/Post");
const User = require("../../models/User");
const Comment = require("../../models/Comments");
const jwt = require("jsonwebtoken");

router.get("/", (req, res) => {
  Post.aggregate([
    {
      $project: {
        title: 1,
        image: 1,
        content: 1,
        updated: 1,
        created: 1,
        author: 1,
        like: 1,
        length: { $size: "$like" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    { $sort: { length: -1 } },
    { $limit: 12 },
  ]).exec((err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal Server Error",
        error: err,
      });
    } else {
      Comment.aggregate([
        {
          $group: {
            _id: "$post",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        {
          $lookup: {
            from: "posts",
            localField: "_id",
            foreignField: "_id",
            as: "post",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "post.author",
            foreignField: "_id",
            as: "author",
          },
        },
      ]).exec((err2, rtn2) => {
        if (err2) {
          res.status(500).json({
            message: "Internal Server Error",
            error: err2,
          });
        } else {
          res.status(200).json({
            message: "Most Like and Most Comment",
            mostlike: rtn,
            mostcomment: rtn2,
          });
        }
      });
    }
  });
});

router.get("/allpost", (req, res) => {
  Post.find({})
    .populate("author")
    .exec((err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal Server Error",
          error: err,
        });
      } else {
        res.status(200).json({
          message: "All posts",
          posts: rtn,
        });
      }
    });
});

router.get("/postdetail/:id", (req, res) => {
  Post.findById(req.params.id)
    .populate("author")
    .exec((err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal Server Error",
          error: err,
        });
      } else {
        Comment.find({ post: req.params.id })
          .populate("commenter")
          .populate("author")
          .select("created updated author comment reply commenter")
          .exec((err2, rtn2) => {
            if (err2) {
              res.status(500).json({
                message: "Internal Server Error",
                error: err2,
              });
            } else {
              Comment.countDocuments({ post: req.params.id }, (err3, count) => {
                if (err3) {
                  res.status(500).json({
                    message: "Internal Server Error",
                    error: err3,
                  });
                } else {
                  let reactStatus;
                  let favStatus;
                  try {
                    const decode = jwt.verify(req.headers.token,"BandGridAPI");
                    reactStatus = rtn.like.filter(function (data) {
                      return data.user == decode.id;
                    });
                    User.findById(decode.id, (err4, rtn4) => {
                      if (err4) {
                        res.status(500).json({
                          message: "Internal Server Error",
                          error: err4,
                        });
                      } else {
                        favStatus = rtn4.favoriteB.filter(function (data) {
                          return data.blogger == rtn.author._id.toString();
                        });
                        res.status(200).json({
                          post: rtn,
                          comments: rtn2,
                          reactStatus: reactStatus,
                          cmtcount: count,
                          favStatus: favStatus,
                        });
                      }
                    });
                  } catch {
                    reactStatus = [];
                    favStatus = [];
                    res.status(200).json({
                      post: rtn,
                      comments: rtn2,
                      reactStatus: reactStatus,
                      cmtcount: count,
                      favStatus: favStatus,
                    });
                  }
                }
              });
            }
          });
      }
    });
});

router.post("/register", (req, res) => {
  let user = new User();
  user.name = req.body.name;
  user.email = req.body.email;
  user.password = req.body.password;
  user.save((err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal Server Error",
        error: err,
      });
    } else {
      res.status(201).json({
        message: "USer acc created",
        user: rtn,
      });
    }
  });
});

router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email }, (err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal Server Error",
        error: err,
      });
    } else {
      if (rtn != null && User.compare(req.body.password, rtn.password)) {
        const token = jwt.sign({ name: rtn.name, id: rtn._id }, "BandGridAPI", {
          expiresIn: "2h",
        });
        res.status(200).json({
          message: "Login Success",
          token: token,
        });
      }
    }
  });
});

router.post("/duemailcheck", function (req, res) {
  User.findOne({ email: req.body.email }, function (err, rtn) {
    if (err) {
      res.status(500).json({
        message: "Internal Server Error",
        error: err
      })
    } else {
      res.status(200).json({
        status: rtn != null ? true : false,
      });
    }
  });
});

module.exports = router;
